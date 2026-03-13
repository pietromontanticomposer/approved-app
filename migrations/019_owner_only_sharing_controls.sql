-- Migration 019: owner-only share and access management
-- Editors can modify project content, but only owners can manage access.

BEGIN;

-- Tighten project_members mutation policies to owner-only.
DROP POLICY IF EXISTS "Owners and editors can add project members" ON project_members;
CREATE POLICY "Owners can add project members"
  ON project_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners and editors can update project_members" ON project_members;
CREATE POLICY "Owners can update project members"
  ON project_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id
        AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id
        AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners and editors can delete project_members" ON project_members;
CREATE POLICY "Owners can delete project members"
  ON project_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_members.project_id
        AND p.owner_id = auth.uid()
    )
  );

-- Tighten share_links visibility to owner-only as well.
DROP POLICY IF EXISTS "Owners and editors can view share_links" ON share_links;
CREATE POLICY "Owners can view share_links"
  ON share_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = share_links.project_id
        AND p.owner_id = auth.uid()
    )
  );

-- Legacy RPC used by older clients is deprecated. Keep it disabled so old
-- frontends fall back to invite creation instead of producing legacy links.
CREATE OR REPLACE FUNCTION create_project_share(
  p_project_id UUID,
  p_role TEXT,
  p_expires_in_days INTEGER DEFAULT 7,
  p_created_by UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Deprecated - use /api/projects/share'
  );
END;
$$;

COMMENT ON FUNCTION create_project_share IS 'Legacy RPC dismessa: usare /api/projects/share';

COMMIT;
