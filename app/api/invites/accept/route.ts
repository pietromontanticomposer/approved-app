import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth } from '@/lib/auth';

export const runtime = "nodejs";

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

    const body = await req.json();
    const inviteToken = body?.invite_token;
    if (!inviteToken) {
      return NextResponse.json({ error: 'invite_token required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc('accept_invite', { invite_token: inviteToken, accepting_user_id: actorId });
    if (error) {
      console.error('accept_invite RPC error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[/api/invites/accept] Error', err);
    return NextResponse.json({ error: err.message || 'Unexpected' }, { status: 500 });
  }
}
