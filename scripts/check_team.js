import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing env'); process.exit(1); }
const supabase = createClient(url, key);
(async ()=>{
  const teamId='cb1a651e-6240-4d49-8f68-fe1b2beae2b8';
  const { data, error } = await supabase.from('teams').select('id, owner_id').eq('id', teamId).maybeSingle();
  console.log({data, error});
  const { data: pm, error: pmErr } = await supabase.from('team_members').select('*').eq('team_id', teamId);
  console.log({pm, pmErr});
})();
