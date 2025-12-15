-- Migration 005: PostgreSQL Functions per Invite System
-- Funzioni SECURITY DEFINER per operazioni sicure sugli inviti
-- IMPORTANTE: Applica questa migrazione DOPO la 004

-- =====================================================
-- FUNZIONE: get_invite_details
-- Permette a utenti non autenticati di vedere i dettagli di un invito
-- =====================================================
CREATE OR REPLACE FUNCTION get_invite_details(invite_token UUID)
RETURNS TABLE (
  id UUID,
  team_id UUID,
  team_name TEXT,
  project_id UUID,
  project_name TEXT,
  email TEXT,
  role TEXT,
  invited_by_email TEXT,
  is_link_invite BOOLEAN,
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN,
  is_used BOOLEAN,
  is_revoked BOOLEAN
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.team_id,
    t.name::text AS team_name,
    i.project_id,
    p.name::text AS project_name,
    i.email::text AS email,
    i.role::text AS role,
    u.email::text AS invited_by_email,
    i.is_link_invite,
    i.expires_at,
    (i.expires_at < NOW()) AS is_expired,
    (i.used_at IS NOT NULL) AS is_used,
    i.revoked AS is_revoked
  FROM invites i
  INNER JOIN teams t ON t.id = i.team_id
  LEFT JOIN projects p ON p.id = i.project_id
  LEFT JOIN auth.users u ON u.id = i.invited_by
  WHERE i.id = invite_token
    AND i.revoked = false
    AND i.expires_at > NOW()
    AND i.used_at IS NULL;
END;
$$;

-- Commento sulla funzione
COMMENT ON FUNCTION get_invite_details IS 'Recupera dettagli di un invito valido (non scaduto, non usato, non revocato) per la pagina pubblica di invito';

-- =====================================================
-- FUNZIONE: accept_invite
-- Accetta un invito e aggiunge l'utente al team
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

  IF v_team_member_exists THEN
    -- Aggiorna solo used_at dell'invito
    UPDATE invites
    SET used_at = NOW()
    WHERE id = invite_token;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Already a member of this team',
      'team_id', v_invite.team_id,
      'already_member', true
    );
  END IF;

  -- Inserisci il nuovo membro
  INSERT INTO team_members (user_id, team_id, role, joined_at)
  VALUES (accepting_user_id, v_invite.team_id, v_invite.role, NOW())
  ON CONFLICT (user_id, team_id) DO NOTHING;

  -- Marca l'invito come usato
  UPDATE invites
  SET used_at = NOW()
  WHERE id = invite_token;

  -- Restituisci successo
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully joined team',
    'team_id', v_invite.team_id,
    'project_id', v_invite.project_id,
    'role', v_invite.role,
    'already_member', false
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION accept_invite IS 'Accetta un invito e aggiunge l''utente al team con il ruolo specificato';

-- =====================================================
-- FUNZIONE: revoke_invite
-- Revoca un invito (solo owner del team)
-- =====================================================
CREATE OR REPLACE FUNCTION revoke_invite(
  invite_token UUID,
  revoking_user_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invite RECORD;
  v_is_owner BOOLEAN;
BEGIN
  -- Recupera l'invito
  SELECT * INTO v_invite
  FROM invites
  WHERE id = invite_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invite not found'
    );
  END IF;

  -- Verifica che l'utente sia owner del team
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = revoking_user_id
      AND team_id = v_invite.team_id
      AND role = 'owner'
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only team owners can revoke invites'
    );
  END IF;

  -- Revoca l'invito
  UPDATE invites
  SET revoked = true
  WHERE id = invite_token;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Invite revoked successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION revoke_invite IS 'Revoca un invito esistente (solo owner del team)';

-- =====================================================
-- FUNZIONE: create_invite
-- Crea un nuovo invito (solo owner del team)
-- =====================================================
CREATE OR REPLACE FUNCTION create_invite(
  p_team_id UUID,
  p_project_id UUID,
  p_email TEXT,
  p_role TEXT,
  p_is_link_invite BOOLEAN,
  p_invited_by UUID,
  p_expires_in_days INTEGER DEFAULT 7
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invite_id UUID;
  v_is_owner BOOLEAN;
  v_project_exists BOOLEAN;
BEGIN
  -- Verifica che l'utente sia owner del team
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = p_invited_by
      AND team_id = p_team_id
      AND role = 'owner'
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only team owners can create invites'
    );
  END IF;

  -- Se c'è un project_id, verifica che appartenga al team
  IF p_project_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM projects
      WHERE id = p_project_id
        AND team_id = p_team_id
    ) INTO v_project_exists;

    IF NOT v_project_exists THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Project does not belong to this team'
      );
    END IF;
  END IF;

  -- Verifica che il ruolo sia valido
  IF p_role NOT IN ('owner', 'editor', 'commenter', 'viewer') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid role. Must be: owner, editor, commenter, or viewer'
    );
  END IF;

  -- Crea l'invito
  INSERT INTO invites (
    team_id,
    project_id,
    email,
    role,
    is_link_invite,
    invited_by,
    expires_at
  )
  VALUES (
    p_team_id,
    p_project_id,
    CASE WHEN p_is_link_invite THEN NULL ELSE p_email END,
    p_role,
    p_is_link_invite,
    p_invited_by,
    NOW() + (p_expires_in_days || ' days')::INTERVAL
  )
  RETURNING id INTO v_invite_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Invite created successfully',
    'invite_id', v_invite_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION create_invite IS 'Crea un nuovo invito per un team (solo owner)';

-- =====================================================
-- FUNZIONE: is_team_member
-- Helper per verificare se un utente è membro di un team
-- =====================================================
CREATE OR REPLACE FUNCTION is_team_member(
  p_user_id UUID,
  p_team_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = p_user_id
      AND team_id = p_team_id
  );
END;
$$;

COMMENT ON FUNCTION is_team_member IS 'Helper per verificare se un utente è membro di un team (usato nelle storage policies)';

-- =====================================================
-- FUNZIONE: get_user_team_role
-- Ottiene il ruolo di un utente in un team
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_team_role(
  p_user_id UUID,
  p_team_id UUID
)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM team_members
  WHERE user_id = p_user_id
    AND team_id = p_team_id;
  
  RETURN v_role;
END;
$$;

COMMENT ON FUNCTION get_user_team_role IS 'Ottiene il ruolo di un utente in un team specifico';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- Permetti l'esecuzione a utenti autenticati
GRANT EXECUTE ON FUNCTION get_invite_details TO authenticated, anon;
GRANT EXECUTE ON FUNCTION accept_invite TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_invite TO authenticated;
GRANT EXECUTE ON FUNCTION create_invite TO authenticated;
GRANT EXECUTE ON FUNCTION is_team_member TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_team_role TO authenticated;
