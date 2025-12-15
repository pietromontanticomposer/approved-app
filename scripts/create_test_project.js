// scripts/create_test_project.js
// Usage: source .env.local && node scripts/create_test_project.js

(async () => {
  try {
    require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });
    const { supabaseAdmin } = require('../lib/supabaseAdmin');
    const project = {
      id: 'p1',
      team_id: 't1',
      owner_id: 'owner-1',
      name: 'Test Project'
    };

    const res = await supabaseAdmin.from('projects').insert(project).select();
    console.log('[create-project] inserted', Array.isArray(res.data) ? res.data[0]?.id : res.data);
  } catch (e) {
    console.error('[create-project] error', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
