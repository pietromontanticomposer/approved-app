-- Migration 010: Add owner_id column to projects table
-- This column is referenced by RLS policies but was missing from the schema

BEGIN;

-- Add owner_id column to projects if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);

    -- Update existing projects without owner_id: set owner_id based on team ownership
    -- If a project has a team_id, find the owner of that team and set as owner_id
    UPDATE projects p
    SET owner_id = (
      SELECT tm.user_id
      FROM team_members tm
      WHERE tm.team_id = p.team_id
        AND tm.role = 'owner'
      LIMIT 1
    )
    WHERE p.owner_id IS NULL AND p.team_id IS NOT NULL;

    RAISE NOTICE 'Added owner_id column to projects table';
  ELSE
    RAISE NOTICE 'owner_id column already exists in projects table';
  END IF;
END$$;

COMMIT;

-- Add comment
COMMENT ON COLUMN projects.owner_id IS 'User who owns this project (may differ from team owner)';
