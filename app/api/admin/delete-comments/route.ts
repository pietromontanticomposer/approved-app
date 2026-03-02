import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, getClientIp, LIMITS } from '@/lib/rateLimit';

// Protected admin route to delete all comments.
// Requires header `x-admin-delete-secret` matching process.env.ADMIN_DELETE_SECRET.
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`admin-delete:${ip}`, LIMITS.adminDestructive.max, LIMITS.adminDestructive.windowMs);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) },
    });
  }

  try {
    const secretHeader = req.headers.get('x-admin-delete-secret') || '';
    const secretEnv = process.env.ADMIN_DELETE_SECRET || '';

    if (!secretEnv) {
      return NextResponse.json({ error: 'ADMIN_DELETE_SECRET not configured on server' }, { status: 500 });
    }

    if (!secretHeader || secretHeader !== secretEnv) {
      // Log failed attempts
      console.warn('[ADMIN DELETE COMMENTS] Unauthorized attempt from IP:', ip);
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Count rows first (use head to get count)
    const countRes = await supabaseAdmin.from('comments').select('*', { count: 'exact', head: true });
    const total = typeof (countRes as any).count === 'number' ? (countRes as any).count : null;

    // Delete all comments (safe filter: delete where id != '')
    const del = await supabaseAdmin.from('comments').delete().neq('id', '');
    if (del.error) {
      console.error('[ADMIN DELETE COMMENTS] Supabase error', del.error);
      return NextResponse.json({ error: del.error.message || String(del.error) }, { status: 500 });
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: 'admin',
      action: 'admin_delete_all_comments',
      target_type: 'comments',
      target_id: null,
      meta: { deleted_count: total, ip_address: ip, performed_at: new Date().toISOString() },
    }).then(({ error }) => {
      if (error) console.warn('[ADMIN DELETE COMMENTS] Audit log failed:', error.message);
    });

    console.log(`[ADMIN DELETE COMMENTS] Deleted ${total} comments from IP: ${ip}`);
    return NextResponse.json({ success: true, deleted: total }, { status: 200 });
  } catch (err: any) {
    console.error('[ADMIN DELETE COMMENTS] Error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
