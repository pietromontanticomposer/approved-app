-- Migration: 001_init.sql
-- Purpose: create core tables (projects, cues, versions, files, comments, references)
-- and related constraints, indexes, triggers. Idempotent - safe to run multiple times.

-- Enable UUID helper
create extension if not exists "pgcrypto";

-- Function to set updated_at timestamps
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ======================
-- Projects
-- ======================
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ======================
-- Cues
-- ======================
create table if not exists cues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  index_in_project int not null,
  original_name text,
  name text,
  display_name text,
  status text default 'in-review',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ======================
-- Versions
-- ======================
create table if not exists versions (
  id uuid primary key default gen_random_uuid(),
  cue_id uuid not null references cues(id) on delete cascade,
  index_in_cue int not null,
  status text default 'in-review',
  media_type text,                -- 'audio' | 'video'
  media_storage_path text,        -- canonical storage path in bucket (recommended)
  media_url text,                 -- public URL (can be updated to signed URL flow)
  media_original_name text,
  media_display_name text,
  media_duration double precision,
  media_thumbnail_path text,
  media_thumbnail_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ======================
-- Version deliverable files
-- ======================
create table if not exists version_files (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references versions(id) on delete cascade,
  name text not null,
  type text,
  url text,
  size bigint,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ======================
-- Comments (per-version)
-- ======================
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references versions(id) on delete cascade,
  time_seconds double precision not null,
  author text,
  text text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ======================
-- Reference groups + versions
-- ======================
create table if not exists references_root (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  active_version_index int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists reference_versions (
  id uuid primary key default gen_random_uuid(),
  root_id uuid not null references references_root(id) on delete cascade,
  name text not null,
  type text,
  url text,
  size bigint,
  duration double precision,
  thumbnail_path text,
  thumbnail_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ======================
-- CHECK CONSTRAINTS (if not already present)
-- ======================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cues_status_check'
  ) THEN
    ALTER TABLE cues
      ADD CONSTRAINT cues_status_check CHECK (status in ('in-review','approved','changes-requested'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'versions_status_check'
  ) THEN
    ALTER TABLE versions
      ADD CONSTRAINT versions_status_check CHECK (status in ('in-review','approved','changes-requested'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'versions_media_type_check'
  ) THEN
    ALTER TABLE versions
      ADD CONSTRAINT versions_media_type_check CHECK (media_type IS NULL OR media_type in ('audio','video'));
  END IF;
END$$;

-- ======================
-- UNIQUE constraints for ordering (prevent duplicates)
-- ======================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cues_project_index_unique'
  ) THEN
    ALTER TABLE cues
      ADD CONSTRAINT cues_project_index_unique UNIQUE (project_id, index_in_project);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'versions_cue_index_unique'
  ) THEN
    ALTER TABLE versions
      ADD CONSTRAINT versions_cue_index_unique UNIQUE (cue_id, index_in_cue);
  END IF;
END$$;

-- ======================
-- Indexes for performance
-- ======================
create index if not exists idx_cues_project_id on cues(project_id);
create index if not exists idx_cues_project_index on cues(project_id, index_in_project);
create index if not exists idx_versions_cue_id on versions(cue_id);
create index if not exists idx_versions_media_type on versions(media_type);
create index if not exists idx_versions_media_storage_path on versions(media_storage_path);
create index if not exists idx_projects_created_at on projects(created_at);
create index if not exists idx_versions_created_at on versions(created_at);
create index if not exists idx_version_files_version_id on version_files(version_id);
create index if not exists idx_reference_root_project_id on references_root(project_id);
create index if not exists idx_reference_versions_root_id on reference_versions(root_id);

-- ======================
-- Triggers: keep updated_at in sync
-- ======================
-- remove existing triggers if any (safe)
drop trigger if exists trg_projects_updated_at on projects;
drop trigger if exists trg_cues_updated_at on cues;
drop trigger if exists trg_versions_updated_at on versions;
drop trigger if exists trg_version_files_updated_at on version_files;
drop trigger if exists trg_comments_updated_at on comments;
drop trigger if exists trg_references_root_updated_at on references_root;
drop trigger if exists trg_reference_versions_updated_at on reference_versions;

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

create trigger trg_cues_updated_at
  before update on cues
  for each row execute function set_updated_at();

create trigger trg_versions_updated_at
  before update on versions
  for each row execute function set_updated_at();

create trigger trg_version_files_updated_at
  before update on version_files
  for each row execute function set_updated_at();

create trigger trg_comments_updated_at
  before update on comments
  for each row execute function set_updated_at();

create trigger trg_references_root_updated_at
  before update on references_root
  for each row execute function set_updated_at();

create trigger trg_reference_versions_updated_at
  before update on reference_versions
  for each row execute function set_updated_at();

-- ======================
-- Create project_summary view safely
-- ======================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'v' AND relname = 'project_summary') THEN
    EXECUTE $q$
      CREATE VIEW project_summary AS
      SELECT
        p.id AS project_id,
        p.name AS project_name,
        p.created_at AS project_created_at,
        p.updated_at AS project_updated_at,
        COALESCE(c.cues_count, 0) AS cues_count,
        COALESCE(v.versions_count, 0) AS versions_count
      FROM projects p
      LEFT JOIN (
        SELECT project_id, count(*) AS cues_count
        FROM cues
        GROUP BY project_id
      ) c ON c.project_id = p.id
      LEFT JOIN (
        SELECT c.project_id, count(v.*) AS versions_count
        FROM versions v
        JOIN cues c ON v.cue_id = c.id
        GROUP BY c.project_id
      ) v ON v.project_id = p.id;
    $q$;
  END IF;
END$$;

-- ======================
-- Done
-- ======================
