// Script per applicare migration direttamente
const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

const connectionString = process.env.SUPABASE_DB_URL || 'postgresql://postgres:Zambelli1234%40@db.waaigankcctijalvlppk.supabase.co:5432/postgres';

async function applyMigration() {
  console.log('🚀 Connecting to database...');

  const sql = postgres(connectionString, { max: 1 });

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '001_init.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

    // Split into statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements`);
    console.log('⚙️  Executing migration...\n');

    let executed = 0;
    let failed = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      process.stdout.write(`[${i + 1}/${statements.length}] `);

      try {
        await sql.unsafe(statement);
        console.log('✅');
        executed++;
      } catch (err) {
        // Ignora errori "already exists" che sono normali
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log('⚠️  (already exists, skipping)');
          executed++;
        } else {
          console.log(`❌ Error: ${err.message}`);
          failed++;
        }
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Executed: ${executed}/${statements.length}`);
    console.log(`   Failed: ${failed}`);

    // Verify schema
    console.log('\n🔍 Verifying schema...');
    const result = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'projects'
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `;

    console.log('\nColumns in projects table:');
    result.forEach(row => console.log(`  - ${row.column_name}`));

    const hasName = result.some(row => row.column_name === 'name');
    const hasTitle = result.some(row => row.column_name === 'title');

    if (hasName && !hasTitle) {
      console.log('\n✅ Schema is correct! (has "name", not "title")');
    } else if (hasTitle) {
      console.log('\n⚠️  Warning: "title" column still exists');
    } else {
      console.log('\n❌ Error: "name" column not found');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

applyMigration();
