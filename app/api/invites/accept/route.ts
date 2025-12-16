import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/invites/accept
 * Body: { invite_token }
 * Header: x-actor-id or Authorization: Bearer <token>
 * Calls the DB RPC `accept_invite` using admin client on behalf of actorId.
 */
export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    let actorId: string | null = null;
    if (auth.toLowerCase().startsWith('bearer ')) {
      const token = auth.split(' ')[1];
      try {
        const { data: verified, error: verifyErr } = await supabaseAdmin.auth.getUser(token);
        if (!verifyErr && verified?.user?.id) actorId = verified.user.id;
      } catch (e) {
        console.warn('[/api/invites/accept] token verify error', e);
      }
    }

    if (!actorId) actorId = req.headers.get('x-actor-id');
    if (!actorId) actorId = req.headers.get('x-actor-id');

    // If actorId is an email or non-UUID, try to resolve it
    if (actorId) {
      try {
        const { resolveActorId } = await import('@/lib/actorResolver');
        const resolved = await resolveActorId(actorId);
        if (resolved) actorId = resolved;
      } catch (e) {
        // ignore
      }
    }

    const body = await req.json();
    const inviteToken = body?.invite_token;
    if (!inviteToken) return NextResponse.json({ error: 'invite_token required' }, { status: 400 });
    if (!actorId) return NextResponse.json({ error: 'actor id required' }, { status: 403 });

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
