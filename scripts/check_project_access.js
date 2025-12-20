const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://waaigankcctijalvlppk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYWlnYW5rY2N0aWphbHZscHBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg3NTM2MiwiZXhwIjoyMDgwNDUxMzYyfQ.GKUAOdwSj848GAglftc2NtSbKJct3aEAA04Vocu8P5g';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkProjectAccess() {
  const projectId = 'e7b071cb-2a95-488c-afac-70fc44af8104';
  const email = 'velvetpianomusic@gmail.com';

  console.log('Checking access for:');
  console.log('  Project:', projectId);
  console.log('  User:', email);
  console.log('');

  // Get user ID from email
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('Error listing users:', userError);
    return;
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    console.error('User not found:', email);
    return;
  }

  const userId = user.id;
  console.log('User ID:', userId);
  console.log('');

  // Check project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, owner_id, team_id, created_at')
    .eq('id', projectId)
    .single();

  if (projectError) {
    console.error('Error fetching project:', projectError);
    return;
  }

  if (!project) {
    console.error('Project not found:', projectId);
    return;
  }

  console.log('Project found:');
  console.log('  Name:', project.name);
  console.log('  Owner ID:', project.owner_id);
  console.log('  Team ID:', project.team_id);
  console.log('  Created:', project.created_at);
  console.log('');

  // Check if user is owner
  const isOwner = project.owner_id === userId;
  console.log('Is owner?', isOwner);
  console.log('');

  // Check project_members
  const { data: projectMembers, error: pmError } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId);

  console.log('Project members:', projectMembers?.length || 0);
  if (projectMembers && projectMembers.length > 0) {
    projectMembers.forEach(pm => {
      console.log('  - member_id:', pm.member_id, pm.member_id === userId ? '(THIS USER)' : '');
    });
  }
  console.log('');

  // Check team_members if project has a team
  if (project.team_id) {
    const { data: teamMembers, error: tmError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', project.team_id);

    console.log('Team members:', teamMembers?.length || 0);
    if (teamMembers && teamMembers.length > 0) {
      teamMembers.forEach(tm => {
        console.log('  - user_id:', tm.user_id, 'role:', tm.role, tm.user_id === userId ? '(THIS USER)' : '');
      });
    }
  } else {
    console.log('Project has no team_id');
  }
  console.log('');

  // Check cues
  const { data: cues, error: cuesError } = await supabase
    .from('cues')
    .select('id, name, project_id')
    .eq('project_id', projectId);

  console.log('Cues in project:', cues?.length || 0);
  if (cues && cues.length > 0) {
    cues.forEach(cue => {
      console.log('  -', cue.name || cue.id);
    });
  }
  console.log('');

  // Summary
  console.log('=== ACCESS SUMMARY ===');
  console.log('User has access?', isOwner || (projectMembers && projectMembers.some(pm => pm.member_id === userId)));
  console.log('Reason: ', isOwner ? 'User is owner' : 'Check project_members and team_members above');
}

checkProjectAccess().catch(console.error);
