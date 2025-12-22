Email confirmation (Approved)

This project sends user confirmation emails using the Supabase Admin API (server-side) and a custom SMTP sender so the From header shows your app name (e.g. "Approved").

Required environment variables (development & production)

- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_APP_URL (e.g. http://localhost:3000)
- FROM_NAME (e.g. Approved)
- FROM_ADDRESS (e.g. no-reply@yourdomain.com)

SMTP (either MailDev for local testing or real SMTP provider)

- SMTP_HOST (e.g. localhost for MailDev)
- SMTP_PORT (e.g. 1025 for MailDev)
- SMTP_USER (optional)
- SMTP_PASS (optional)

Test user (local)

- TEST_EMAIL (the address MailDev will receive, e.g. test@localhost)
- TEST_PASSWORD (optional, default used by scripts: Password123!)

Available scripts

- Start MailDev (local SMTP + web UI):

  npm run maildev

- Run email e2e test (generates Supabase signup link, sends via SMTP, verifies MailDev):

  npm run test:email

Dev scripts

Temporary test scripts live in `dev-scripts/`. If you need to run them directly:

  node dev-scripts/e2e_robust.js
  node dev-scripts/e2e_signup_maildev.js
  node dev-scripts/e2e_signup_test.js
  node dev-scripts/test_send_email_stream.js

These were moved from `scripts/` to keep the repo scripts folder clean.

Quick manual test

1. Start MailDev in a separate terminal: `npm run maildev` (web UI at http://localhost:1080)
2. Ensure `.env.local` contains the variables above (especially `SUPABASE_SERVICE_ROLE_KEY` and `TEST_EMAIL`).
3. Run the e2e test:

   node scripts/e2e_robust.js

4. Inspect the received email in MailDev web UI. Verify the From header shows `FROM_NAME <FROM_ADDRESS>` and the email contains a Supabase verification link.

Notes and deployment

- In production, configure a real SMTP provider and set the same `FROM_NAME`/`FROM_ADDRESS` env vars.
- Alternatively, configure SMTP in the Supabase project settings; then Supabase will send emails directly (but ensure sender configuration matches your domain/provider).
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret and never expose it to the browser.

Files of interest

- `lib/email.ts` — SMTP helper using nodemailer
- `app/api/auth/signup/route.ts` — server route that generates action link and sends confirmation email
- `app/login/page.tsx` — client uses `/api/auth/signup` for signup flow
- `scripts/e2e_robust.js` — robust test (tries SMTP, falls back to stream, checks MailDev)

If you want I can now commit these changes on a branch and remove or move the temporary test scripts into a `dev-scripts/` folder.
