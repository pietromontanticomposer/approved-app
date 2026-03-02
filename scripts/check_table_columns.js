const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTables() {
  const projectId = 'e7b071cb-2a95-488c-afac-70fc44af8104';
  const userId = '519c4346-cc31-439a-b01e-937660df8f5a';

  // Check project_members
  console.log('project_members table:');
  const { data: pm, error: pmErr } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .limit(1);

  if (pmErr) {
    console.error('  Error:', pmErr.message);
  } else if (pm && pm.length > 0) {
    console.log('  Columns:', Object.keys(pm[0]));
    console.log('  Sample row:', pm[0]);
  } else {
    console.log('  No rows found');
  }

  console.log('');

  // Check team_members
  console.log('team_members table:');
  const teamId = 'cb1a651e-6240-4d49-8f68-fe1b2beae2b8';
  const { data: tm, error: tmErr } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .limit(1);

  if (tmErr) {
    console.error('  Error:', tmErr.message);
  } else if (tm && tm.length > 0) {
    console.log('  Columns:', Object.keys(tm[0]));
    console.log('  Sample row:', tm[0]);
  } else {
    console.log('  No rows found');
  }
}

checkTables().catch(console.error);
