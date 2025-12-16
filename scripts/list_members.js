const { supabaseAdmin } = require('../lib/supabaseAdmin');
(async () => {
  try {
    const { data: pm, error: pmErr } = await supabaseAdmin.from('project_members').select('*');
    console.log('project_members:', pmErr ? 'ERROR: '+pmErr.message : (pm || []).length);
    if (pm && pm.length) console.log(pm.slice(0,20));

    const { data: tm, error: tmErr } = await supabaseAdmin.from('team_members').select('*');
    console.log('team_members:', tmErr ? 'ERROR: '+tmErr.message : (tm || []).length);
    if (tm && tm.length) console.log(tm.slice(0,20));

    const { data: inv, error: invErr } = await supabaseAdmin.from('invites').select('*').order('created_at', { ascending: false }).limit(20);
    console.log('invites:', invErr ? 'ERROR: '+invErr.message : (inv || []).length);
    if (inv && inv.length) console.log(inv.slice(0,20));
  } catch (e) { console.error(e); process.exit(1); }
})();
