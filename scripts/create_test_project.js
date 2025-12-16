#!/usr/bin/env node
// Create a test project for velvetpianomusic
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });

async function main() {
  const { supabaseAdmin } = require('../lib/supabaseAdmin');

  const userId = '519c4346-cc31-439a-b01e-937660df8f5a'; // velvetpianomusic
  const teamId = '468da997-1523-4d84-9916-6b3d30ce5613'; // Their "My Workspace" team

  console.log('[create] Creating test project for velvetpianomusic...');
  console.log('[create] User ID:', userId);
  console.log('[create] Team ID:', teamId);

  try {
    // Create a new project
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert({
        name: 'Test Project for Velvet',
        description: 'Test project created via admin script',
        team_id: teamId,
        owner_id: userId
      })
      .select()
      .single();

    if (projectError) {
      console.error('[create] Error creating project:', projectError);
      process.exit(1);
    }

    console.log('[create] ✅ Project created successfully!');
    console.log('[create] Project ID:', project.id);
    console.log('[create] Project Name:', project.name);

    // Add user to project_members as owner
    const { error: memberError } = await supabaseAdmin
      .from('project_members')
      .insert({
        project_id: project.id,
        member_id: userId,
        role: 'owner',
        added_by: userId
      });

    if (memberError) {
      console.warn('[create] Warning adding to project_members:', memberError);
    } else {
      console.log('[create] ✅ Added user to project_members as owner');
    }

    console.log('\n[create] Now checking if user can see this project...');

    // Verify the project is visible
    const { data: userProjects, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('owner_id', userId);

    if (fetchError) {
      console.error('[create] Error fetching user projects:', fetchError);
    } else {
      console.log(`[create] User now has ${userProjects.length} projects:`);
      userProjects.forEach((p, idx) => {
        console.log(`  [${idx + 1}] ${p.name} (${p.id})`);
      });
    }

  } catch (e) {
    console.error('[create] Exception:', e.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
