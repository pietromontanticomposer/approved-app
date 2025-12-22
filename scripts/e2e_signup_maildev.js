require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

async function run() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase env vars');

  const EMAIL_TO = process.env.TEST_EMAIL;
  if (!EMAIL_TO) throw new Error('Set TEST_EMAIL in .env.local to receive the test');

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  console.log('[e2e-maildev] Generating signup action link for', EMAIL_TO);
  const redirectTo = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const password = process.env.TEST_PASSWORD || 'Password123!';

  const res = await supabaseAdmin.auth.admin.generateLink({ email: EMAIL_TO, type: 'signup', options: { redirectTo, password } }).catch(e => ({ error: e }));
  if (res.error) {
    console.error('[e2e-maildev] generateLink error', res.error);
    process.exit(1);
  }

  const actionLink = res.data?.properties?.action_link;
  if (!actionLink) {
    console.error('[e2e-maildev] no action_link in response', res.data);
    process.exit(1);
  }

  console.log('[e2e-maildev] action link:', actionLink);

  // Send via MailDev SMTP (configured in .env.local as SMTP_HOST/SMTP_PORT)
  // prefer IPv4 loopback when host is 'localhost' to avoid ::1 connection issues
  const smtpHostRaw = process.env.SMTP_HOST || 'localhost';
  const smtpHost = smtpHostRaw === 'localhost' ? '127.0.0.1' : smtpHostRaw;
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 1025,
    secure: process.env.SMTP_PORT == '465',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  const fromName = process.env.FROM_NAME || 'Approved';
  const fromAddress = process.env.FROM_ADDRESS || 'no-reply@example.com';

  console.log('[e2e-maildev] Sending email to', EMAIL_TO);
  const info = await transporter.sendMail({
    from: `${fromName} <${fromAddress}>`,
    to: EMAIL_TO,
    subject: 'Conferma il tuo account Approved',
    text: `Conferma qui: ${actionLink}`,
    html: `<p>Conferma il tuo account cliccando <a href="${actionLink}">qui</a></p>`,
  }).catch(e => ({ error: e }));

  if (info && info.error) {
    console.error('[e2e-maildev] sendMail error', info.error);
    process.exit(1);
  }

  console.log('[e2e-maildev] Email sent, checking MailDev HTTP API...');

  // Query MailDev HTTP API to confirm the email arrived
  try {
    const apiBase = process.env.MAILDEV_API_BASE || 'http://localhost:1080';
    const listRes = await fetch(`${apiBase}/email`).then(r => r.json()).catch(() => null);
    if (!listRes) {
      console.warn('[e2e-maildev] Could not query MailDev API. Check MailDev web UI at http://localhost:1080');
      console.log('[e2e-maildev] Done — email sent (check MailDev UI)');
      process.exit(0);
    }

    const found = (listRes || []).find(e => (e.to || []).some(t => t.address === EMAIL_TO) || (e.subject || '').includes('Conferma'));
    if (found) {
      console.log('[e2e-maildev] Found email in MailDev API. ID:', found.id);
      console.log('[e2e-maildev] From header:', found.headers && found.headers.from);
      console.log('[e2e-maildev] Subject:', found.subject);
      process.exit(0);
    } else {
      console.warn('[e2e-maildev] Email not found in MailDev API response. Response length:', (listRes || []).length);
      process.exit(1);
    }
  } catch (e) {
    console.error('[e2e-maildev] Error querying MailDev API', e);
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
