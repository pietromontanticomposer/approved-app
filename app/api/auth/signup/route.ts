import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendConfirmationEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body || {};

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    if (!supabaseAdmin || !supabaseAdmin.auth || !supabaseAdmin.auth.admin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 });
    }

    // Generate an action link that we will send via our SMTP provider
    const redirectTo = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || `${process.env.NEXT_PUBLIC_SUPABASE_URL}`;

    const res = await supabaseAdmin.auth.admin.generateLink({
      email,
      options: {
        password: password || undefined,
        redirectTo,
      },
    });

    if (res.error) {
      return NextResponse.json({ error: res.error.message || res.error }, { status: 500 });
    }

    const actionLink = res.data?.properties?.action_link;
    if (!actionLink) {
      return NextResponse.json({ error: 'Could not generate action link' }, { status: 500 });
    }

    // send email via our SMTP
    try {
      await sendConfirmationEmail(email, actionLink);
    } catch (e: any) {
      console.error('[signup] Error sending confirmation email', e?.message || e);
      return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[signup] Error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
