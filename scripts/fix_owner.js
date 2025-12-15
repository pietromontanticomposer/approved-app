import { createClient } from '@supabase/supabase-js';
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
    const projectId = 'e7b071cb-2a95-488c-afac-70fc44af8104';
    const ownerId = '65e6a4da-631d-4fb2-a1d3-988847890aa7';

    console.log('Setting owner_id on project', projectId, 'to', ownerId);
    const { data, error } = await supabase
      .from('projects')
      .update({ owner_id: ownerId })
      .eq('id', projectId)
      .select('id, owner_id')
      .single();

    if (error) {
      console.error('Update project error:', error);
      process.exit(1);
    }

    console.log('Project updated:', data);

    console.log('Upserting project_members as owner');
    const { data: pm, error: pmErr } = await supabase
      .from('project_members')
      .upsert({ project_id: projectId, member_id: ownerId, role: 'owner', added_by: ownerId }, { onConflict: 'project_id,member_id' })
      .select();

    if (pmErr) {
      console.error('Upsert project_members error:', pmErr);
      process.exit(1);
    }

    console.log('Project_members upserted');
    process.exit(0);
  } catch (err) {
    console.error('Unexpected', err);
    process.exit(1);
  }
}

run();
