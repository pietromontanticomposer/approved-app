import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing env for supabase');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: node scripts/check_share.js <share_id>');
    process.exit(1);
  }

  try {
    const { data, error } = await supabase.from('share_links').select('id,project_id,token_hash,revoked_at,expires_at,created_by,role,projects(name)').eq('id', id).maybeSingle();
    if (error) {
      console.error('Supabase error:', error);
      process.exit(1);
    }
    if (!data) {
      console.log('No share link found for id', id);
      process.exit(0);
    }
    console.log('Share link row:', data);
  } catch (err) {
    console.error('Unexpected error', err);
    process.exit(1);
  }
}

run();
