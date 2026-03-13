#!/usr/bin/env node
console.error(
  [
    'scripts/start_tunnel.js is deprecated and has been disabled.',
    'The previous localtunnel dependency was removed for security reasons.',
    'Use `node scripts/start_ngrok.js <NGROK_AUTHTOKEN> [port]` instead.',
  ].join(' ')
);
process.exit(1);
