import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const FROM_NAME = process.env.FROM_NAME || 'Approved';
const FROM_ADDRESS = process.env.FROM_ADDRESS || 'no-reply@example.com';

let transporter: any = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!SMTP_HOST) {
    // fallback: use direct transport (may be blocked). Nodemailer will attempt to send.
    transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      secure: false,
    });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT || 587,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  return transporter;
}

export async function sendConfirmationEmail(email: string, actionLink: string) {
  const t = getTransporter();

  const from = `${FROM_NAME} <${FROM_ADDRESS}>`;
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

  const info = await t.sendMail({
    from,
    to: email,
    subject,
    text,
    html,
  });

  return info;
}

export default { sendConfirmationEmail };
