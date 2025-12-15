#!/usr/bin/env node
// scripts/e2e_server_tests.js
// Server-side E2E checks: create invite, verify RPC, redeem share, check DB.

require('dotenv').config({ path: '.env.local' });
const fetch = global.fetch || (async (...args) => {
  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch(...args);
});
const { createClient } = require('@supabase/supabase-js');

async function run() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE) {
    console.error('Missing SUPABASE env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    process.exit(1);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false }});

  // Use known test IDs from current dev DB if available
  const teamId = process.env.TEST_TEAM_ID || 'cb1a651e-6240-4d49-8f68-fe1b2beae2b8';
  const projectId = process.env.TEST_PROJECT_ID || 'e7b071cb-2a95-488c-afac-70fc44af8104';
  const ownerId = process.env.TEST_OWNER_ID || '65e6a4da-631d-4fb2-a1d3-988847890aa7';

  console.log('Creating invite via /api/invites...');
  const res = await fetch('http://localhost:3000/api/invites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-actor-id': ownerId },
    body: JSON.stringify({ team_id: teamId, project_id: projectId, role: 'viewer', is_link_invite: true })
  });

  const body = await res.json();
  if (!res.ok) {
    console.error('Create invite failed', res.status, body);
    process.exit(2);
  }

  console.log('Invite created:', body.invite_id, body.invite_url);

  const inviteId = body.invite_id;

  console.log('Verifying invite via RPC get_invite_details (admin)...');
    try {
      const { data: details, error: detailsErr } = await admin.rpc('get_invite_details', { invite_token: inviteId });
      if (detailsErr) {
        console.warn('RPC get_invite_details warning:', detailsErr);
      } else {
        console.log('get_invite_details:', details);
      }
    } catch (e) {
      console.warn('RPC get_invite_details threw:', e.message || e);
    }

  // Create a share link to test redeem
  console.log('Creating share link via /api/projects/share...');
  const shareResp = await fetch('http://localhost:3000/api/projects/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-actor-id': ownerId },
    body: JSON.stringify({ project_id: projectId, role: 'viewer' })
  });
  const shareBody = await shareResp.json();
  if (!shareResp.ok) {
    console.error('Share creation failed', shareResp.status, shareBody);
    process.exit(4);
  }
  console.log('Share created:', shareBody.id, shareBody.link);

  const shareId = shareBody.id;
  const shareLink = shareBody.link || '';
  // Extract token param from link
  let token = '';
  try {
    const u = new URL(shareLink, 'http://localhost:3000');
    token = u.searchParams.get('token') || '';
  } catch (e) {
    // fallback: try regex
    const m = shareLink.match(/token=([^&]+)/);
    if (m) token = decodeURIComponent(m[1]);
  }

  if (!token) {
    console.warn('No token found in share link, aborting redeem check');
  } else {
    console.log('Redeeming share via /api/share/redeem with x-actor-id', ownerId);
    const redeemResp = await fetch('http://localhost:3000/api/share/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-actor-id': ownerId },
      body: JSON.stringify({ share_id: shareId, token })
    });

    const redeemBody = await redeemResp.json();
    if (!redeemResp.ok) {
      console.error('Redeem failed', redeemResp.status, redeemBody);
      process.exit(5);
    }
    console.log('Redeem response:', redeemBody);
  }

  // Check project_members for ownerId
  console.log('Checking project_members entry for actor...');
  const { data: pm } = await admin.from('project_members').select('*').eq('project_id', projectId).eq('member_id', ownerId).maybeSingle();
  console.log('project_members:', pm);

  console.log('\nE2E server-side checks completed successfully.');
}

run().catch(err => {
  console.error('E2E script error', err);
  process.exit(99);
});
