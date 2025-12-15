-- Migration: 006_share_links.sql
-- Aggiunge tabella `share_links` per condivisione Drive-like e RPC helper

CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('editor','commenter','viewer')) DEFAULT 'viewer',
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_links_project ON share_links(project_id);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);

-- RPC: create_project_share
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
DECLARE
  v_token UUID;
  v_role TEXT := COALESCE(p_role, 'viewer');
BEGIN
  IF v_role NOT IN ('editor','commenter','viewer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
  END IF;

  INSERT INTO share_links (project_id, token, created_by, role, expires_at)
  VALUES (p_project_id, gen_random_uuid(), p_created_by, v_role, now() + (p_expires_in_days || ' days')::INTERVAL)
  RETURNING token INTO v_token;

  RETURN jsonb_build_object('success', true, 'token', v_token);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- RPC: get_share_details (returns JSONB with share info)
CREATE OR REPLACE FUNCTION get_share_details(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
BEGIN
  SELECT sl.*, p.name AS project_name
  INTO r
  FROM share_links sl
  JOIN projects p ON p.id = sl.project_id
  WHERE sl.token = p_token
    AND sl.revoked = false
    AND sl.expires_at >= now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'token', r.token,
    'project_id', r.project_id,
    'project_name', r.project_name,
    'role', r.role,
    'expires_at', r.expires_at,
    'created_by', r.created_by
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('found', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION create_project_share TO authenticated;
GRANT EXECUTE ON FUNCTION get_share_details TO authenticated, anon;
