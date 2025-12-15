// scripts/search_email_everywhere.js
// Usage: node scripts/search_email_everywhere.js email@example.com

require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });

async function main() {
  const { supabaseAdmin } = require('../lib/supabaseAdmin');
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/search_email_everywhere.js <email>');
    process.exit(1);
  }
  console.log('[search] Searching for email:', email);

  // Postgrest doesn't expose arbitrary SQL by default; use a list of likely tables/columns
  // Try a safer approach: known candidate tables
  const candidates = [
    { table: 'auth.users', column: 'email' },
    { table: 'users', column: 'email' },
    { table: 'profiles', column: 'email' },
    { table: 'invites', column: 'email' },
    { table: 'share_links', column: 'email' },
    { table: 'project_members', column: 'member_email' },
  ];

  for (const c of candidates) {
    try {
      const { data, error } = await supabaseAdmin.from(c.table).select(`${c.column}`).ilike(c.column, `%${email}%`).limit(5);
      if (!error && data && data.length) {
        console.log('[found] table:', c.table, 'column:', c.column, 'rows:', data.length);
        console.dir(data.slice(0, 5), { depth: 2 });
      }
    } catch (e) {
      // ignore
    }
  }

  console.log('[search] Done. If nothing found, user may be in auth with different provider id or different email casing.');
}

main().catch(e => { console.error(e); process.exit(1); });
