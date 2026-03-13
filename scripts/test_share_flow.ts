// scripts/test_share_flow.ts
// Run with: APP_ALLOW_FAKE_SUPABASE=1 npx ts-node scripts/test_share_flow.ts

import { POST as createShare } from '@/app/api/projects/share/route';
import { GET as detailsGet } from '@/app/api/share/details/route';
import { POST as redeemPost } from '@/app/api/share/redeem/route';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const PROJECT_ID = '44444444-4444-4444-8444-444444444444';

async function run() {
  console.log('[test] Starting share flow test (fake supabase)');

  // 1) Owner can create a share link
  const createReq = new Request('http://localhost/api/projects/share', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${OWNER_ID}`,
      'x-actor-id': OWNER_ID
    },
    body: JSON.stringify({ project_id: PROJECT_ID })
  });

  const createResp:any = await createShare(createReq as any);
  const createBody = await createResp.json();
  console.log('[test] create response:', createBody);
  if (!createResp.ok) {
    console.error('[test] create failed');
    return;
  }

  const link = createBody.link as string;
  const m = /\?token=(.+)$/.exec(link);
  const token = m ? decodeURIComponent(m[1]) : null;
  const shareId = createBody.id;

  if (!token) {
    console.error('[test] could not extract token from link', link);
    return;
  }

  // 2) Fetch details
  const detailsUrl = `http://localhost/api/share/details?share_id=${encodeURIComponent(shareId)}&token=${encodeURIComponent(token)}`;
  const detailsReq = new Request(detailsUrl, { method: 'GET' });
  const detailsResp:any = await detailsGet(detailsReq as any);
  const detailsBody = await detailsResp.json();
  console.log('[test] details response:', detailsBody);

  // 3) Non-owner cannot create a share link
  const forbiddenReq = new Request('http://localhost/api/projects/share', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${USER_ID}`,
      'x-actor-id': USER_ID
    },
    body: JSON.stringify({ project_id: PROJECT_ID })
  });
  const forbiddenResp: any = await createShare(forbiddenReq as any);
  const forbiddenBody = await forbiddenResp.json();
  console.log('[test] non-owner create response:', forbiddenResp.status, forbiddenBody);

  // 4) Redeem as collaborator
  const redeemReq = new Request('http://localhost/api/share/redeem', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${USER_ID}`,
      'x-actor-id': USER_ID
    },
    body: JSON.stringify({ share_id: shareId, token })
  });

  const redeemResp:any = await redeemPost(redeemReq as any);
  const redeemBody = await redeemResp.json();
  console.log('[test] redeem response:', redeemBody);

  if (redeemResp.ok) {
    console.log('[test] Redeem succeeded. Verifying project_members...');
    // Check fake DB via supabaseAdmin (import directly)
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin');
    const pm = await supabaseAdmin.from('project_members').select('*').eq('project_id', PROJECT_ID).eq('member_id', USER_ID).maybeSingle();
    console.log('[test] project_members sample:', pm.data || pm);
  } else {
    console.error('[test] Redeem failed');
  }
}

run().catch(err => { console.error('[test] error', err); process.exit(1); });
