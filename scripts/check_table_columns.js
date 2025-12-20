const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://waaigankcctijalvlppk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYWlnYW5rY2N0aWphbHZscHBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg3NTM2MiwiZXhwIjoyMDgwNDUxMzYyfQ.GKUAOdwSj848GAglftc2NtSbKJct3aEAA04Vocu8P5g';

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
