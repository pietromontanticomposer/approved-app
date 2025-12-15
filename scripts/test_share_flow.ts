// scripts/test_share_flow.ts
// Run with: APP_ALLOW_FAKE_SUPABASE=1 npx ts-node scripts/test_share_flow.ts

import { POST as createShare } from '@/app/api/projects/share/route';
import { GET as detailsGet } from '@/app/api/share/details/route';
import { POST as redeemPost } from '@/app/api/share/redeem/route';

async function run() {
  console.log('[test] Starting share flow test (fake supabase)');

  // 1) Create a share link for project p1 as owner-1
  const createReq = new Request('http://localhost/api/projects/share', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-actor-id': 'owner-1'
    },
    body: JSON.stringify({ project_id: 'p1' })
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

  // 3) Redeem as user 'user-1' (not owner)
  const redeemReq = new Request('http://localhost/api/share/redeem', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-actor-id': 'user-1'
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
    const pm = await supabaseAdmin.from('project_members').select('*').eq('project_id', 'p1').maybeSingle();
    console.log('[test] project_members sample:', pm.data || pm);
  } else {
    console.error('[test] Redeem failed');
  }
}

run().catch(err => { console.error('[test] error', err); process.exit(1); });
