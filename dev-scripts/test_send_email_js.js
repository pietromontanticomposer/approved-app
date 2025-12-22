require('dotenv').config();
const nodemailer = require('nodemailer');

async function run() {
  const SMTP_HOST = process.env.SMTP_HOST || 'localhost';
  const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 1025;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;

  const FROM_NAME = process.env.FROM_NAME || 'Approved';
  const FROM_ADDRESS = process.env.FROM_ADDRESS || 'no-reply@example.com';

  const to = process.env.TEST_EMAIL || 'recipient@example.com';
  const link = process.env.ACTION_LINK || 'https://approved.test/confirm?token=abc123';

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  const from = `${FROM_NAME} <${FROM_ADDRESS}>`;
  const subject = 'Conferma il tuo account Approved';
  const html = `<p>Click: <a href="${link}">${link}</a></p>`;

  console.log('[test-js] Sending email to', to, 'from', from, 'via', SMTP_HOST + ':' + SMTP_PORT);

  const info = await transporter.sendMail({ from, to, subject, html, text: `Confirm: ${link}` });
  console.log('[test-js] Sent:', info);
}

run().catch(e => { console.error(e); process.exit(1); });
