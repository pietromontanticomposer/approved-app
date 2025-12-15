// scripts/list_users_by_email.js
// Usage: node scripts/list_users_by_email.js email@example.com

require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });

async function main() {
  const { supabaseAdmin } = require('../lib/supabaseAdmin');
  const email = process.argv[2];
  if (!email) { console.error('Usage: node scripts/list_users_by_email.js <email>'); process.exit(1); }
  console.log('[list] Searching admin auth for email:', email);
  try {
    if (!supabaseAdmin.auth || !supabaseAdmin.auth.admin) {
      console.error('[list] supabaseAdmin.auth.admin not available on this client');
      process.exit(2);
    }
    const res = await supabaseAdmin.auth.admin.listUsers({ search: email });
    if (res.error) {
      console.error('[list] error:', res.error);
      process.exit(1);
    }
    const users = res.data?.users || [];
    console.log('[list] found users:', users.length);
    for (const u of users) {
      console.log('---');
      console.log('id:', u.id);
      console.log('email:', u.email);
      console.log('phone:', u.phone);
      console.log('app_metadata:', JSON.stringify(u.app_metadata));
      console.log('user_metadata:', JSON.stringify(u.user_metadata));
      console.log('created_at:', u.created_at);
    }
    console.log('--- done');
  } catch (e) {
    console.error('[list] Error calling admin.listUsers', e);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
