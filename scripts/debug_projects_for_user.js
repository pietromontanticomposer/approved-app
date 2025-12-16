require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });
(async function(){
  const { supabaseAdmin } = require('../lib/supabaseAdmin');
  const actorId = process.argv[2] || '519c4346-cc31-439a-b01e-937660df8f5a';
  console.log('actorId:', actorId);
  const { data: myProjects } = await supabaseAdmin.from('projects').select('*').eq('owner_id', actorId).order('created_at', { ascending: false });
  console.log('myProjects count:', (myProjects||[]).length);
  const { data: pmRows } = await supabaseAdmin.from('project_members').select('project_id,role').eq('member_id', actorId);
  console.log('project_members rows:', pmRows);
  const { data: tmRows } = await supabaseAdmin.from('team_members').select('team_id').eq('user_id', actorId);
  console.log('team_members:', tmRows);
  const teamIds = (tmRows||[]).map(t=>t.team_id).filter(Boolean);
  let projectIdsFromTeams = [];
  if (teamIds.length){
    const { data: projectsFromTeams } = await supabaseAdmin.from('projects').select('id').in('team_id', teamIds);
    projectIdsFromTeams = (projectsFromTeams||[]).map(p=>p.id);
  }
  console.log('projectIdsFromTeams:', projectIdsFromTeams);
  const shared = Array.from(new Set([...(pmRows||[]).map(r=>r.project_id), ...projectIdsFromTeams]));
  console.log('sharedIds:', shared);
  if (shared.length){
    const { data: sharedProjects } = await supabaseAdmin.from('projects').select('*').in('id', shared);
    console.log('sharedProjects names:', (sharedProjects||[]).map(p=>p.name));
  }
})();
