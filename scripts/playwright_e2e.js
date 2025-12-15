const { chromium } = require('playwright');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Configure test IDs from .env.local or defaults used earlier
  const inviteId = process.env.TEST_INVITE_ID || '';
  const teamId = process.env.TEST_TEAM_ID || 'cb1a651e-6240-4d49-8f68-fe1b2beae2b8';

  // Create an invite via API to get one for test
  console.log('Creating invite via API...');
  const ownerId = process.env.TEST_OWNER_ID || '65e6a4da-631d-4fb2-a1d3-988847890aa7';

  const resp = await page.request.post('http://localhost:3000/api/invites', {
    headers: { 'Content-Type': 'application/json', 'x-actor-id': ownerId },
    data: { team_id: teamId, project_id: process.env.TEST_PROJECT_ID || '', role: 'viewer', is_link_invite: true }
  });
  const body = await resp.json();
  if (!resp.ok) {
    console.error('Create invite API failed', resp.status(), body);
    await browser.close();
    process.exit(1);
  }
  const inviteUrl = body.invite_url;
  console.log('Invite URL:', inviteUrl);

  // Step 1: Open invite page as unauthenticated
  console.log('Opening invite page unauthenticated...');
  await page.goto(inviteUrl, { waitUntil: 'networkidle' });

  // Wait briefly for client JS to run and render the invite UI
  await page.waitForTimeout(1500);
  const bodyText = await page.innerText('body');
  console.log('Invite page body excerpt:', bodyText.slice(0, 300));

  // Try clicking the login button by label; try multiple fallbacks
  const loginSelectors = [
    'text=Accedi per continuare',
    'text=Accedi per continuare',
    'text=Accedi',
    'button:has-text("Accedi per continuare")',
  ];
  let clicked = false;
  for (const sel of loginSelectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click();
        clicked = true;
        break;
      }
    } catch (e) {
      // ignore
    }
  }
  if (!clicked) {
    console.error('Could not find login button on invite page');
    await browser.close();
    process.exit(4);
  }
  await page.waitForTimeout(500);

  // Check localStorage pending_invite set
  const pending = await page.evaluate(() => localStorage.getItem('pending_invite'));
  console.log('pending_invite in localStorage:', pending);
  if (!pending) {
    console.error('pending_invite not set — flow broken');
    await browser.close();
    process.exit(2);
  }

  // Simulate successful login: set approved-auth and clear pending_invite consumption flow
  console.log('Simulating login by setting approved-auth and reloading home...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('approved-auth', JSON.stringify({ mocked: true }));
  });

  // After login page logic, app should read pending_invite and redirect back to /invite/:token
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Check we are back on invite page (URL contains /invite/)
  const url = page.url();
  console.log('Current URL after simulated login:', url);
  if (!/\/invite\//.test(url)) {
    console.error('Did not return to invite page after login flow');
    await browser.close();
    process.exit(3);
  }

  console.log('Invite redirect/login flow (localStorage-based) works — UI side verified.');
  
  // Now perform acceptance via server endpoint using a test actor id
  console.log('Calling server accept endpoint to accept invite...');
  const acceptResp = await page.request.post('http://localhost:3000/api/invites/accept', {
    headers: { 'Content-Type': 'application/json', 'x-actor-id': process.env.TEST_ACCEPTING_USER || (process.env.TEST_OWNER_ID || '65e6a4da-631d-4fb2-a1d3-988847890aa7') },
    data: { invite_token: inviteUrl.split('/').pop() }
  });
  const acceptBody = await acceptResp.json();
  console.log('Accept response:', acceptResp.status(), acceptBody);

  if (!acceptResp.ok && !acceptBody?.success) {
    console.error('Server accept failed', acceptResp.status(), acceptBody);
    await browser.close();
    process.exit(5);
  }

  // Verify via admin: check team_members row exists for accepting user
  const acceptingUser = process.env.TEST_ACCEPTING_USER || (process.env.TEST_OWNER_ID || '65e6a4da-631d-4fb2-a1d3-988847890aa7');
  const admin = require('@supabase/supabase-js').createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: tm } = await admin.from('team_members').select('*').eq('user_id', acceptingUser).limit(1);
  console.log('team_members check:', tm && tm.length ? tm[0] : null);

  if (!tm || tm.length === 0) {
    console.error('Acceptance did not create team_members record');
    await browser.close();
    process.exit(6);
  }

  console.log('Invite accepted and DB verified.');

  await browser.close();
  process.exit(0);
})();
