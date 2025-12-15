#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { Client } = require('pg');

const sqlPath = process.argv[2] || 'migrations/005_invite_functions.sql';
const sql = fs.readFileSync(sqlPath, 'utf8');

const connection = process.env.SUPABASE_DB_URL;
if (!connection) {
  console.error('SUPABASE_DB_URL missing in env');
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: connection });
  try {
    await client.connect();
    console.log('Connected to DB, executing SQL...');
    await client.query(sql);
    console.log('SQL executed successfully');
  } catch (err) {
    console.error('Error executing SQL:', err.message || err);
    process.exit(2);
  } finally {
    await client.end();
  }
})();
