-- Migration 014: Fix accept_invite to add user to project_members
-- Problem: accept_invite only adds to team_members, but shared projects also need project_members entry
-- Solution: Update accept_invite to also insert into project_members when project_id is present

BEGIN;

-- =====================================================
-- FUNCTION: accept_invite (UPDATED)
-- Accepts an invite and adds user to BOTH team AND project
-- =====================================================
CREATE OR REPLACE FUNCTION accept_invite(
  invite_token UUID,
  accepting_user_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invite RECORD;
  v_team_member_exists BOOLEAN;
  v_project_member_exists BOOLEAN;
  v_result JSONB;
BEGIN
  -- Recupera l'invito con lock per evitare race conditions
  SELECT * INTO v_invite
  FROM invites
  WHERE id = invite_token
    AND revoked = false
    AND expires_at > NOW()
    AND used_at IS NULL
  FOR UPDATE;

  -- Verifica che l'invito esista
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invite not found, expired, revoked, or already used'
    );
  END IF;

  -- Se l'invito è per email specifica, verifica che corrisponda
  IF v_invite.email IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = accepting_user_id
        AND email = v_invite.email
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'This invite is for a different email address'
      );
    END IF;
  END IF;

  -- Verifica se l'utente è già membro del team
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = accepting_user_id
      AND team_id = v_invite.team_id
  ) INTO v_team_member_exists;

  -- Inserisci il nuovo membro del team (se non esiste già)
  IF NOT v_team_member_exists THEN
    INSERT INTO team_members (user_id, team_id, role, joined_at)
    VALUES (accepting_user_id, v_invite.team_id, v_invite.role, NOW())
    ON CONFLICT (user_id, team_id) DO NOTHING;
  END IF;

  -- Se l'invito ha un project_id, aggiungi anche a project_members
  IF v_invite.project_id IS NOT NULL THEN
    -- Verifica se l'utente è già membro del progetto
    SELECT EXISTS (
      SELECT 1 FROM project_members
      WHERE member_id = accepting_user_id
        AND project_id = v_invite.project_id
    ) INTO v_project_member_exists;

    IF NOT v_project_member_exists THEN
      INSERT INTO project_members (project_id, member_id, role, added_by, added_at)
      VALUES (v_invite.project_id, accepting_user_id, v_invite.role, v_invite.invited_by, NOW())
      ON CONFLICT (project_id, member_id) DO NOTHING;
    END IF;
  END IF;

  -- Marca l'invito come usato
  UPDATE invites
  SET used_at = NOW()
  WHERE id = invite_token;

  -- Restituisci successo
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully joined team and project',
    'team_id', v_invite.team_id,
    'project_id', v_invite.project_id,
    'role', v_invite.role,
    'already_team_member', v_team_member_exists
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION accept_invite IS 'Accetta un invito e aggiunge l''utente sia al team che al progetto (se specificato)';

COMMIT;
