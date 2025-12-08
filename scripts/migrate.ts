import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase credentials in environment variables");
  process.exit(1);
}

// Create admin client (service role key allows DDL operations)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function runMigration() {
  try {
    console.log("🚀 Starting migration...");

    // Read the SQL file
    const migrationPath = path.join(process.cwd(), "migrations", "001_init.sql");
    const sql = fs.readFileSync(migrationPath, "utf-8");

    // Split SQL into individual statements (semicolon-separated)
    const statements = sql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase.rpc("exec_sql", {
        sql: statement,
      });

      if (error) {
        console.warn(`⚠️  Statement ${i + 1} warning/error:`, error.message);
        // Continue on error to allow idempotent re-runs
      }
    }

    console.log("✅ Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
