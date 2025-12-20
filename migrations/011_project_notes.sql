-- Migration: 011_project_notes.sql
-- Purpose: Create table for project/cue notes

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
);

create index if not exists project_notes_project_idx on project_notes(project_id);
create index if not exists project_notes_cue_idx on project_notes(cue_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_notes_type_check'
  ) THEN
    ALTER TABLE project_notes
      ADD CONSTRAINT project_notes_type_check CHECK (type in ('general','cue'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'project_notes_set_updated_at') THEN
    CREATE TRIGGER project_notes_set_updated_at
      BEFORE UPDATE ON project_notes
      FOR EACH ROW
      EXECUTE PROCEDURE set_updated_at();
  END IF;
END$$;
