#!/usr/bin/env node
// scripts/apply_migration_node.js
// Applies a single SQL migration file to the DB using pg and .env.local

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { Client } = require('pg');

async function run() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL not set in .env.local');
    process.exit(1);
  }

  const sql = fs.readFileSync('migrations/005_invite_functions.sql', 'utf8');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    console.log('Applying migration 005_invite_functions.sql...');
    await client.query(sql);
    console.log('Migration applied successfully');
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exit(2);
  } finally {
    await client.end();
  }
}

run().catch(err => {
  console.error('Error running migration script', err);
  process.exit(99);
});
