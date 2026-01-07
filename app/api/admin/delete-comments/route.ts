import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Protected admin route to delete all comments.
// Requires header `x-admin-delete-secret` matching process.env.ADMIN_DELETE_SECRET.
export async function POST(req: Request) {
  try {
    const secretHeader = req.headers.get('x-admin-delete-secret') || '';
    const secretEnv = process.env.ADMIN_DELETE_SECRET || '';

    if (!secretEnv) {
      return NextResponse.json({ error: 'ADMIN_DELETE_SECRET not configured on server' }, { status: 500 });
    }

    if (!secretHeader || secretHeader !== secretEnv) {
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

    return NextResponse.json({ success: true, deleted: total }, { status: 200 });
  } catch (err: any) {
    console.error('[ADMIN DELETE COMMENTS] Error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
