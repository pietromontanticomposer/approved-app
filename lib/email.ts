import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_USE_AUTH_EMAIL = process.env.SUPABASE_USE_AUTH_EMAIL === '1';

const FROM_NAME = process.env.FROM_NAME || 'Approved';
const FROM_ADDRESS = process.env.FROM_ADDRESS || 'no-reply@example.com';

let transporter: any = null;

async function sendViaResend(payload: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const from = `${FROM_NAME} <${FROM_ADDRESS}>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend failed (${res.status}): ${body || res.statusText}`);
  }
  return res.json().catch(() => ({}));
}

async function sendViaSupabaseMagicLink(email: string, redirectTo: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase email not configured: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      email,
      type: 'magiclink',
      options: { redirectTo },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase auth email failed (${res.status}): ${body || res.statusText}`);
  }
  return res.json().catch(() => ({}));
}

function getTransporter() {
  if (transporter) return transporter;
  if (!SMTP_HOST) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT || 587,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  return transporter;
}

async function sendEmail(payload: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (RESEND_API_KEY) {
    return sendViaResend(payload);
  }

  const t = getTransporter();
  if (!t) {
    throw new Error('Email delivery not configured: set RESEND_API_KEY or SMTP_HOST/SMTP_PORT');
  }

  const from = `${FROM_NAME} <${FROM_ADDRESS}>`;
  return t.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}

export async function sendConfirmationEmail(email: string, actionLink: string) {
  const subject = 'Conferma il tuo account Approved';

  const text = `Ciao!\n\nConferma il tuo account cliccando qui: ${actionLink}\n\nSe non hai richiesto questa email, ignora.`;
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; color:#111;">
      <h2 style="color:#0b62ff">Approved</h2>
      <p>Conferma il tuo account cliccando il pulsante qui sotto.</p>
      <p><a href="${actionLink}" style="display:inline-block;padding:12px 18px;background:#0b62ff;color:#fff;text-decoration:none;border-radius:6px">Conferma account</a></p>
      <p style="color:#666;font-size:0.9rem">Oppure usa questo link: <br/><a href="${actionLink}">${actionLink}</a></p>
      <p style="color:#999;font-size:0.85rem">Se non hai richiesto questa email, puoi ignorarla.</p>
    </div>
  `;
  return sendEmail({ to: email, subject, text, html });
}

export default { sendConfirmationEmail };

export async function sendInviteEmail(email: string, inviteLink: string, invitedBy?: string | null) {
  if (SUPABASE_USE_AUTH_EMAIL) {
    return sendViaSupabaseMagicLink(email, inviteLink);
  }
  const subject = `${FROM_NAME} ti ha invitato a collaborare a Approved`;

  const text = `Ciao!\n\nSei stato invitato a unirti a Approved. Apri questo link per vedere l'invito: ${inviteLink}\n\nSe non ti aspettavi questa email, ignora.`;
  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial; color:#111;">
      <h2 style="color:#0b62ff">${FROM_NAME}</h2>
      <p>${invitedBy ? `Hai ricevuto un invito da <strong>${invitedBy}</strong>.` : 'Hai ricevuto un invito a unirti a un team.'}</p>
      <p>Apri l'invito cliccando il pulsante qui sotto:</p>
      <p><a href="${inviteLink}" style="display:inline-block;padding:12px 18px;background:#0b62ff;color:#fff;text-decoration:none;border-radius:6px">Apri invito</a></p>
      <p style="color:#666;font-size:0.9rem">Oppure usa questo link: <br/><a href="${inviteLink}">${inviteLink}</a></p>
      <p style="color:#999;font-size:0.85rem">Se non ti aspettavi questa email, puoi ignorarla.</p>
    </div>
  `;
  return sendEmail({ to: email, subject, text, html });
}
