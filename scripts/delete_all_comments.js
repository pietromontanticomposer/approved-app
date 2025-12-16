#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing Supabase config. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function confirmPrompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

(async () => {
  console.log('WARNING: This will PERMANENTLY DELETE all rows from the `comments` table.');
  console.log('If you want to proceed, type DELETE (in uppercase) and press Enter.');
  const ans = await confirmPrompt('Type DELETE to confirm: ');
  if (ans !== 'DELETE') {
    console.log('Aborted. No changes made.');
    process.exit(0);
  }

  try {
    // Supabase requires a filter for delete; match all rows where `id` is not null.
    // Use `not('id', 'is', null)` which works with UUID primary keys.
    const { data, error } = await supabase.from('comments').delete().not('id', 'is', null);
    if (error) {
      console.error('Error deleting comments:', error);
      process.exit(2);
    }
    console.log('Delete operation complete. Deleted rows:', Array.isArray(data) ? data.length : 'unknown');
    process.exit(0);
  } catch (e) {
    console.error('Exception during delete:', e);
    process.exit(3);
  }
})();
