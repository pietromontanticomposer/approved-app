require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function trySmtpSend(transporter, mail) {
  try {
    return await transporter.sendMail(mail);
  } catch (e) {
    return { error: e };
  }
}

async function run() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase env');

  const EMAIL_TO = process.env.TEST_EMAIL;
  if (!EMAIL_TO) throw new Error('Set TEST_EMAIL in .env.local');

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  console.log('[robust] Generating signup link for', EMAIL_TO);
  const redirectTo = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const password = process.env.TEST_PASSWORD || 'Password123!';

  const res = await supabaseAdmin.auth.admin.generateLink({ email: EMAIL_TO, type: 'signup', options: { redirectTo, password } }).catch(e=>({ error: e }));
  if (res.error) {
    console.error('[robust] generateLink error', res.error);
    process.exit(1);
  }
  const actionLink = res.data?.properties?.action_link;
  console.log('[robust] actionLink:', actionLink);

  const fromName = process.env.FROM_NAME || 'Approved';
  const fromAddress = process.env.FROM_ADDRESS || 'no-reply@example.com';
  const mail = {
    from: `${fromName} <${fromAddress}>`,
    to: EMAIL_TO,
    subject: 'Conferma il tuo account Approved',
    text: `Conferma qui: ${actionLink}`,
    html: `<p>Conferma qui: <a href="${actionLink}">clicca</a></p>`,
  };

  // Prepare SMTP transporter (IPv4 fallback)
  const rawHost = process.env.SMTP_HOST || 'localhost';
  const host = rawHost === 'localhost' ? '127.0.0.1' : rawHost;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 1025;
  const transporter = nodemailer.createTransport({ host, port, secure: process.env.SMTP_PORT=='465', auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined, timeout: 5000 });

  // Try sending with retries
  let attempt = 0, maxAttempts = 3, sendResult = null;
  while(attempt < maxAttempts){
    attempt++;
    console.log(`[robust] SMTP attempt ${attempt}/${maxAttempts} to ${host}:${port}`);
    sendResult = await trySmtpSend(transporter, mail);
    if (!sendResult || !sendResult.error) break;
    console.warn('[robust] SMTP attempt failed:', sendResult.error && sendResult.error.code ? sendResult.error.code : sendResult.error);
    await sleep(700);
  }

  if (sendResult && sendResult.error) {
    console.warn('[robust] SMTP failed after retries, falling back to streamTransport and printing raw message');
    const st = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
    const info = await st.sendMail(mail);
    console.log('[robust] Stream envelope:', info.envelope);
    console.log('\n---- RAW MESSAGE ----\n');
    try { console.log(info.message.toString('utf8')); } catch(e){ console.log(String(info.message)); }
    console.log('\n---- END RAW ----\n');
  } else {
    console.log('[robust] SMTP send successful:', sendResult && sendResult.messageId);
  }

  // Try MailDev HTTP API to list emails
  try {
    const apiBase = process.env.MAILDEV_API_BASE || 'http://localhost:1080';
    const list = await fetch(`${apiBase}/email`).then(r=>r.json()).catch(()=>null);
    if (!list) { console.warn('[robust] Could not reach MailDev API at', apiBase); process.exit(sendResult && sendResult.error ? 0 : 0); }
    const found = (list||[]).find(e => (e.to||[]).some(t=>t.address===EMAIL_TO) || (e.subject||'').includes('Conferma'));
    if (found) {
      console.log('[robust] Found email in MailDev API. id=', found.id);
      console.log('[robust] From header sample:', found.headers && found.headers.from);
    } else {
      console.warn('[robust] Email not found in MailDev API list. Count=', (list||[]).length);
    }
  } catch (e) {
    console.error('[robust] MailDev API check error', e);
  }

  console.log('[robust] Done');
}

run().catch(e=>{ console.error(e); process.exit(1); });
