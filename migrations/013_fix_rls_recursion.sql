-- Migration 013: Fix infinite recursion in RLS policies
-- Problem: policies on project_members query project_members, and policies on projects query project_members
-- Solution: Use SECURITY DEFINER function to check project_members without triggering RLS

BEGIN;

-- Create helper function to check project membership without RLS recursion
CREATE OR REPLACE FUNCTION is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND member_id = p_user_id
  );
$$;

-- ============================================================================
-- FIX PROJECTS TABLE POLICIES
-- ============================================================================

-- Drop the problematic policy that caused recursion
DROP POLICY IF EXISTS "Users can view projects via project_members or team_members or " ON projects;
DROP POLICY IF EXISTS "Users can view projects via project_members or team_members or owner" ON projects;

-- Create new policy using the helper function
CREATE POLICY "Users can view own or shared projects"
  ON projects
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR is_project_member(id, auth.uid())
  );

-- ============================================================================
-- FIX PROJECT_MEMBERS TABLE POLICIES
-- ============================================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Project members can view members" ON project_members;
DROP POLICY IF EXISTS "Owners and managers can add project members" ON project_members;
DROP POLICY IF EXISTS "Owners and editors can add project members" ON project_members;
DROP POLICY IF EXISTS "Owners and managers can update project_members" ON project_members;
DROP POLICY IF EXISTS "Owners and editors can update project_members" ON project_members;
DROP POLICY IF EXISTS "Owners and managers can delete project_members" ON project_members;
DROP POLICY IF EXISTS "Owners and editors can delete project_members" ON project_members;

-- Recreate policies WITHOUT self-referencing project_members queries
-- Use projects.owner_id check and team_members check only (no circular reference)

-- SELECT: Users can view project_members if they are:
-- - the owner of the project
-- - a team member for the project's team
-- - themselves a member (direct check on row being accessed)
CREATE POLICY "Project members can view members"
  ON project_members
  FOR SELECT
  USING (
    -- User can see their own membership
    member_id = auth.uid()
    -- Or user is project owner
    OR EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.owner_id = auth.uid()
    )
    -- Or user is in the team
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_members.project_id AND tm.user_id = auth.uid()
    )
  );

-- INSERT: Only project owners or team owners/editors can add members
CREATE POLICY "Owners and editors can add project members"
  ON project_members
  FOR INSERT
  WITH CHECK (
    -- User is project owner
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.owner_id = auth.uid()
    )
    -- Or user is team owner/editor
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_members.project_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'editor')
    )
  );

-- UPDATE: Only project owners or team owners/editors can update members
CREATE POLICY "Owners and editors can update project_members"
  ON project_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_members.project_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_members.project_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'editor')
    )
  );

-- DELETE: Only project owners or team owners/editors can delete members
CREATE POLICY "Owners and editors can delete project_members"
  ON project_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p WHERE p.id = project_members.project_id AND p.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_members.project_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'editor')
    )
  );

COMMIT;
