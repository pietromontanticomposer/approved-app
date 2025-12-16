#!/usr/bin/env node
// Apply migration via Supabase Admin API
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });

async function main() {
  const { supabaseAdmin } = require('../lib/supabaseAdmin');

  console.log('[Migration 010] Applying migration to add owner_id column...');

  try {
    // Step 1: Check if column exists
    console.log('[Migration 010] Checking if owner_id column exists...');

    const { data: projects, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('id, owner_id')
      .limit(1);

    if (fetchError) {
      if (fetchError.message.includes('owner_id')) {
        console.log('[Migration 010] Column owner_id does not exist - migration needed');
        console.log('\n⚠️  Cannot apply DDL migrations via API for security reasons.');
        console.log('Please apply this SQL manually in Supabase SQL Editor:\n');
        console.log('1. Go to https://supabase.com/dashboard');
        console.log('2. Select project waaigankcctijalvlppk');
        console.log('3. Go to SQL Editor');
        console.log('4. Paste and run this SQL:\n');

        const fs = require('fs');
        const path = require('path');
        const migrationPath = path.join(__dirname, '..', 'migrations', '010_add_owner_id_to_projects.sql');
        const sql = fs.readFileSync(migrationPath, 'utf-8');
        console.log(sql);
        console.log('\n');
        process.exit(1);
      } else {
        console.error('[Migration 010] Unexpected error:', fetchError);
        process.exit(1);
      }
    } else {
      console.log('[Migration 010] ✅ Column owner_id already exists!');
      console.log('[Migration 010] Sample data:', projects);
    }
  } catch (e) {
    console.error('[Migration 010] Exception:', e.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
