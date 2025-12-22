require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

async function run() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase env vars');

  const EMAIL_TO = process.env.TEST_EMAIL || process.env.TEST_EMAIL_TO;
  if (!EMAIL_TO) throw new Error('Set TEST_EMAIL in .env.local to receive the test');

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  console.log('[e2e] Generating action link for', EMAIL_TO);
  const redirectTo = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  const password = process.env.TEST_PASSWORD || 'Password123!';
  const res = await supabaseAdmin.auth.admin.generateLink({ email: EMAIL_TO, type: 'signup', options: { redirectTo, password } }).catch(e => ({ error: e }));
  if (res.error) {
    console.error('[e2e] generateLink error', res.error);
    process.exit(1);
  }

  const actionLink = res.data?.properties?.action_link;
  if (!actionLink) {
    console.error('[e2e] no action_link in response', res.data);
    process.exit(1);
  }

  console.log('[e2e] action link:', actionLink);

  // Use streamTransport to capture raw message locally (no SMTP required)
  const fromName = process.env.FROM_NAME || 'Approved';
  const fromAddress = process.env.FROM_ADDRESS || 'no-reply@example.com';

  const transporter = nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true });

  const info = await transporter.sendMail({
    from: `${fromName} <${fromAddress}>`,
    to: EMAIL_TO,
    subject: 'Conferma il tuo account Approved',
    text: `Conferma qui: ${actionLink}`,
    html: `<p>Conferma il tuo account cliccando <a href="${actionLink}">qui</a></p>`,
  }).catch(e => ({ error: e }));

  if (info && info.error) {
    console.error('[e2e] sendMail error', info.error);
    process.exit(1);
  }

  console.log('[e2e] Stream send info envelope:', info.envelope);
  if (info && info.message) {
    console.log('\n---- RAW MESSAGE ----\n');
    try { console.log(info.message.toString('utf8')); } catch (e) { console.log(String(info.message)); }
    console.log('\n---- END RAW ----\n');
  }
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
