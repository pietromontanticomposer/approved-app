#!/usr/bin/env node
// List all users in auth.users
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });

async function main() {
  const { supabaseAdmin } = require('../lib/supabaseAdmin');

  console.log('[list_users] Fetching all users from auth...');

  try {
    // List users using auth admin API
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('[list_users] Error:', error);
      process.exit(1);
    }

    console.log(`[list_users] Found ${data.users.length} users:`);
    data.users.forEach((user, idx) => {
      console.log(`\n[${idx + 1}] ID: ${user.id}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Created: ${user.created_at}`);
      console.log(`    Last sign in: ${user.last_sign_in_at || 'never'}`);
    });
  } catch (e) {
    console.error('[list_users] Exception:', e.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
