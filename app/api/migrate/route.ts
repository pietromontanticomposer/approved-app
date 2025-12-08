import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Only allow POST requests in development
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Migration disabled in production" },
      { status: 403 }
    );
  }

  try {
    console.log("🚀 Starting migration via API...");

    // Extract connection string from Supabase URL
    // URL format: https://xxxxx.supabase.co
    const projectId = supabaseUrl.split("//")[1].split(".")[0];

    // Postgres connection string for Supabase
    const connectionString = `postgresql://postgres.${projectId}:[YOUR_POSTGRES_PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`;

    // Read the migration file
    const migrationPath = path.join(
      process.cwd(),
      "migrations",
      "001_init.sql"
    );
    const sqlContent = fs.readFileSync(migrationPath, "utf-8");

    // Split into individual statements
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));

    console.log(`📝 Found ${statements.length} SQL statements`);

    // Since we can't easily connect to Postgres from Next.js runtime,
    // provide instructions to user
    const instructions = `
    ⚠️  To run the migration, execute the SQL in Supabase SQL Editor:
    
    1. Go to https://app.supabase.com → select your project
    2. Click "SQL Editor" → "New Query"
    3. Paste the following SQL and click RUN:
    
    ${sqlContent}
    `;

    console.log(instructions);

    return NextResponse.json({
      success: false,
      error:
        "Cannot execute SQL from Next.js runtime. Follow instructions below.",
      instructions: instructions,
      statementCount: statements.length,
    });
  } catch (error) {
    console.error("❌ Migration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
