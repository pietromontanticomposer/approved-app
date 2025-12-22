import 'dotenv/config';

async function run() {
  const mod = await import('../lib/email');
  const send = mod.sendConfirmationEmail || (mod.default && mod.default.sendConfirmationEmail);
  if (!send) throw new Error('sendConfirmationEmail not found');

  const to = process.env.TEST_EMAIL || 'recipient@example.com';
  const link = process.env.ACTION_LINK || 'https://approved.test/confirm?token=abc123';

  console.log('[test] Sending confirmation email to', to);
  const res = await send(to, link);
  console.log('[test] send result:', res);
}

run().catch(e => { console.error(e); process.exit(1); });
