#!/usr/bin/env node
const fs = require('fs');

(async () => {
  try {
    const ngrok = require('ngrok');
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    const token = process.argv[2] || process.env.NGROK_AUTHTOKEN;
    if (!token) {
      console.error('ngrok authtoken missing (provide as argv or NGROK_AUTHTOKEN)');
      process.exit(1);
    }

    // Ensure authtoken is set, then pass it to connect to avoid config issues
    await ngrok.authtoken(token);
    const url = await ngrok.connect({ authtoken: token, proto: 'https', addr: port });

    const outPath = '.tmp/ngrok_url.txt';
    try { fs.mkdirSync('.tmp'); } catch (e) {}
    fs.writeFileSync(outPath, url, 'utf8');

    console.log('ngrok tunnel started at', url);
    console.log('URL written to', outPath);

    // keep process alive
    process.stdin.resume();
  } catch (err) {
    console.error('Failed to start ngrok:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
