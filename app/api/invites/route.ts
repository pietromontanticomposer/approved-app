// app/api/invites/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveActorId } from '@/lib/actorResolver';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/invites?team_id=xxx
 * Lista inviti di un team (solo owner)
 */
export async function GET(req: Request) {
  try {
    // Determine actor: prefer Authorization Bearer token, then x-actor-id header, then cookie-based anon client
    const authHeader = req.headers.get('authorization') || '';
    let actorId: string | null = null;

    if (authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const { data: verified, error: verifyErr } = await supabaseAdmin.auth.getUser(token);
        if (!verifyErr && verified?.user?.id) actorId = verified.user.id;
        else console.warn('[/api/invites] supabaseAdmin.auth.getUser failed', verifyErr);
      } catch (e) {
        console.warn('[/api/invites] token verification error', e);
      }
    }

    if (!actorId) {
      const hdr = req.headers.get('x-actor-id');
      if (hdr) actorId = hdr;
    }

    // If actorId present but not a UID, attempt to resolve email -> UID
    if (actorId) {
      const resolved = await resolveActorId(actorId);
      if (resolved) actorId = resolved;
    }

    if (!actorId) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (user?.id) actorId = user.id;
      if (authError || !actorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const teamId = url.searchParams.get("team_id");

    if (!teamId) {
      return NextResponse.json({ error: "team_id required" }, { status: 400 });
    }

    // Use admin client to check membership (bypass RLS)
    const { data: membership } = await supabaseAdmin
      .from("team_members")
      .select("role")
      .eq("user_id", actorId)
      .eq("team_id", teamId)
      .single();

    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Recupera inviti attivi
    const { data: invites, error } = await supabase
      .from("invites")
      .select("*")
      .eq("team_id", teamId)
      .eq("revoked", false)
      .is("used_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ invites });
  } catch (error: any) {
    console.error("Error fetching invites:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/invites
 * Crea un nuovo invito
 * Body: { team_id, project_id?, email?, role, is_link_invite }
 */
export async function POST(req: Request) {
  try {
    // Determine actorId: prefer Authorization Bearer token, then x-actor-id header, then cookie-based anon client
    const authHeaderPost = req.headers.get('authorization') || '';
    let actorId: string | null = null;
    if (authHeaderPost.toLowerCase().startsWith('bearer ')) {
      const token = authHeaderPost.split(' ')[1];
      try {
        const { data: verified, error: verifyErr } = await supabaseAdmin.auth.getUser(token);
        if (!verifyErr && verified?.user?.id) actorId = verified.user.id;
        else console.warn('[/api/invites POST] supabaseAdmin.auth.getUser failed', verifyErr);
      } catch (e) {
        console.warn('[/api/invites POST] token verification error', e);
      }
    }

    if (!actorId) {
      const hdr = req.headers.get('x-actor-id');
      if (hdr) actorId = hdr;
    }

    if (actorId) {
      const resolved = await resolveActorId(actorId);
      if (resolved) actorId = resolved;
    }

    if (!actorId) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (user?.id) actorId = user.id;
      if (authError || !actorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { team_id, project_id, email, role, is_link_invite } = body;

    if (!team_id || !role) {
      return NextResponse.json(
        { error: "team_id and role are required" },
        { status: 400 }
      );
    }

    if (!is_link_invite && !email) {
      return NextResponse.json(
        { error: "email is required for non-link invites" },
        { status: 400 }
      );
    }

    // Call RPC using admin client to ensure permissions
    const { data, error } = await supabaseAdmin.rpc("create_invite", {
      p_team_id: team_id,
      p_project_id: project_id || null,
      p_email: email || null,
      p_role: role,
      p_is_link_invite: is_link_invite || false,
      p_invited_by: actorId,
      p_expires_in_days: 7,
    });

    if (error) throw error;

    if (!data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    // Build a safe origin: prefer NEXT_PUBLIC_APP_URL, then Origin header, then x-forwarded-proto + host, then host with http fallback
    const envUrl = process.env.NEXT_PUBLIC_APP_URL;
    const originHeader = req.headers.get("origin");
    const forwardedProto = req.headers.get("x-forwarded-proto");
    const hostHeader = req.headers.get("host");
    const fallbackProto = forwardedProto || "http";
    const computedOrigin = envUrl || originHeader || (hostHeader ? `${fallbackProto}://${hostHeader}` : `http://localhost:3000`);
    const safeOrigin = computedOrigin.replace(/\/+$/, "");

    return NextResponse.json({
      success: true,
      invite_id: data.invite_id,
      invite_url: `${safeOrigin}/invite/${data.invite_id}`,
    });
  } catch (error: any) {
    console.error("Error creating invite:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/invites?invite_id=xxx
 * Revoca un invito
 */
export async function DELETE(req: Request) {
  try {
    const authHeaderDel = req.headers.get('authorization') || '';
    let actorIdDel: string | null = null;
    if (authHeaderDel.toLowerCase().startsWith('bearer ')) {
      const token = authHeaderDel.split(' ')[1];
      try {
        const { data: verified, error: verifyErr } = await supabaseAdmin.auth.getUser(token);
        if (!verifyErr && verified?.user?.id) actorIdDel = verified.user.id;
      } catch (e) {
        console.warn('[/api/invites DELETE] token verification error', e);
      }
    }
    if (!actorIdDel) actorIdDel = req.headers.get('x-actor-id');
    if (!actorIdDel) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (user?.id) actorIdDel = user.id;
      if (authError || !actorIdDel) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const inviteId = url.searchParams.get("invite_id");

    if (!inviteId) {
      return NextResponse.json({ error: "invite_id required" }, { status: 400 });
    }

    // Usa la funzione RPC per revocare l'invito
    const { data, error } = await supabaseAdmin.rpc("revoke_invite", {
      invite_token: inviteId,
      revoking_user_id: actorIdDel,
    });

    if (error) throw error;

    if (!data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error revoking invite:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
