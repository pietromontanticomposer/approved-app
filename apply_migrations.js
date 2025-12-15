#!/usr/bin/env node
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pg from "pg";

// Load environment variables
dotenv.config({ path: ".env.local" });

const { Client } = pg;

// Parse DB URL from environment
const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error("❌ Missing SUPABASE_DB_URL in .env.local");
  console.error("Format: postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres");
  process.exit(1);
}

async function applyMigration(filePath) {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log(`🔌 Connecting to database...`);
    await client.connect();
    console.log(`✅ Connected`);

    console.log(`📖 Reading migration file: ${filePath}`);
    const sql = fs.readFileSync(filePath, "utf-8");

    console.log(`🚀 Executing migration...`);
    await client.query(sql);

    console.log(`✅ Migration completed successfully: ${path.basename(filePath)}`);
  } catch (err) {
    console.error(`❌ Migration failed:`, err.message);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get migration files from command line
const migrationFiles = process.argv.slice(2);

if (migrationFiles.length === 0) {
  console.log(`Usage: node apply_migrations.js <migration_file> [migration_file2] ...`);
  console.log(`Example: node apply_migrations.js migrations/003_multi_tenant_setup.sql`);
  process.exit(1);
}

// Apply migrations sequentially
(async () => {
  for (const file of migrationFiles) {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`);
      process.exit(1);
    }
    await applyMigration(fullPath);
    console.log("");
  }
  console.log("🎉 All migrations completed successfully!");
})();
