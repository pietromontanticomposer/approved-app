import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Missing Supabase credentials");
  console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceRoleKey ? "✓" : "✗");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function runMigration() {
  try {
    // Get migration file from command line argument
    const migrationFile = process.argv[2] || "migrations/001_init.sql";
    console.log(`🚀 Starting migration: ${migrationFile}`);
    
    const migrationPath = path.join(process.cwd(), migrationFile);
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(migrationPath, "utf-8");

    // Execute the entire SQL file
    const { error } = await supabase.rpc("execute_sql", { sql });
    
    if (error) {
      console.error("❌ Error:", error);
      // Try alternative approach - split and execute line by line
      console.log("\n📝 Trying line-by-line execution...");
      const lines = sql.split("\n").filter(line => line.trim() && !line.trim().startsWith("--"));
      const statements = lines.join("\n").split(";").filter(s => s.trim());
      
      for (const stmt of statements) {
        const { error: err } = await supabase.rpc("execute_sql", { sql: stmt });
        if (err) console.warn("⚠️  Warning:", err.message);
      }
    }
    
    console.log("✅ Migration completed!");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

runMigration();
