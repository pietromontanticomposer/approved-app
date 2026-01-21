// app/api/invites/route.ts
/**
 * Team Invites API Route
 *
 * Secure implementation with standard authentication
 */

import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth } from '@/lib/auth';
import { sendInviteEmail } from '@/lib/email';
import { isUuid, isValidEmail, isValidRole } from '@/lib/validation';

export const runtime = "nodejs";
const isDev = process.env.NODE_ENV !== "production";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/invites?team_id=xxx
 * Lists invites for a team (owner only)
 */
export async function GET(req: NextRequest) {
  try {
    if (isDev) console.log('[GET /api/invites] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = auth.userId;
    if (!isUuid(actorId)) {
      return NextResponse.json({ error: 'Invalid user session' }, { status: 401 });
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
 * Creates a new invite
 * Body: { team_id, project_id?, email?, role, is_link_invite }
 */
export async function POST(req: NextRequest) {
  try {
    if (isDev) console.log('[POST /api/invites] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = auth.userId;
    if (!isUuid(actorId)) {
      return NextResponse.json({ error: 'Invalid user session' }, { status: 401 });
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

    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (!isValidRole(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be owner, admin, editor, or viewer" },
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

    // Build invite url
    const inviteUrl = `${safeOrigin}/invite/${data.invite_id}`;

    // If this was a nominal email invite, attempt to send the invite email (best-effort)
    let emailSent = false;
    let emailError = null;
    if (!is_link_invite && email) {
      try {
        if (isDev) console.log('[POST /api/invites] Preparing to send email to:', email);
        if (isDev) console.log('[POST /api/invites] SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
        if (isDev) console.log('[POST /api/invites] SMTP_USER:', process.env.SMTP_USER || 'NOT SET');
        if (isDev) console.log('[POST /api/invites] SMTP_PASS:', process.env.SMTP_PASS ? 'SET (hidden)' : 'NOT SET');

        // Get inviter name and project name for better email
        let inviterName = null;
        let projectName = null;

        // Get inviter's email/name
        const { data: inviter } = await supabaseAdmin
          .from('users')
          .select('email, full_name')
          .eq('id', actorId)
          .single();
        if (inviter) {
          inviterName = inviter.full_name || inviter.email?.split('@')[0] || null;
        }
        if (isDev) console.log('[POST /api/invites] Inviter name:', inviterName);

        // Get project name if project_id provided
        if (project_id) {
          const { data: project } = await supabaseAdmin
            .from('projects')
            .select('name')
            .eq('id', project_id)
            .single();
          if (project) {
            projectName = project.name;
          }
        }
        if (isDev) console.log('[POST /api/invites] Project name:', projectName);
        if (isDev) console.log('[POST /api/invites] Invite URL:', inviteUrl);

        await sendInviteEmail(email, inviteUrl, inviterName, projectName, role);
        emailSent = true;
        if (isDev) console.log('[POST /api/invites] Email sent successfully to', email);
      } catch (e: any) {
        console.error('[POST /api/invites] sendInviteEmail FAILED:', e);
        console.error('[POST /api/invites] Error stack:', e?.stack);
        emailError = e?.message || 'Unknown error';
      }
    }

    return NextResponse.json({
      success: true,
      invite_id: data.invite_id,
      invite_url: inviteUrl,
      email_sent: emailSent,
      email_error: emailError,
      smtp_configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    });
  } catch (error: any) {
    console.error("Error creating invite:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/invites?invite_id=xxx
 * Revokes an invite
 */
export async function DELETE(req: NextRequest) {
  try {
    if (isDev) console.log('[DELETE /api/invites] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorIdDel = auth.userId;
    if (!isUuid(actorIdDel)) {
      return NextResponse.json({ error: 'Invalid user session' }, { status: 401 });
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
