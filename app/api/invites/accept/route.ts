import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth } from '@/lib/auth';

export const runtime = "nodejs";

const isUuid = (value: string) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );

/**
 * POST /api/invites/accept
 * Body: { invite_token }
 * Accepts a team or project invite
 */
export async function POST(req: NextRequest) {
  try {
    console.log('[POST /api/invites/accept] Request started');

    // SECURITY: Verify authentication
    const auth = await verifyAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = auth.userId;
    if (!isUuid(actorId)) {
      return NextResponse.json({ error: 'Invalid user session. Please sign in again.' }, { status: 401 });
    }

    const body = await req.json();
    const inviteToken = body?.invite_token;
    if (!inviteToken) {
      return NextResponse.json({ error: 'invite_token required' }, { status: 400 });
    }

    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from('invites')
      .select('id, team_id, project_id, email, role, invited_by, revoked, used_at, expires_at')
      .eq('id', inviteToken)
      .maybeSingle();

    if (inviteErr || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (invite.revoked) {
      return NextResponse.json({ error: 'Invite revoked' }, { status: 410 });
    }

    if (invite.used_at) {
      return NextResponse.json({ error: 'Invite already used' }, { status: 410 });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
    }

    if (invite.email) {
      const authEmail = auth.email || '';
      if (!authEmail || invite.email.toLowerCase() !== authEmail.toLowerCase()) {
        return NextResponse.json({ error: 'This invite is for a different email address' }, { status: 403 });
      }
    }

    const role = invite.role || 'viewer';

    if (invite.project_id) {
      const { error: upsertErr } = await supabaseAdmin
        .from('project_members')
        .upsert({
          project_id: invite.project_id,
          member_id: actorId,
          role,
          added_by: invite.invited_by || null,
          added_at: new Date().toISOString()
        }, { onConflict: 'project_id,member_id' });
      if (upsertErr) {
        return NextResponse.json({ error: upsertErr.message }, { status: 500 });
      }
    } else if (invite.team_id) {
      const { error: teamErr } = await supabaseAdmin
        .from('team_members')
        .upsert({
          team_id: invite.team_id,
          user_id: actorId,
          role,
          joined_at: new Date().toISOString()
        }, { onConflict: 'user_id,team_id' });
      if (teamErr) {
        return NextResponse.json({ error: teamErr.message }, { status: 500 });
      }
    }

    const { error: markErr } = await supabaseAdmin
      .from('invites')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invite.id);
    if (markErr) {
      return NextResponse.json({ error: markErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      project_id: invite.project_id || null,
      team_id: invite.team_id || null,
      role
    });
  } catch (err: any) {
    console.error('[/api/invites/accept] Error', err);
    return NextResponse.json({ error: err.message || 'Unexpected' }, { status: 500 });
  }
}
