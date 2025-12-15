// scripts/test_share_flow.js
// Run with: APP_ALLOW_FAKE_SUPABASE=1 node scripts/test_share_flow.js

require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });

async function main() {
  console.log('[test-js] Starting share flow test (fake supabase)');
  console.log('[test-js] APP_ALLOW_FAKE_SUPABASE=', process.env.APP_ALLOW_FAKE_SUPABASE);

  const shareModule = require('../app/api/projects/share/route');
  const detailsModule = require('../app/api/share/details/route');
  const redeemModule = require('../app/api/share/redeem/route');
  const projectsModule = require('../app/api/projects/route');

  const createShare = shareModule.POST;
  const detailsGet = detailsModule.GET;
  const redeemPost = redeemModule.POST;

  // Create a real project via server route so share creation has a valid project
  const createProjectReq = new Request('http://localhost/api/projects', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'E2E Test Project', team_id: 'auto' })
  });
  const projectResp = await projectsModule.POST(createProjectReq);
  const projectBody = await projectResp.json();
  if (!projectResp.ok) {
    console.error('[test-js] project create failed', projectBody);
    return;
  }
  const projectId = projectBody?.project?.id || projectBody?.id || null;
  if (!projectId) {
    console.error('[test-js] could not get project id', projectBody);
    return;
  }
  // Ensure we have a valid actor who is owner/manage on the project
  const { supabaseAdmin } = require('../lib/supabaseAdmin');
  const teamId = projectBody?.project?.team_id || projectBody?.team_id || null;
  let ownerActorId = null;
  if (teamId) {
    const tm = await supabaseAdmin.from('team_members').select('user_id,role').eq('team_id', teamId).eq('role', 'owner').maybeSingle();
    ownerActorId = tm?.data?.user_id || null;
  }
  // Fallback: if no team owner found, create a membership row with a random actor id (may be string)
  if (!ownerActorId) {
    ownerActorId = 'test-owner-1';
    await supabaseAdmin.from('project_members').insert({ project_id: projectId, member_id: ownerActorId, role: 'owner', added_by: null }).select();
  } else {
    // make sure project_members contains the owner with owner role
    await supabaseAdmin.from('project_members').upsert({ project_id: projectId, member_id: ownerActorId, role: 'owner', added_by: ownerActorId }, { onConflict: '(project_id, member_id)' });
  }

  const createReq = new Request('http://localhost/api/projects/share', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-actor-id': ownerActorId },
    body: JSON.stringify({ project_id: projectId })
  });

  const createResp = await createShare(createReq);
  const createBody = await createResp.json();
  if (!createResp.ok) { console.error('[test-js] create failed', createBody); return; }
  const shareId = createBody.id;
  // extract token from returned link but do NOT print it
  const link = createBody.link || '';
  const m = /\?token=(.+)$/.exec(link);
  const token = m ? decodeURIComponent(m[1]) : null;
  if (!token) { console.error('[test-js] could not extract token'); return; }

  // Call details route with the token (do not log token)
  const detailsUrl = `http://localhost/api/share/details?share_id=${encodeURIComponent(shareId)}&token=${encodeURIComponent(token)}`;
  const detailsReq = new Request(detailsUrl, { method: 'GET' });
  const detailsResp = await detailsGet(detailsReq);
  const detailsBody = await detailsResp.json();
  if (!detailsResp.ok) { console.error('[test-js] details failed', detailsBody); return; }
  console.log('[test-js] details OK:', { share_id: detailsBody.share_id, project_id: detailsBody.project_id, role: detailsBody.role });

  // Redeem as a test user - reuse ownerActorId (valid uuid) to avoid UUID type errors
  const testUser = ownerActorId || 'redeemer-1';
  const redeemReq = new Request('http://localhost/api/share/redeem', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-actor-id': testUser },
    body: JSON.stringify({ share_id: shareId, token })
  });
  const redeemResp = await redeemPost(redeemReq);
  const redeemBody = await redeemResp.json();
  if (!redeemResp.ok) { console.error('[test-js] redeem failed', redeemBody); return; }
  console.log('[test-js] redeem OK:', { project_id: redeemBody.project_id });

  // Verify project_members now contains redeemer
  const pmCheck = await supabaseAdmin.from('project_members').select('*').eq('project_id', projectId).eq('member_id', testUser).maybeSingle();
  console.log('[test-js] project_members check:', !!pmCheck?.data);

  // done
}

main().catch(err => { console.error(err); process.exit(1); });
