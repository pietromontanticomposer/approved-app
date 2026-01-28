-- Migration 016: approvals, cue sheet, delivery templates, reference video
-- Adds tables and columns required for marker export, approval packs, cue sheets,
-- delivery manifests, and audio-to-picture review.

BEGIN;

-- ======================
-- Version approvals
-- ======================
CREATE TABLE IF NOT EXISTS version_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  approved_by uuid NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  approval_note text NULL,
  changelog text NULL,
  media_hash text NULL,
  media_hash_alg text NOT NULL DEFAULT 'sha256',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_version_approvals_version ON version_approvals(version_id);
CREATE INDEX IF NOT EXISTS idx_version_approvals_project ON version_approvals(project_id);

-- ======================
-- Cue sheet metadata
-- ======================
CREATE TABLE IF NOT EXISTS cue_sheet_projects (
  project_id uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  production text NULL,
  client text NULL,
  episode text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cue_sheet_entries (
  cue_id uuid PRIMARY KEY REFERENCES cues(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  work_title text NULL,
  composers text NULL,
  publishers text NULL,
  pro text NULL,
  usage_type text NULL,
  start_timecode text NULL,
  duration text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cue_sheet_entries_project ON cue_sheet_entries(project_id);

-- ======================
-- Delivery templates per version
-- ======================
CREATE TABLE IF NOT EXISTS version_deliveries (
  version_id uuid PRIMARY KEY REFERENCES versions(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cue_id uuid NOT NULL REFERENCES cues(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  naming jsonb NULL,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_version_deliveries_project ON version_deliveries(project_id);

-- ======================
-- Reference video fields on versions
-- ======================
ALTER TABLE versions
  ADD COLUMN IF NOT EXISTS reference_video_storage_path text,
  ADD COLUMN IF NOT EXISTS reference_video_url text,
  ADD COLUMN IF NOT EXISTS reference_video_display_name text,
  ADD COLUMN IF NOT EXISTS reference_video_offset_ms integer,
  ADD COLUMN IF NOT EXISTS reference_video_start_tc text,
  ADD COLUMN IF NOT EXISTS reference_video_duration double precision;

-- ======================
-- Triggers for updated_at
-- ======================
DROP TRIGGER IF EXISTS trg_version_approvals_updated_at ON version_approvals;
CREATE TRIGGER trg_version_approvals_updated_at
  BEFORE UPDATE ON version_approvals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_cue_sheet_projects_updated_at ON cue_sheet_projects;
CREATE TRIGGER trg_cue_sheet_projects_updated_at
  BEFORE UPDATE ON cue_sheet_projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_cue_sheet_entries_updated_at ON cue_sheet_entries;
CREATE TRIGGER trg_cue_sheet_entries_updated_at
  BEFORE UPDATE ON cue_sheet_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_version_deliveries_updated_at ON version_deliveries;
CREATE TRIGGER trg_version_deliveries_updated_at
  BEFORE UPDATE ON version_deliveries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
