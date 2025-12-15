const { chromium } = require('playwright');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const ownerId = process.env.TEST_OWNER_ID || process.env.TEST_OWNER_ID || '65e6a4da-631d-4fb2-a1d3-988847890aa7';
  const projectId = process.env.TEST_PROJECT_ID || 'e7b071cb-2a95-488c-afac-70fc44af8104';

  console.log('Creating share via API...');
  const res = await page.request.post('http://localhost:3000/api/projects/share', {
    headers: { 'Content-Type': 'application/json', 'x-actor-id': ownerId },
    data: { project_id: projectId, role: 'viewer' }
  });
  const body = await res.json();
  console.log('Share create response:', res.status(), body);
  if (!res.ok) {
    console.error('Share creation failed');
    await browser.close();
    process.exit(1);
  }

  const link = body.link;
  console.log('Share link:', link);

  // Navigate to the link
  console.log('Opening share link in browser...');
  await page.goto(link, { waitUntil: 'networkidle' }).catch(e => { console.error('Goto error', e); });
  await page.waitForTimeout(800);

  const content = await page.content();
  const hasShareText = content.includes('Progetto condiviso') || content.includes('Progetto:') || content.includes('Progetto condiviso');
  console.log('Share page loaded, contains share text?', hasShareText);

  if (!hasShareText) {
    console.error('Share page did not render expected content. Dumping body excerpt:');
    console.log(content.slice(0, 2000));
    await browser.close();
    process.exit(2);
  }

  console.log('Share link opens correctly in browser.');
  await browser.close();
  process.exit(0);
})();
