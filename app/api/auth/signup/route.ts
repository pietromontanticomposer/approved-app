import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendConfirmationEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (!supabaseAdmin || !supabaseAdmin.auth || !supabaseAdmin.auth.admin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 });
    }

    const redirectTo = process.env.NEXT_PUBLIC_APP_URL || 'https://approved-app-eight.vercel.app';

    // First, create the user (unconfirmed)
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // User needs to confirm via email
    });

    if (createError) {
      // If user already exists, tell them
      if (createError.message?.includes('already') || createError.message?.includes('exists')) {
        return NextResponse.json({ error: 'Un account con questa email esiste già. Prova a fare login.' }, { status: 400 });
      }
      console.error('[signup] createUser error:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Now generate the confirmation link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        redirectTo,
      },
    });

    if (linkError) {
      console.error('[signup] generateLink error:', linkError);
      // User was created but link failed - still try to let them know
      return NextResponse.json({ error: 'Account creato ma errore nel generare il link di conferma. Prova a fare login.' }, { status: 500 });
    }

    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) {
      return NextResponse.json({ error: 'Could not generate action link' }, { status: 500 });
    }

    // Send email via our SMTP
    try {
      await sendConfirmationEmail(email, actionLink);
    } catch (e: any) {
      console.error('[signup] Error sending confirmation email', e?.message || e);
      return NextResponse.json({ error: 'Account creato ma errore invio email. Contatta il supporto.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[signup] Error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
