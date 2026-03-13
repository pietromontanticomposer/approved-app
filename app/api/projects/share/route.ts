import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isUuid, isValidEmail, isValidShareRole } from "@/lib/validation";
import crypto from "crypto";

async function resolveActorId(req: Request) {
  let actorId = req.headers.get('x-actor-id') || '';
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const { data: verified, error: verifyErr } = await supabaseAdmin.auth.getUser(token);
        if (!verifyErr && verified?.user?.id) {
          actorId = verified.user.id;
        } else {
          console.warn('[/api/projects/share] auth.getUser failed', verifyErr);
        }
      }
    }
  } catch (e) {
    console.warn('[/api/projects/share] token verification error', e);
  }
  return actorId;
}

/**
 * POST /api/projects/share
 * Body: { project_id, role?: 'viewer'|'editor'|'commenter', email?: string, expires_at?: string, max_uses?: number, invite?: boolean, guest_enabled?: boolean }
 * Header: x-actor-id (user id performing the action)
 * Returns: { id, link, invite_id?, invite_url? }
 */
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (!raw) return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    const body = JSON.parse(raw);
    const projectId = typeof body.project_id === 'string' ? body.project_id : '';
    const role = typeof body.role === 'string' ? body.role : 'viewer';
    const email = typeof body.email === 'string' ? body.email : null;
    const expiresAt = typeof body.expires_at === 'string' ? body.expires_at : null;
    const maxUses = typeof body.max_uses === 'number' ? body.max_uses : null;
    const invite = body.invite === true || body.type === 'invite';
    const guestEnabled = body.guest_enabled === true;

    // Prefer server-verified actor via Authorization: Bearer <token>
    const actorId = await resolveActorId(req);

    if (!actorId) return NextResponse.json({ error: 'Missing x-actor-id header or Authorization token' }, { status: 403 });
    if (!isUuid(actorId)) return NextResponse.json({ error: 'Invalid user session' }, { status: 401 });
    if (!projectId) return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    if (!isValidShareRole(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be editor, commenter, or viewer' },
        { status: 400 }
      );
    }
    if (email && !isValidEmail(email)) return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });

    // Only the project owner can manage sharing for this project.
    const { data: proj, error: projErr } = await supabaseAdmin
      .from('projects')
      .select('id, team_id, owner_id')
      .eq('id', projectId)
      .maybeSingle();
    if (projErr || !proj) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const isOwner = !!proj.owner_id && proj.owner_id === actorId;
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden - only the project owner can manage sharing for this project' },
        { status: 403 }
      );
    }

    // Build safe origin: prefer NEXT_PUBLIC_APP_URL, then Origin header, then x-forwarded-proto + host, then localhost fallback
    const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_ORIGIN || '';
    const originHeader = req.headers.get('origin');
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const hostHeader = req.headers.get('host');
    const fallbackProto = forwardedProto || 'http';
    const computedOrigin = envUrl || originHeader || (hostHeader ? `${fallbackProto}://${hostHeader}` : `http://localhost:3000`);
    const safeOrigin = computedOrigin.replace(/\/+$/, '');

    if (invite) {
      if (!proj.team_id) {
        return NextResponse.json({ error: 'Project has no team' }, { status: 400 });
      }

      let expiresInDays = 7;
      if (expiresAt) {
        const ms = new Date(expiresAt).getTime() - Date.now();
        if (Number.isFinite(ms)) {
          const days = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
          expiresInDays = days;
        }
      }

      const { data: inviteData, error: inviteErr } = await supabaseAdmin.rpc("create_invite", {
        p_team_id: proj.team_id,
        p_project_id: projectId,
        p_email: email || null,
        p_role: role,
        p_is_link_invite: true,
        p_invited_by: actorId,
        p_expires_in_days: expiresInDays,
      });

      if (inviteErr) {
        return NextResponse.json({ error: inviteErr.message }, { status: 500 });
      }

      const invitePayload = inviteData || {};
      const inviteId = invitePayload.invite_id || (Array.isArray(invitePayload) ? invitePayload[0]?.invite_id : null);
      if (!inviteId) {
        return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
      }

      const inviteUrl = `${safeOrigin}/invite/${inviteId}`;
      return NextResponse.json({ invite_id: inviteId, invite_url: inviteUrl, link: inviteUrl }, { status: 201 });
    }

    // Generate token and store only hash
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // For guest links, default to single-use and limit role to commenter/viewer
    const effectiveMaxUses = guestEnabled ? (maxUses ?? 1) : maxUses;
    const effectiveRole = guestEnabled && role === 'editor' ? 'commenter' : role;

    const insert = {
      project_id: projectId,
      role: effectiveRole,
      token_hash: tokenHash,
      created_by: actorId,
      expires_at: expiresAt,
      max_uses: effectiveMaxUses,
      guest_enabled: guestEnabled,
    };

    const { data, error } = await supabaseAdmin.from('share_links').insert(insert).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const cleanToken = String(token || '').trim();
    const link = `${safeOrigin}/share/${data.id}?token=${encodeURIComponent(cleanToken)}`;

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({ actor_id: actorId, action: 'share_link_created', target_type: 'project', target_id: projectId, meta: { share_link_id: data.id, role } });

    return NextResponse.json({ id: data.id, link }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/projects/share] Error', err);
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/share
 * Body: { id }
 * Header: x-actor-id
 */
export async function DELETE(req: Request) {
  try {
    const raw = await req.text();
    if (!raw) return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    const body = JSON.parse(raw);
    const id = typeof body.id === 'string' ? body.id : '';
    const actorId = await resolveActorId(req);
    if (!actorId) return NextResponse.json({ error: 'Missing x-actor-id header' }, { status: 403 });
    if (!isUuid(actorId)) return NextResponse.json({ error: 'Invalid user session' }, { status: 401 });
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    // Load share link to get project
    const { data: linkData, error: linkErr } = await supabaseAdmin.from('share_links').select('id, project_id, created_by').eq('id', id).maybeSingle();
    if (linkErr || !linkData) return NextResponse.json({ error: 'Share link not found' }, { status: 404 });

    // Only the project owner can revoke a share link.
    const { data: proj } = await supabaseAdmin
      .from('projects')
      .select('owner_id')
      .eq('id', linkData.project_id)
      .maybeSingle();
    const isOwner = !!proj?.owner_id && proj.owner_id === actorId;
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden - only the project owner can manage sharing for this project' },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin.from('share_links').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabaseAdmin.from('audit_logs').insert({ actor_id: actorId, action: 'share_link_revoked', target_type: 'share_link', target_id: id, meta: null });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('[DELETE /api/projects/share] Error', err);
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}
