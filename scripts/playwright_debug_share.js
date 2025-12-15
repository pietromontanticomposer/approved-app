const { chromium } = require('playwright');
const fs = require('fs');

async function run() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node scripts/playwright_debug_share.js <url>');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = { console: [], responses: [], navigations: [] };

  page.on('console', (msg) => {
    try { logs.console.push({ type: msg.type(), text: msg.text() }); } catch (e) {}
  });

  page.on('response', async (resp) => {
    try {
      const url = resp.url();
      const status = resp.status();
      // capture small JSON bodies only
      let body = null;
      const ct = resp.headers()['content-type'] || '';
      if (ct.includes('application/json') && status < 500) {
        try { body = await resp.json(); } catch (e) { body = '<non-json>'; }
      }
      logs.responses.push({ url, status, body });
    } catch (e) {}
  });

  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) logs.navigations.push(frame.url());
  });

  try {
    // start with a clear browsing state
    await context.clearCookies();
    await context.clearPermissions();

    // navigate
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // wait a bit for possible redirects and client logic
    await page.waitForTimeout(1500);

    const finalUrl = page.url();
    const localStorage = await page.evaluate(() => {
      try { return Object.assign({}, window.localStorage); } catch (e) { return { error: String(e) }; }
    });
    const cookies = await context.cookies();

    const out = { finalUrl, navigations: logs.navigations, console: logs.console, responses: logs.responses, localStorage, cookies };
    const outPath = '/tmp/playwright_share_debug.json';
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log('Saved debug to', outPath);
    console.log('Final URL:', finalUrl);
  } catch (err) {
    console.error('Error during navigation', err);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
}

run();
