import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

/**
 * POST /api/share/guest-redeem
 *
 * Redeems a guest-enabled share link without requiring authentication.
 * Creates a guest session that allows the user to view/comment with just a nickname.
 *
 * Body: { share_id: string, token: string, nickname: string }
 * Returns: { success: true, session_token: string, project_id: string, role: string, nickname: string, expires_at: string }
 */
export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const shareId = typeof body.share_id === 'string' ? body.share_id.trim() : '';
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';

    // Validate input
    if (!shareId || !token) {
      return NextResponse.json({ error: 'share_id and token are required' }, { status: 400 });
    }
    if (!nickname || nickname.length < 2 || nickname.length > 50) {
      return NextResponse.json({ error: 'Il nickname deve avere tra 2 e 50 caratteri' }, { status: 400 });
    }

    // Load share link
    const { data: linkData, error: linkErr } = await supabaseAdmin
      .from('share_links')
      .select('*')
      .eq('id', shareId)
      .maybeSingle();

    if (linkErr || !linkData) {
      return NextResponse.json({ error: 'Link non trovato' }, { status: 404 });
    }

    // Validate link status
    if (linkData.revoked_at) {
      return NextResponse.json({ error: 'Link revocato' }, { status: 410 });
    }
    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Link scaduto' }, { status: 410 });
    }
    if (!linkData.guest_enabled) {
      return NextResponse.json({ error: 'Questo link richiede un account' }, { status: 403 });
    }

    // Validate token hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (tokenHash !== linkData.token_hash) {
      return NextResponse.json({ error: 'Token non valido' }, { status: 403 });
    }

    // Check max_uses
    if (linkData.max_uses && linkData.max_uses > 0 && linkData.uses >= linkData.max_uses) {
      return NextResponse.json({ error: 'Link già utilizzato' }, { status: 410 });
    }

    // Check if a session already exists for this link (single-use)
    const { data: existingSession } = await supabaseAdmin
      .from('guest_sessions')
      .select('id')
      .eq('share_link_id', shareId)
      .maybeSingle();

    if (existingSession) {
      return NextResponse.json({ error: 'Link già utilizzato' }, { status: 410 });
    }

    // Atomically increment uses with condition check
    const { data: updateResult, error: updateErr } = await supabaseAdmin
      .from('share_links')
      .update({ uses: (linkData.uses || 0) + 1 })
      .eq('id', shareId)
      .lt('uses', linkData.max_uses || 999999)
      .select('id');

    if (updateErr || !updateResult || updateResult.length === 0) {
      return NextResponse.json({ error: 'Link già utilizzato (race condition)' }, { status: 410 });
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('base64url');
    const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

    // Session expires in 7 days
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + 7);

    // Determine role (only viewer or commenter for guests)
    const guestRole = linkData.role === 'commenter' ? 'commenter' : 'viewer';

    // Create guest session
    const { data: sessionData, error: sessionErr } = await supabaseAdmin
      .from('guest_sessions')
      .insert({
        share_link_id: shareId,
        session_token_hash: sessionTokenHash,
        nickname: nickname,
        project_id: linkData.project_id,
        role: guestRole,
        expires_at: sessionExpiry.toISOString(),
      })
      .select()
      .single();

    if (sessionErr) {
      console.error('[guest-redeem] session insert error', sessionErr);
      return NextResponse.json({ error: 'Impossibile creare la sessione' }, { status: 500 });
    }

    // Log audit (fire and forget)
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_id: null,
        action: 'guest_session_created',
        target_type: 'project',
        target_id: linkData.project_id,
        meta: {
          share_link_id: shareId,
          guest_session_id: sessionData.id,
          nickname: nickname,
        },
      });
    } catch (auditErr) {
      console.warn('[guest-redeem] audit log error', auditErr);
    }

    return NextResponse.json({
      success: true,
      session_token: sessionToken,
      project_id: linkData.project_id,
      role: guestRole,
      nickname: nickname,
      expires_at: sessionData.expires_at,
    }, { status: 201 });

  } catch (err: any) {
    console.error('[POST /api/share/guest-redeem] Error', err);
    return NextResponse.json({ error: err?.message || 'Errore imprevisto' }, { status: 500 });
  }
}
