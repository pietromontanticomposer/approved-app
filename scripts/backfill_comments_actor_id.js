#!/usr/bin/env node
// scripts/backfill_comments_actor_id.js
// Best-effort backfill: populate comments.actor_id where NULL by matching
// comment.author to auth.users.email or user_metadata.full_name.

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log('Fetching comments without actor_id...');
  const { data: comments, error: cErr } = await supabase
    .from('comments')
    .select('id, author')
    .is('actor_id', null)
    .limit(1000);

  if (cErr) {
    console.error('Error fetching comments:', cErr);
    process.exit(1);
  }

  console.log(`Found ${comments.length} comments to attempt backfill`);
  let updated = 0;

  for (const cm of comments) {
    const author = (cm.author || '').trim();
    if (!author) continue;

    let userId = null;

    // If author looks like an email, search by email
    if (author.includes('@')) {
      try {
        const res = await supabase.from('auth.users').select('id,email').ilike('email', author).limit(1).maybeSingle();
        if (res.data && res.data.id) userId = res.data.id;
      } catch (e) {}
    }

    // Otherwise try matching by several metadata fields (case-insensitive)
    if (!userId) {
      try {
        // Try full_name ilike
        let res = await supabase
          .from('auth.users')
          .select('id, user_metadata')
          .or(`user_metadata->>full_name.ilike.%${author}%,user_metadata->>display_name.ilike.%${author}%`)
          .limit(1)
          .maybeSingle();
        if (res.data && res.data.id) userId = res.data.id;

        // Try matching concatenated first + last
        if (!userId) {
          res = await supabase
            .from('auth.users')
            .select('id, user_metadata')
            .filter("user_metadata->>first_name", 'not.is', null)
            .filter("user_metadata->>last_name", 'not.is', null)
            .limit(100)
            .maybeSingle();
          // Fallback strategy: scan users for matching concatenation (less efficient)
          if (res && res.data == null) {
            const list = await supabase.from('auth.users').select('id, user_metadata').limit(1000);
            if (list && list.data) {
              for (const u of list.data) {
                const meta = u.user_metadata || {};
                const first = (meta.first_name || meta.firstName || '').toString().trim();
                const last = (meta.last_name || meta.lastName || '').toString().trim();
                const full = `${first} ${last}`.trim();
                if (full && full.toLowerCase() === author.toLowerCase()) {
                  userId = u.id;
                  break;
                }
                const display = (meta.display_name || meta.full_name || '').toString().trim();
                if (display && display.toLowerCase() === author.toLowerCase()) {
                  userId = u.id;
                  break;
                }
              }
            }
          }
        }
      } catch (e) {}
    }

    if (userId) {
      try {
        const u = await supabase.from('comments').update({ actor_id: userId }).eq('id', cm.id);
        if (!u.error) {
          updated += 1;
          console.log(`Updated comment ${cm.id} -> ${userId}`);
        } else {
          console.warn(`Failed to update ${cm.id}:`, u.error.message || u.error);
        }
      } catch (e) {
        console.warn(`Exception updating ${cm.id}:`, e.message || e);
      }
    } else {
      console.log(`No match for comment ${cm.id} author='${author}'`);
    }
  }

  console.log(`Backfill complete. Updated ${updated} comments.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Unexpected error', err);
  process.exit(2);
});
