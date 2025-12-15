import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing env for supabase');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  try {
    const projectRes = await supabase.from('projects').select('id').limit(1).single();
    if (projectRes.error) throw projectRes.error;
    const projectId = projectRes.data?.id;
    if (!projectId) {
      console.error('No project found to attach share link to');
      process.exit(1);
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const insert = {
      project_id: projectId,
      role: 'view',
      token_hash: tokenHash,
      created_by: null,
      expires_at: null,
      max_uses: null
    };

    const { data, error } = await supabase.from('share_links').insert(insert).select().single();
    if (error) {
      console.error('Insert error:', error);
      process.exit(1);
    }
    console.log('Created share link id:', data.id);
    console.log('Token (use to redeem):', token);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

run();
