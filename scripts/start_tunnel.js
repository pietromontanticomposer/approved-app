#!/usr/bin/env node
const fs = require('fs');

(async () => {
  try {
    const localtunnel = require('localtunnel');
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    const subdomain = process.argv[2] || undefined;
    const tunnel = await localtunnel({ port, subdomain });

    const outPath = '.tmp/tunnel_url.txt';
    try { fs.mkdirSync('.tmp'); } catch (e) {}
    fs.writeFileSync(outPath, tunnel.url, 'utf8');

    console.log('Tunnel started at', tunnel.url);
    console.log('URL written to', outPath);

    tunnel.on('close', () => {
      console.log('Tunnel closed');
    });

    // keep process alive
  } catch (err) {
    console.error('Failed to start tunnel:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
