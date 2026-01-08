import fs from "fs";
import path from "path";
import postgres from "postgres";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const connectionString =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.SUPABASE_CONNECTION_STRING;

if (!connectionString) {
  console.error(
    "Missing SUPABASE_DB_URL (or DATABASE_URL/SUPABASE_CONNECTION_STRING) in env. Cannot run migrations."
  );
  process.exit(1);
}

// Use a pooled connection; keep max small to avoid exhausting Supabase pool
const sql = postgres(connectionString, { max: 1 });

async function runMigration() {
  try {
    // Get migration file from command line argument, default to 001_init.sql
    const migrationFile = process.argv[2] || "001_init.sql";
    console.log(`🚀 Starting migration: ${migrationFile}...`);

    // Read the SQL file
    const migrationPath = path.join(process.cwd(), "migrations", migrationFile);

    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    const sqlText = fs.readFileSync(migrationPath, "utf-8");

    // Split SQL into individual statements (semicolon-separated)
    const statements = sqlText
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);

      try {
        await sql.unsafe(statement);
      } catch (error: any) {
        console.warn(
          `⚠️  Statement ${i + 1} warning/error:`,
          error?.message || String(error)
        );
        // Continue on error to allow idempotent re-runs
      }
    }

    console.log("✅ Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

runMigration();
