// scripts/inspect_project.js
// Usage: DOTENV_CONFIG_PATH=.env.local node scripts/inspect_project.js

require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(url, key);

(async function(){
  try {
    const { data: projects, error: pErr } = await supabase.from('projects').select('*').ilike('name', 'dio ladro').limit(10);
    if (pErr) { console.error('projects err', pErr); process.exit(1); }
    if (!projects || projects.length === 0) {
      console.log('No projects named "Dio Ladro" found');
      return;
    }
    console.log('Found projects:', projects.map(p=>({id:p.id,name:p.name,owner_id:p.owner_id,team_id:p.team_id})));
    const proj = projects[0];
    const { data: pm, error: pmErr } = await supabase.from('project_members').select('*').eq('project_id', proj.id);
    if (pmErr) { console.error('pmErr', pmErr); return; }
    console.log('project_members:', pm);

    // list team members for the project.team_id
    if (proj.team_id) {
      const { data: tm, error: tmErr } = await supabase.from('team_members').select('*').eq('team_id', proj.team_id);
      if (tmErr) console.error('tmErr', tmErr);
      else console.log('team_members:', tm);
    }

    // Try to lookup auth user rows for each member id
    const ids = pm.map(r=>r.member_id).filter(Boolean);
    if (ids.length) {
      const { data: users, error: uErr } = await supabase.from('users').select('id,email,display_name').in('id', ids);
      if (uErr) console.error('users err', uErr);
      else console.log('users table rows for members:', users);

      // Also try auth.users via REST using auth schema
      try {
        const { data: authUsers, error: auErr } = await supabase.rpc('','');
      } catch (e) {}
    }
  } catch (e) {
    console.error(e);
  }
})();
