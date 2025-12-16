#!/usr/bin/env node
// Script to apply migration 010 via Supabase Admin client
require('dotenv').config({ path: '.env.local' });

async function main() {
  const { supabaseAdmin } = require('../lib/supabaseAdmin');
  const fs = require('fs');
  const path = require('path');

  console.log('[Migration 010] Starting migration to add owner_id column...');

  // Read the migration SQL
  const migrationPath = path.join(__dirname, '..', 'migrations', '010_add_owner_id_to_projects.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  try {
    // Execute the migration using raw SQL through Supabase
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('[Migration 010] Error:', error);

      // Try alternative approach: use individual statements
      console.log('[Migration 010] Trying alternative approach with individual checks...');

      // Check if owner_id column exists
      const { data: columns } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'projects')
        .eq('column_name', 'owner_id');

      if (!columns || columns.length === 0) {
        console.log('[Migration 010] owner_id column does not exist, manual intervention needed');
        console.log('[Migration 010] Please run this SQL manually in Supabase SQL Editor:');
        console.log('\n' + sql + '\n');
        process.exit(1);
      } else {
        console.log('[Migration 010] owner_id column already exists!');
      }
    } else {
      console.log('[Migration 010] Migration applied successfully!', data);
    }
  } catch (e) {
    console.error('[Migration 010] Exception:', e);
    console.log('\n[Migration 010] Please run this SQL manually in Supabase SQL Editor:');
    console.log('\n' + sql + '\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
