// scripts/check_projects_for_user.js
// Usage: node scripts/check_projects_for_user.js

require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });

async function main() {
  const { supabaseAdmin } = require('../lib/supabaseAdmin');

  const email = process.argv[2] || 'velvetpianomusic@gmail.com';
  console.log('[check] Looking up user by email:', email);

  // Attempt to find user id in common tables
  let uid = null;
  try {
    const { data: users, error } = await supabaseAdmin.from('users').select('id,email').eq('email', email).limit(1);
    if (!error && users && users.length) uid = users[0].id;
  } catch (e) {
    // ignore
  }

  if (!uid) {
    try {
      const { data: authUsers, error } = await supabaseAdmin.from('auth.users').select('id,email').eq('email', email).limit(1);
      if (!error && authUsers && authUsers.length) uid = authUsers[0].id;
    } catch (e) {
      // ignore
    }
  }

  if (!uid) {
    console.error('[check] Could not find user id for email');
    return;
  }

  console.log('[check] Using user id:', uid);

  // 1) my projects
  const { data: myProjects, error: myErr } = await supabaseAdmin.from('projects').select('*').eq('owner_id', uid).order('created_at', { ascending: false });
  if (myErr) console.error('[check] Error loading my projects:', myErr);
  console.log('[check] my_projects count:', (myProjects || []).length);

  // 2) project_members
  const { data: pmRows, error: pmErr } = await supabaseAdmin.from('project_members').select('project_id, role').eq('member_id', uid);
  if (pmErr) console.error('[check] Error loading project_members:', pmErr);
  const projectIdsFromMembers = (pmRows || []).map(r => r.project_id).filter(Boolean);
  console.log('[check] project_members project ids:', projectIdsFromMembers);

  // 3) team_members -> team ids
  const { data: tmRows, error: tmErr } = await supabaseAdmin.from('team_members').select('team_id').eq('user_id', uid);
  if (tmErr) console.error('[check] Error loading team_members:', tmErr);
  const teamIds = (tmRows || []).map(t => t.team_id).filter(Boolean);
  console.log('[check] team ids:', teamIds);

  let projectIdsFromTeams = [];
  if (teamIds.length) {
    const { data: projectsFromTeams, error: pftErr } = await supabaseAdmin.from('projects').select('id,name').in('team_id', teamIds);
    if (pftErr) console.error('[check] Error loading projects for teams:', pftErr);
    projectIdsFromTeams = (projectsFromTeams || []).map(p => p.id).filter(Boolean);
  }
  console.log('[check] project ids from teams:', projectIdsFromTeams);

  const sharedIdsSet = new Set([...projectIdsFromMembers, ...projectIdsFromTeams]);
  const ownedIds = new Set((myProjects || []).map(p => p.id));
  const finalSharedIds = Array.from(sharedIdsSet).filter(id => !ownedIds.has(id));
  console.log('[check] final shared ids:', finalSharedIds);

  let sharedProjects = [];
  if (finalSharedIds.length) {
    const { data: sp, error: spErr } = await supabaseAdmin.from('projects').select('*').in('id', finalSharedIds);
    if (spErr) console.error('[check] Error loading shared projects:', spErr);
    sharedProjects = sp || [];
  }

  console.log('[check] shared_with_me count:', sharedProjects.length);
  if (sharedProjects.length) console.log('[check] shared_with_me[0].name:', sharedProjects[0].name);
}

main().catch(err => { console.error(err); process.exit(1); });
