import fs from 'fs';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const conn = process.env.SUPABASE_DB_URL;
if (!conn) {
  console.error('SUPABASE_DB_URL not set');
  process.exit(1);
}

async function apply(file) {
  const sql = fs.readFileSync(file, 'utf8');
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    console.log('Applying', file);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Applied', file);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error applying', file, err);
    throw err;
  } finally {
    await client.end();
  }
}

(async () => {
  try {
    await apply('migrations/007_project_sharing.sql');
    await apply('migrations/008_project_sharing_rls.sql');
    console.log('Migrations applied successfully');
  } catch (err) {
    console.error('Migration failed', err);
    process.exit(1);
  }
})();
