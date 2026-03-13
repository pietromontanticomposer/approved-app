// scripts/test_share_flow.js
// Run with: APP_ALLOW_FAKE_SUPABASE=1 node scripts/test_share_flow.js

require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });
require('tsconfig-paths/register');

const Module = require('module');
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'server-only') {
    return {};
  }
  if (
    request === '@/lib/supabaseClient' ||
    request.endsWith('/lib/supabaseClient') ||
    request === './supabaseClient'
  ) {
    return {
      supabase: {
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
        },
      },
      getSupabaseClient: () => ({
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
          getSession: async () => ({ data: { session: null }, error: null }),
        },
      }),
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

async function main() {
  console.log('[test-js] Starting share flow test (fake supabase)');
  console.log('[test-js] APP_ALLOW_FAKE_SUPABASE=', process.env.APP_ALLOW_FAKE_SUPABASE);

  const OWNER_ID = '11111111-1111-4111-8111-111111111111';
  const USER_ID = '22222222-2222-4222-8222-222222222222';
  const PROJECT_ID = '44444444-4444-4444-8444-444444444444';

  const shareModule = require('../app/api/projects/share/route');
  const detailsModule = require('../app/api/share/details/route');
  const redeemModule = require('../app/api/share/redeem/route');

  const createShare = shareModule.POST;
  const detailsGet = detailsModule.GET;
  const redeemPost = redeemModule.POST;

  const createReq = new Request('http://localhost/api/projects/share', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${OWNER_ID}`,
      'x-actor-id': OWNER_ID
    },
    body: JSON.stringify({ project_id: PROJECT_ID })
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

  const forbiddenReq = new Request('http://localhost/api/projects/share', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${USER_ID}`,
      'x-actor-id': USER_ID
    },
    body: JSON.stringify({ project_id: PROJECT_ID })
  });
  const forbiddenResp = await createShare(forbiddenReq);
  const forbiddenBody = await forbiddenResp.json();
  if (forbiddenResp.status !== 403) {
    console.error('[test-js] non-owner share should be forbidden', forbiddenResp.status, forbiddenBody);
    process.exit(1);
  }
  console.log('[test-js] non-owner create correctly forbidden');

  const redeemReq = new Request('http://localhost/api/share/redeem', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${USER_ID}`,
      'x-actor-id': USER_ID
    },
    body: JSON.stringify({ share_id: shareId, token })
  });
  const redeemResp = await redeemPost(redeemReq);
  const redeemBody = await redeemResp.json();
  if (!redeemResp.ok) { console.error('[test-js] redeem failed', redeemBody); return; }
  console.log('[test-js] redeem OK:', { project_id: redeemBody.project_id });

  // Verify project_members now contains redeemer
  const { supabaseAdmin } = require('../lib/supabaseAdmin');
  const pmCheck = await supabaseAdmin.from('project_members').select('*').eq('project_id', PROJECT_ID).eq('member_id', USER_ID).maybeSingle();
  console.log('[test-js] project_members check:', !!pmCheck?.data);

  // done
}

main().catch(err => { console.error(err); process.exit(1); });
