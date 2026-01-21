import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAuth } from "@/lib/auth";
import { isUuid } from "@/lib/validation";
import crypto from "crypto";

/**
 * POST /api/share/redeem
 * Body: { share_id, token }
 * Redeems a share link: validates token, adds user to project_members with the role from the link
 */

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth || !isUuid(auth.userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raw = await req.text();
    if (!raw) return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    const body = JSON.parse(raw);
    const shareId = typeof body.share_id === 'string' ? body.share_id : '';
    const token = typeof body.token === 'string' ? body.token : '';

    const actorId = auth.userId;
    if (!shareId || !token) return NextResponse.json({ error: 'share_id and token are required' }, { status: 400 });

    // Load share link by id
    const { data: linkData, error: linkErr } = await supabaseAdmin.from('share_links').select('*').eq('id', shareId).maybeSingle();
    if (linkErr || !linkData) return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    if (linkData.revoked_at) return NextResponse.json({ error: 'Share link revoked' }, { status: 410 });

    // Check expiry
    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Share link expired' }, { status: 410 });
    }

    // Verify token by hashing
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (tokenHash !== linkData.token_hash) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    // Atomic increment with max_uses check to prevent race condition
    // Only increment if uses < max_uses (or max_uses is null/0)
    let incrementQuery = supabaseAdmin
      .from('share_links')
      .update({ uses: (linkData.uses || 0) + 1 })
      .eq('id', shareId);

    if (linkData.max_uses && linkData.max_uses > 0) {
      incrementQuery = incrementQuery.lt('uses', linkData.max_uses);
    }

    const { data: updateResult, error: updateErr } = await incrementQuery.select('id');

    // If no rows updated, max_uses was reached (race condition caught)
    if (updateErr || !updateResult || updateResult.length === 0) {
      return NextResponse.json({ error: 'Share link max uses exceeded' }, { status: 410 });
    }

    // Add to project_members (idempotent upsert) - same as invite accept
    const insert = {
      project_id: linkData.project_id,
      member_id: actorId,
      role: linkData.role || 'viewer',
      added_by: linkData.created_by || null,
      added_at: new Date().toISOString()
    };

    const { error: upsertErr } = await supabaseAdmin.from('project_members').upsert(insert, { onConflict: 'project_id,member_id' });
    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

    // Log audit
    await supabaseAdmin.from('audit_logs').insert({ actor_id: actorId, action: 'share_link_redeemed', target_type: 'project', target_id: linkData.project_id, meta: { share_link_id: shareId } });

    return NextResponse.json({ success: true, project_id: linkData.project_id }, { status: 200 });
  } catch (err: any) {
    console.error('[POST /api/share/redeem] Error', err);
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}
