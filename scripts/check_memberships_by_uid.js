// scripts/check_memberships_by_uid.js
// Usage: node scripts/check_memberships_by_uid.js <user_id>

require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });

async function main() {
  const { supabaseAdmin } = require('../lib/supabaseAdmin');
  const uid = process.argv[2];
  if (!uid) { console.error('Usage: node scripts/check_memberships_by_uid.js <user_id>'); process.exit(1); }
  console.log('[checkuid] Checking memberships for user id:', uid);

  const { data: pm, error: pmErr } = await supabaseAdmin.from('project_members').select('*').or(`member_id.eq.${uid},member_id.eq.${uid}`);
  if (pmErr) console.error('[checkuid] project_members error:', pmErr);
  console.log('[checkuid] project_members rows:', (pm||[]).length);
  if (pm && pm.length) console.dir(pm, { depth: 2 });

  const { data: tm, error: tmErr } = await supabaseAdmin.from('team_members').select('*').eq('user_id', uid);
  if (tmErr) console.error('[checkuid] team_members error:', tmErr);
  console.log('[checkuid] team_members rows:', (tm||[]).length);
  if (tm && tm.length) console.dir(tm, { depth: 2 });

  const { data: owned, error: ownErr } = await supabaseAdmin.from('projects').select('*').eq('owner_id', uid);
  if (ownErr) console.error('[checkuid] projects(owner) error:', ownErr);
  console.log('[checkuid] owned projects count:', (owned||[]).length);
  if (owned && owned.length) console.dir(owned.map(p=>({id:p.id,name:p.name})), { depth: 2 });

  // Check target project 'Dio Ladro'
  const target = 'e7b071cb-2a95-488c-afac-70fc44af8104';
  const { data: targetProj } = await supabaseAdmin.from('projects').select('*').eq('id', target).limit(1).maybeSingle?.() || {};
  console.log('[checkuid] target project found:', !!targetProj, targetProj?.name || '');
  const { data: targetPm } = await supabaseAdmin.from('project_members').select('*').eq('project_id', target);
  console.log('[checkuid] project_members for target project:', (targetPm||[]).length);
  if (targetPm && targetPm.length) console.dir(targetPm, { depth: 2 });
}

main().catch(e => { console.error(e); process.exit(1); });
