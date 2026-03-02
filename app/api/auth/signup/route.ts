import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendConfirmationEmail, sendAdminApprovalRequest } from '@/lib/email';
import { checkRateLimit, getClientIp, LIMITS } from '@/lib/rateLimit';
import crypto from 'crypto';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`signup:${ip}`, LIMITS.auth.max, LIMITS.auth.windowMs);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Troppi tentativi. Riprova tra poco.' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) },
    });
  }

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
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
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

    // Get the user ID from the generated link data
    const userId = linkData?.user?.id;

    // Create user approval record (pending by default)
    if (userId) {
      const approvalToken = crypto.randomBytes(32).toString('base64url');

      try {
        await supabaseAdmin.from('user_approvals').insert({
          user_id: userId,
          email: email,
          status: 'pending',
          approval_token: approvalToken,
        });

        // Send notification to admin
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://approved-app-eight.vercel.app';
        const approveLink = `${baseUrl}/api/admin/approve-user?token=${approvalToken}&action=approve`;
        const rejectLink = `${baseUrl}/api/admin/approve-user?token=${approvalToken}&action=reject`;

        try {
          await sendAdminApprovalRequest(email, approveLink, rejectLink);
        } catch (emailErr) {
          console.warn('[signup] Could not send admin notification email', emailErr);
          // Don't fail the signup if admin email fails
        }
      } catch (approvalErr) {
        console.warn('[signup] Could not create approval record', approvalErr);
        // Don't fail the signup if approval record fails - user just won't need approval
      }
    }

    return NextResponse.json({ ok: true, needsApproval: true });
  } catch (err: any) {
    console.error('[signup] Error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
