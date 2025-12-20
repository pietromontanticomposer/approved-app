import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '';

/**
 * POST /api/migrate-notes
 * Creates the project_notes table
 */
export async function POST(req: NextRequest) {
  if (!connectionString) {
    return NextResponse.json(
      { error: 'No database connection string configured' },
      { status: 500 }
    );
  }

  const sql = postgres(connectionString, { max: 1 });

  try {
    console.log('[migrate-notes] Creating project_notes table...');

    // Create the table
    await sql`
      create table if not exists project_notes (
        id uuid primary key default gen_random_uuid(),
        project_id uuid not null references projects(id) on delete cascade,
        cue_id uuid references cues(id) on delete set null,
        body text not null,
        type text default 'general',
        author_id uuid,
        author_name text,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      )
    `;
    console.log('[migrate-notes] Table created');

    // Create indexes
    await sql`create index if not exists project_notes_project_idx on project_notes(project_id)`;
    await sql`create index if not exists project_notes_cue_idx on project_notes(cue_id)`;
    console.log('[migrate-notes] Indexes created');

    await sql.end();

    return NextResponse.json({
      success: true,
      message: 'project_notes table created successfully'
    });

  } catch (err: any) {
    console.error('[migrate-notes] Error:', err);
    await sql.end().catch(() => {});
    return NextResponse.json(
      { error: err?.message || 'Migration failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (!connectionString) {
    return NextResponse.json({ exists: false, error: 'No connection string' });
  }

  const sql = postgres(connectionString, { max: 1 });

  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'project_notes'
      ) as exists
    `;
    await sql.end();

    return NextResponse.json({
      exists: result[0]?.exists || false
    });
  } catch (err: any) {
    await sql.end().catch(() => {});
    return NextResponse.json({
      exists: false,
      error: err?.message
    });
  }
}
