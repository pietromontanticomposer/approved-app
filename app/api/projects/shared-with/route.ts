// app/api/projects/shared-with/route.ts
/**
 * GET /api/projects/shared-with?project_id=xxx
 * Returns list of project members (owner-only or team owner).
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth } from "@/lib/auth";

export const runtime = "nodejs";

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
    let isTeamOwner = false;

    if (!isOwner && project.team_id) {
      const { data: teamMember } = await supabaseAdmin
        .from("team_members")
        .select("role")
        .eq("team_id", project.team_id)
        .eq("user_id", auth.userId)
        .maybeSingle();
      isTeamOwner = teamMember?.role === "owner";
    }

    if (!isOwner && !isTeamOwner) {
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
      const authUsers = typeof supabaseAdmin.schema === "function"
        ? supabaseAdmin.schema("auth").from("users")
        : supabaseAdmin.from("auth.users");
      const { data: users, error: usersErr } = await authUsers
        .select("id, email, raw_user_meta_data")
        .in("id", memberIds);

      if (usersErr) {
        return NextResponse.json({ error: usersErr.message }, { status: 500 });
      }

      usersById = (users || []).reduce((acc: any, u: any) => {
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

    return NextResponse.json({ shared_with: sharedWith });
  } catch (err: any) {
    console.error("[GET /api/projects/shared-with] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
