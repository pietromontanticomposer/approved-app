#!/usr/bin/env node
// Check projects for a specific user
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });

async function main() {
  const { supabaseAdmin } = require('../lib/supabaseAdmin');

  const userId = process.argv[2] || '519c4346-cc31-439a-b01e-937660df8f5a'; // velvetpianomusic
  console.log('[check] Checking projects for user ID:', userId);

  try {
    // 1. My projects (where owner_id = userId)
    const { data: myProjects, error: myErr } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('owner_id', userId);

    if (myErr) {
      console.error('[check] Error loading my projects:', myErr);
    } else {
      console.log(`\n[check] MY PROJECTS (${myProjects.length}):`);
      myProjects.forEach((p, idx) => {
        console.log(`  [${idx + 1}] ${p.name} (${p.id})`);
        console.log(`      Team: ${p.team_id || 'none'}`);
        console.log(`      Created: ${p.created_at}`);
      });
    }

    // 2. Projects shared via project_members
    const { data: pmRows, error: pmErr } = await supabaseAdmin
      .from('project_members')
      .select('project_id, role')
      .eq('member_id', userId);

    if (pmErr) {
      console.error('[check] Error loading project_members:', pmErr);
    } else {
      console.log(`\n[check] PROJECT_MEMBERS (${pmRows.length}):`);
      if (pmRows.length > 0) {
        const projectIds = pmRows.map(r => r.project_id);
        const { data: sharedProjects } = await supabaseAdmin
          .from('projects')
          .select('*')
          .in('id', projectIds);

        sharedProjects.forEach((p, idx) => {
          const role = pmRows.find(r => r.project_id === p.id)?.role;
          console.log(`  [${idx + 1}] ${p.name} (${p.id}) - Role: ${role}`);
        });
      }
    }

    // 3. Teams
    const { data: tmRows, error: tmErr } = await supabaseAdmin
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', userId);

    if (tmErr) {
      console.error('[check] Error loading team_members:', tmErr);
    } else {
      console.log(`\n[check] TEAM_MEMBERS (${tmRows.length}):`);
      if (tmRows.length > 0) {
        for (const tm of tmRows) {
          const { data: team } = await supabaseAdmin
            .from('teams')
            .select('id, name')
            .eq('id', tm.team_id)
            .single();

          console.log(`  Team: ${team?.name || 'Unknown'} (${tm.team_id}) - Role: ${tm.role}`);

          // Projects in this team
          const { data: teamProjects } = await supabaseAdmin
            .from('projects')
            .select('id, name')
            .eq('team_id', tm.team_id);

          if (teamProjects && teamProjects.length > 0) {
            console.log(`    Projects in team:`);
            teamProjects.forEach((p, idx) => {
              console.log(`      [${idx + 1}] ${p.name} (${p.id})`);
            });
          }
        }
      } else {
        console.log('  No teams found');
      }
    }

  } catch (e) {
    console.error('[check] Exception:', e.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
