import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import postgres from "postgres";

const connectionString =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.SUPABASE_CONNECTION_STRING;

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

    // If no connection string is provided, fall back to manual instructions
    if (!connectionString) {
      const instructions = `
      ⚠️  To run the migration, execute the SQL in Supabase SQL Editor:
      
      1. Go to https://app.supabase.com → select your project
      2. Click "SQL Editor" → "New Query"
      3. Paste the following SQL and click RUN:
      
      ${sqlContent}
      `;

      console.log("⚠️  No SUPABASE_DB_URL provided; returning instructions only");

      return NextResponse.json({
        success: false,
        error: "SUPABASE_DB_URL not set. Run manually using the SQL below.",
        instructions,
        statementCount: statements.length,
      });
    }

    const sql = postgres(connectionString, { max: 1 });
    const results: { index: number; ok: boolean; error?: string }[] = [];

    try {
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
        try {
          await sql.unsafe(statement);
          results.push({ index: i + 1, ok: true });
        } catch (err: any) {
          const msg = err?.message || String(err);
          console.warn(`⚠️  Statement ${i + 1} warning/error:`, msg);
          results.push({ index: i + 1, ok: false, error: msg });
        }
      }
    } finally {
      await sql.end({ timeout: 5 });
    }

    const executed = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok);

    return NextResponse.json(
      {
        success: failed.length === 0,
        executed,
        failed,
        statementCount: statements.length,
      },
      { status: failed.length ? 207 : 200 }
    );
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
