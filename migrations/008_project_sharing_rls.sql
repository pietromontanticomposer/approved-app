-- Migration 008: RLS policies for project-level sharing
-- Requires: migrations/004_rls_policies.sql and 007_project_sharing.sql already applied

BEGIN;

-- Enable RLS on new tables
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to SELECT projects if:
-- - they are project owner (projects.owner_id = auth.uid())
-- - they are member in project_members (member_id = auth.uid())
-- - OR they are member in team_members for the project's team
CREATE POLICY "Users can view projects via project_members or team_members or owner"
  ON projects
  FOR SELECT
  USING (
    projects.owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.member_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM team_members tm WHERE tm.team_id = projects.team_id AND tm.user_id = auth.uid()
    )
  );

-- Allow project owners and project_members with role in ('owner','manage') to INSERT into project_members
CREATE POLICY "Owners and managers can add project members"
  ON project_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM project_members pm WHERE pm.project_id = project_members.project_id AND pm.member_id = auth.uid() AND pm.role IN ('owner','manage')
    )
  );

-- Allow project members to SELECT project_members for their project
CREATE POLICY "Project members can view members"
  ON project_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm WHERE pm.project_id = project_members.project_id AND pm.member_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM team_members tm WHERE tm.team_id = (SELECT team_id FROM projects WHERE id = project_members.project_id) AND tm.user_id = auth.uid()
    )
  );

-- Allow owners/managers to UPDATE project_members
CREATE POLICY "Owners and managers can update project_members"
  ON project_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM project_members pm WHERE pm.project_id = project_members.project_id AND pm.member_id = auth.uid() AND pm.role IN ('owner','manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM project_members pm WHERE pm.project_id = project_members.project_id AND pm.member_id = auth.uid() AND pm.role IN ('owner','manage')
    )
  );

-- Allow owners/managers to DELETE project_members
CREATE POLICY "Owners and managers can delete project_members"
  ON project_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM project_members pm WHERE pm.project_id = project_members.project_id AND pm.member_id = auth.uid() AND pm.role IN ('owner','manage')
    )
  );

-- Allow users to SELECT share_links only if they are owner/manager of the project
CREATE POLICY "Owners and managers can view share_links"
  ON share_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = share_links.project_id AND p.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM project_members pm WHERE pm.project_id = share_links.project_id AND pm.member_id = auth.uid() AND pm.role IN ('owner','manage')
    )
  );

-- Prevent direct INSERT/UPDATE/DELETE on share_links from non-admins (we expect server-side admin APIs to manage links)
-- Prevent direct INSERT on share_links from non-admins (INSERT must use WITH CHECK only in policies)
CREATE POLICY "Deny non-admins inserting share_links"
  ON share_links
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Deny non-admins updating share_links"
  ON share_links
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny non-admins deleting share_links"
  ON share_links
  FOR DELETE
  USING (false);

-- Audit logs: users cannot write directly (server should insert via admin key)
CREATE POLICY "Deny non-admins inserting audit_logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Deny non-admins updating audit_logs"
  ON audit_logs
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny non-admins deleting audit_logs"
  ON audit_logs
  FOR DELETE
  USING (false);

COMMIT;

-- NOTE: review policies to ensure they fit your team/project model. Server-side admin APIs use the service role key and bypass RLS.
