#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE env vars in .env.local');
  process.exit(1);
}
const admin = createClient(url, key, { auth: { persistSession: false } });
(async () => {
  try {
    const { data: pm, error: pmErr } = await admin.from('project_members').select('*');
    console.log('project_members count:', pmErr ? 'ERROR: '+pmErr.message : (pm || []).length);
    if (pm && pm.length) console.dir(pm.slice(0,50), { depth: 2 });

    const { data: tm, error: tmErr } = await admin.from('team_members').select('*');
    console.log('team_members count:', tmErr ? 'ERROR: '+tmErr.message : (tm || []).length);
    if (tm && tm.length) console.dir(tm.slice(0,50), { depth: 2 });

    const { data: inv, error: invErr } = await admin.from('invites').select('*').order('created_at', { ascending: false }).limit(50);
    console.log('invites count:', invErr ? 'ERROR: '+invErr.message : (inv || []).length);
    if (inv && inv.length) console.dir(inv.slice(0,50), { depth: 2 });
  } catch (e) { console.error(e); process.exit(1); }
  process.exit(0);
})();
