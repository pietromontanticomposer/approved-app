-- Migration 007: Project-level sharing tables
-- Adds tables: project_members, share_links, audit_logs

BEGIN;

-- Table: project_members
CREATE TABLE IF NOT EXISTS project_members (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'view', -- owner, manage, contribute, view
  added_by uuid NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_member ON project_members(member_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(role);

-- Table: share_links
CREATE TABLE IF NOT EXISTS share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'view', -- role granted to users who redeem the link
  token_hash text NOT NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  max_uses int NULL,
  uses int NOT NULL DEFAULT 0,
  revoked_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_share_links_project ON share_links(project_id);
CREATE INDEX IF NOT EXISTS idx_share_links_token_hash ON share_links(token_hash);

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NULL,
  action text NOT NULL,
  target_type text NULL,
  target_id uuid NULL,
  meta jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_type, target_id);

COMMIT;

-- NOTE: This migration creates the DB schema needed for project-level sharing.
-- RLS policies and application-level permission checks should be added in a follow-up migration.
