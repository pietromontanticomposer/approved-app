import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

/**
 * POST /api/projects/share
 * Body: { project_id, role?: 'view'|'contribute'|'manage', expires_at?: string, max_uses?: number }
 * Header: x-actor-id (user id performing the action)
 * Returns: { id, link }
 */
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (!raw) return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    const body = JSON.parse(raw);
    const projectId = typeof body.project_id === 'string' ? body.project_id : '';
    const role = typeof body.role === 'string' ? body.role : 'view';
    const expiresAt = typeof body.expires_at === 'string' ? body.expires_at : null;
    const maxUses = typeof body.max_uses === 'number' ? body.max_uses : null;

    // Prefer server-verified actor via Authorization: Bearer <token>
    let actorId = req.headers.get('x-actor-id');
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

    if (!actorId) return NextResponse.json({ error: 'Missing x-actor-id header or Authorization token' }, { status: 403 });
    if (!projectId) return NextResponse.json({ error: 'project_id is required' }, { status: 400 });

    // Verify actor is owner or manager of the project
    const { data: proj, error: projErr } = await supabaseAdmin
      .from('projects')
      .select('id, team_id, owner_id')
      .eq('id', projectId)
      .maybeSingle();
    if (projErr || !proj) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    // Simple ownership check: match owner or check project_members
    let isAuthorized = false;
    if (proj.owner_id && proj.owner_id === actorId) isAuthorized = true;

    if (!isAuthorized) {
      const { data: pm } = await supabaseAdmin
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('member_id', actorId)
        .limit(1);
      if (pm && pm.length > 0 && (pm[0].role === 'owner' || pm[0].role === 'manage')) isAuthorized = true;
    }

    // If still not authorized and project has no owner_id set, check the team's owner via team_members
    if (!isAuthorized && !proj.owner_id && proj.team_id) {
      try {
        const { data: teamOwnerRows } = await supabaseAdmin
          .from('team_members')
          .select('user_id, role')
          .eq('team_id', proj.team_id)
          .eq('role', 'owner')
          .limit(1);
        const ownerRow = Array.isArray(teamOwnerRows) ? teamOwnerRows[0] : teamOwnerRows;
        if (ownerRow && ownerRow.user_id === actorId) isAuthorized = true;
      } catch (e) {
        console.warn('[/api/projects/share] team owner lookup failed', e);
      }
    }

    if (!isAuthorized) {
      console.warn('[/api/projects/share] Forbidden: actor not authorized', { actorId, projectOwner: proj.owner_id });
      const { data: pmDebug } = await supabaseAdmin.from('project_members').select('member_id,role').eq('project_id', projectId);
      console.warn('[/api/projects/share] project_members for project', projectId, pmDebug || []);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate token and store only hash
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const insert = {
      project_id: projectId,
      role,
      token_hash: tokenHash,
      created_by: actorId,
      expires_at: expiresAt,
      max_uses: maxUses,
    };

    const { data, error } = await supabaseAdmin.from('share_links').insert(insert).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Build safe origin: prefer NEXT_PUBLIC_APP_URL, then Origin header, then x-forwarded-proto + host, then localhost fallback
    const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_ORIGIN || '';
    const originHeader = req.headers.get('origin');
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const hostHeader = req.headers.get('host');
    const fallbackProto = forwardedProto || 'http';
    const computedOrigin = envUrl || originHeader || (hostHeader ? `${fallbackProto}://${hostHeader}` : `http://localhost:3000`);
    const safeOrigin = computedOrigin.replace(/\/+$/, '');

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
    const actorId = req.headers.get('x-actor-id');
    if (!actorId) return NextResponse.json({ error: 'Missing x-actor-id header' }, { status: 403 });
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    // Load share link to get project
    const { data: linkData, error: linkErr } = await supabaseAdmin.from('share_links').select('id, project_id, created_by').eq('id', id).maybeSingle();
    if (linkErr || !linkData) return NextResponse.json({ error: 'Share link not found' }, { status: 404 });

    // Check actor authorization (owner/manage)
    const { data: proj } = await supabaseAdmin.from('projects').select('owner_id').eq('id', linkData.project_id).maybeSingle();
    let isAuthorized = false;
    if (proj?.owner_id === actorId) isAuthorized = true;
    if (!isAuthorized) {
      const { data: pm } = await supabaseAdmin.from('project_members').select('role').eq('project_id', linkData.project_id).eq('member_id', actorId).limit(1);
      if (pm && pm.length > 0 && (pm[0].role === 'owner' || pm[0].role === 'manage')) isAuthorized = true;
    }
    if (!isAuthorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { error } = await supabaseAdmin.from('share_links').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabaseAdmin.from('audit_logs').insert({ actor_id: actorId, action: 'share_link_revoked', target_type: 'share_link', target_id: id, meta: null });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('[DELETE /api/projects/share] Error', err);
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}
