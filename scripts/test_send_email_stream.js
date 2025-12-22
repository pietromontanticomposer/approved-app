require('dotenv').config();
const nodemailer = require('nodemailer');

async function run() {
  const FROM_NAME = process.env.FROM_NAME || 'Approved';
  const FROM_ADDRESS = process.env.FROM_ADDRESS || 'no-reply@example.com';
  const to = process.env.TEST_EMAIL || 'recipient@example.com';
  const link = process.env.ACTION_LINK || 'https://approved.test/confirm?token=abc123';

  // Use streamTransport to avoid needing a real SMTP server
  const transporter = nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true });

  const from = `${FROM_NAME} <${FROM_ADDRESS}>`;
  const subject = 'Conferma il tuo account Approved';
  const html = `<p>Click: <a href="${link}">${link}</a></p>`;

  console.log('[test-stream] Sending (stream) email to', to, 'from', from);
  const info = await transporter.sendMail({ from, to, subject, html, text: `Confirm: ${link}` });
  console.log('[test-stream] Sent info:', info);
  if (info && info.message) {
    console.log('\n---- RAW MESSAGE ----\n');
    try {
      console.log(info.message.toString('utf8'));
    } catch (e) {
      console.log(String(info.message));
    }
    console.log('\n---- END RAW ----\n');
  }
}

run().catch(e => { console.error(e); process.exit(1); });
