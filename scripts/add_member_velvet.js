require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });
(async function(){
  try {
    const { supabaseAdmin } = require('../lib/supabaseAdmin');
    const project_id = 'e7b071cb-2a95-488c-afac-70fc44af8104';
    const member_id = '519c4346-cc31-439a-b01e-937660df8f5a';
    const added_by = '65e6a4da-631d-4fb2-a1d3-988847890aa7';
    console.log('[add_member] Upserting project_members for', member_id);
    // Some clients expect onConflict as array of column names
    const res = await supabaseAdmin.from('project_members').upsert({ project_id, member_id, role: 'viewer', added_by }, { onConflict: ['project_id','member_id'] });
    console.log('[add_member] result:', res);
  } catch (err) {
    console.error('[add_member] Error', err);
    process.exit(1);
  }
})();
