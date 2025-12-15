import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const shareId = url.searchParams.get('share_id') || '';
    const token = url.searchParams.get('token') || '';

    if (!shareId || !token) return NextResponse.json({ error: 'share_id and token required' }, { status: 400 });

    const { data: linkData, error: linkErr } = await supabaseAdmin.from('share_links').select('*, projects(name)').eq('id', shareId).maybeSingle();
    if (linkErr) {
      console.warn('[GET /api/share/details] supabase error', linkErr);
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }
    if (!linkData) return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    if (linkData.revoked_at) return NextResponse.json({ error: 'Share link revoked' }, { status: 410 });

    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) return NextResponse.json({ error: 'Share link expired' }, { status: 410 });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (tokenHash !== linkData.token_hash) return NextResponse.json({ error: 'Invalid token' }, { status: 403 });

    // return minimal details for the client
    const resp = {
      found: true,
      share_id: linkData.id,
      project_id: linkData.project_id,
      project_name: linkData.project_name || linkData.projects?.name || null,
      role: linkData.role || 'view',
      expires_at: linkData.expires_at || null,
    };

    return NextResponse.json(resp, { status: 200 });
  } catch (err: any) {
    console.error('[GET /api/share/details] Error', err);
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}
