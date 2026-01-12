// app/api/projects/shared-with/route.ts
/**
 * GET /api/projects/shared-with?project_id=xxx
 * Returns list of project members + pending invites.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth } from "@/lib/auth";

export const runtime = "nodejs";

function buildOrigin(req: NextRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "";
  const originHeader = req.headers.get("origin");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const hostHeader = req.headers.get("host");
  const fallbackProto = forwardedProto || "http";
  const computedOrigin =
    envUrl || originHeader || (hostHeader ? `${fallbackProto}://${hostHeader}` : `http://localhost:3000`);
  return computedOrigin.replace(/\/+$/, "");
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const projectId = url.searchParams.get("project_id");
    if (!projectId) {
      return NextResponse.json({ error: "project_id required" }, { status: 400 });
    }

    const { data: project, error: projectErr } = await supabaseAdmin
      .from("projects")
      .select("id, owner_id, team_id")
      .eq("id", projectId)
      .maybeSingle();

    if (projectErr || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isOwner = project.owner_id === auth.userId;
    let isMember = false;

    if (!isOwner) {
      const { data: membership } = await supabaseAdmin
        .from("project_members")
        .select("member_id")
        .eq("project_id", projectId)
        .eq("member_id", auth.userId)
        .maybeSingle();
      isMember = !!membership;
    }

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: members, error: membersErr } = await supabaseAdmin
      .from("project_members")
      .select("member_id, role, added_by, created_at")
      .eq("project_id", projectId);

    if (membersErr) {
      return NextResponse.json({ error: membersErr.message }, { status: 500 });
    }

    const rows = (members || []).filter(m => m.member_id && m.member_id !== project.owner_id);
    const memberIds = Array.from(new Set(rows.map(m => m.member_id)));

    let usersById: Record<string, any> = {};
    if (memberIds.length > 0) {
      // Use the admin auth API to fetch user details
      const userPromises = memberIds.map(async (id) => {
        try {
          const { data } = await supabaseAdmin.auth.admin.getUserById(id);
          if (data?.user) {
            return {
              id: data.user.id,
              email: data.user.email,
              raw_user_meta_data: data.user.user_metadata || {},
            };
          }
        } catch {
          // User not found or error, skip
        }
        return null;
      });

      const users = (await Promise.all(userPromises)).filter(Boolean);
      usersById = users.reduce((acc: any, u: any) => {
        acc[u.id] = u;
        return acc;
      }, {});
    }

    const sharedWith = rows.map((m) => {
      const user = usersById[m.member_id] || {};
      const meta = user.raw_user_meta_data || {};
      const displayName = meta.full_name || meta.name || user.email || m.member_id;
      return {
        member_id: m.member_id,
        role: m.role || "viewer",
        added_by: m.added_by || null,
        created_at: m.created_at || null,
        email: user.email || null,
        display_name: displayName,
      };
    });

    const nowIso = new Date().toISOString();
    const { data: invites, error: invitesErr } = await supabaseAdmin
      .from("invites")
      .select("id, project_id, email, role, invited_by, created_at, expires_at, used_at, revoked, is_link_invite")
      .eq("project_id", projectId)
      .eq("revoked", false)
      .is("used_at", null)
      .or(`expires_at.is.null,expires_at.gte.${nowIso}`)
      .order("created_at", { ascending: false });

    if (invitesErr) {
      return NextResponse.json({ error: invitesErr.message }, { status: 500 });
    }

    const origin = buildOrigin(req);
    const pendingInvites = (invites || []).map((inv) => ({
      invite_id: inv.id,
      role: inv.role || "viewer",
      email: inv.email || null,
      invited_by: inv.invited_by || null,
      created_at: inv.created_at || null,
      expires_at: inv.expires_at || null,
      status: "pending",
      invite_url: `${origin}/invite/${inv.id}`,
    }));

    return NextResponse.json({ shared_with: sharedWith, pending_invites: pendingInvites });
  } catch (err: any) {
    console.error("[GET /api/projects/shared-with] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
