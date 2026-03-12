import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, getClientIp, LIMITS } from '@/lib/rateLimit';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`check-email:${ip}`, LIMITS.auth.max, LIMITS.auth.windowMs);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Troppi tentativi. Riprova tra poco.' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) },
    });
  }

  try {
    const body = await req.json();
    const { email } = body || {};

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    if (!supabaseAdmin || !supabaseAdmin.auth || !supabaseAdmin.auth.admin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 });
    }

    // Check if user exists by email directly (avoids loading all users)
    const { data, error } = await supabaseAdmin.auth.admin.getUserByEmail(email.toLowerCase());

    if (error) {
      // "User not found" is expected — not a server error
      const isNotFound = error.status === 422 || error.status === 404 ||
        error.message?.toLowerCase().includes('not found') ||
        error.message?.toLowerCase().includes('no rows');
      if (isNotFound) {
        return NextResponse.json({ exists: false });
      }
      console.error('[check-email] Error:', error);
      return NextResponse.json({ error: 'Could not check email' }, { status: 500 });
    }

    return NextResponse.json({ exists: !!data?.user });
  } catch (err: any) {
    console.error('[check-email] Error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
