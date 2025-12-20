const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://waaigankcctijalvlppk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYWlnYW5rY2N0aWphbHZscHBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg3NTM2MiwiZXhwIjoyMDgwNDUxMzYyfQ.GKUAOdwSj848GAglftc2NtSbKJct3aEAA04Vocu8P5g';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function canAccessProject(userId, projectId) {
  try {
    console.log(`\nChecking if user ${userId} can access project ${projectId}...\n`);

    // Check if user owns the project
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('owner_id, team_id')
      .eq('id', projectId)
      .single();

    console.log('1. Project query result:');
    console.log('  - project:', project);
    console.log('  - error:', projectError);

    if (projectError || !project) {
      console.log('  ❌ Project not found or error');
      return false;
    }

    // User is owner
    console.log('\n2. Checking if user is owner:');
    console.log('  - project.owner_id:', project.owner_id);
    console.log('  - userId:', userId);
    console.log('  - Match?', project.owner_id === userId);

    if (project.owner_id === userId) {
      console.log('  ✅ User is owner - ACCESS GRANTED');
      return true;
    }

    // Check if user is in project_members
    console.log('\n3. Checking project_members table:');
    const { data: member, error: memberError } = await supabaseAdmin
      .from('project_members')
      .select('member_id')
      .eq('project_id', projectId)
      .eq('member_id', userId)
      .maybeSingle();

    console.log('  - member:', member);
    console.log('  - error:', memberError);
    console.log('  - Has member?', !!member);

    if (member) {
      console.log('  ✅ User is in project_members - ACCESS GRANTED');
      return true;
    }

    // Check if user is in team
    console.log('\n4. Checking team membership:');
    console.log('  - project.team_id:', project.team_id);

    if (project.team_id) {
      const { data: teamMember, error: teamError } = await supabaseAdmin
        .from('team_members')
        .select('user_id')
        .eq('team_id', project.team_id)
        .eq('user_id', userId)
        .maybeSingle();

      console.log('  - teamMember:', teamMember);
      console.log('  - error:', teamError);
      console.log('  - Has team member?', !!teamMember);

      if (teamMember) {
        console.log('  ✅ User is in team - ACCESS GRANTED');
        return true;
      }
    } else {
      console.log('  - No team_id on project');
    }

    console.log('\n❌ ACCESS DENIED - User does not have access to this project');
    return false;
  } catch (err) {
    console.error('Error checking project access:', err);
    return false;
  }
}

async function test() {
  const userId = '519c4346-cc31-439a-b01e-937660df8f5a'; // velvetpianomusic@gmail.com
  const projectId = 'e7b071cb-2a95-488c-afac-70fc44af8104'; // Dio Ladro

  const result = await canAccessProject(userId, projectId);

  console.log('\n' + '='.repeat(60));
  console.log('FINAL RESULT:', result ? '✅ ACCESS GRANTED' : '❌ ACCESS DENIED');
  console.log('='.repeat(60));
}

test().catch(console.error);
