import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing env'); process.exit(1); }
const supabase = createClient(url, key);
(async ()=>{
  const teamId='cb1a651e-6240-4d49-8f68-fe1b2beae2b8';
  const userId='65e6a4da-631d-4fb2-a1d3-988847890aa7';
  const { data, error } = await supabase.from('team_members').upsert({ team_id: teamId, user_id: userId, role: 'owner', joined_at: new Date().toISOString() }, { onConflict: 'team_id,user_id' }).select();
  console.log({data, error});
})();
