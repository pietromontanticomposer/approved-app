import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body || {};

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    if (!supabaseAdmin || !supabaseAdmin.auth || !supabaseAdmin.auth.admin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 });
    }

    // Check if user exists
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('[check-email] Error listing users:', error);
      return NextResponse.json({ error: 'Could not check email' }, { status: 500 });
    }

    const users = data.users || [];
    const exists = users.some(u => u.email?.toLowerCase() === email.toLowerCase());

    return NextResponse.json({ exists });
  } catch (err: any) {
    console.error('[check-email] Error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
