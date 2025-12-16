// scripts/e2e_invite_flow.js
// Usage: node scripts/e2e_invite_flow.js
// Requires .env.local in repo root (SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

require('dotenv').config({ path: '.env.local' });
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });

(async function(){
  try {
    const { supabaseAdmin } = require('../lib/supabaseAdmin');
    if (!supabaseAdmin) throw new Error('supabaseAdmin not initialized');

    console.log('[e2e] Looking for a team owner...');
    const m = await supabaseAdmin.from('team_members').select('team_id,user_id').eq('role','owner').limit(1).maybeSingle();
    if (!m || !m.data) throw new Error('No team owner found in DB to run test');
    const team_id = m.data.team_id;
    const owner_id = m.data.user_id;
    console.log('[e2e] Found owner:', owner_id, 'team:', team_id);

    // find a project for that team (optional)
    const pj = await supabaseAdmin.from('projects').select('id').eq('team_id', team_id).limit(1).maybeSingle();
    const project_id = pj?.data?.id || null;
    console.log('[e2e] Using project:', project_id || '<none>');

    // create a link invite via RPC (as owner)
    console.log('[e2e] Creating link invite via create_invite RPC...');
    const rpcCreate = await supabaseAdmin.rpc('create_invite', {
      p_team_id: team_id,
      p_project_id: project_id,
      p_email: null,
      p_role: 'viewer',
      p_is_link_invite: true,
      p_invited_by: owner_id,
      p_expires_in_days: 7
    });

    if (rpcCreate.error) throw rpcCreate.error;
    const inviteId = rpcCreate.data?.invite_id || (rpcCreate?.data && rpcCreate.data.invite_id) || (rpcCreate?.invite_id);
    console.log('[e2e] RPC create_invite result:', rpcCreate.data || rpcCreate);
    if (!inviteId) throw new Error('Could not get invite id from RPC result');

    // fetch the invite row
    const invRow = await supabaseAdmin.from('invites').select('*').eq('id', inviteId).maybeSingle();
    console.log('[e2e] Invite row created:', invRow.data);

    // create a test user via admin API
    const unique = Date.now();
    const testEmail = `e2e-invite-test+${unique}@example.com`;
    const testPassword = 'Password123!';

    console.log('[e2e] Creating test user via admin.createUser:', testEmail);
    if (!supabaseAdmin.auth || !supabaseAdmin.auth.admin) {
      console.warn('[e2e] supabaseAdmin.auth.admin not available; skipping user creation and acceptance test');
      process.exit(0);
    }

    const createRes = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    }).catch(e => ({ error: e }));

    if (createRes.error) throw createRes.error;
    const newUser = createRes.data?.user || createRes.user || createRes.data;
    console.log('[e2e] Created user:', newUser.id, newUser.email);

    // accept the invite as the new user (using admin RPC to simulate action)
    console.log('[e2e] Accepting invite via accept_invite RPC...');
    const acceptRes = await supabaseAdmin.rpc('accept_invite', { invite_token: inviteId, accepting_user_id: newUser.id });
    console.log('[e2e] accept_invite result:', acceptRes.data || acceptRes);
    if (acceptRes.error) throw acceptRes.error;

    // verify team_members contains the new user
    const tm = await supabaseAdmin.from('team_members').select('*').eq('team_id', team_id).eq('user_id', newUser.id).maybeSingle();
    console.log('[e2e] team_members entry for new user:', tm.data);

    if (!tm.data) throw new Error('User was not added to team_members after accepting invite');

    console.log('[e2e] SUCCESS: invite flow worked end-to-end');
    console.log('Invite ID:', inviteId);
    console.log('Test user:', newUser.email, newUser.id);

    // Note: cleanup (delete created user and/or revoke invite) is left to the operator
    process.exit(0);
  } catch (err) {
    console.error('[e2e] ERROR', err);
    process.exit(1);
  }
})();
