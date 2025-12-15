-- Migration 003: Multi-Tenant Setup
-- Crea le tabelle per gestire teams, membri e inviti
-- Questo è il cuore del sistema collaborativo multi-utente

-- =====================================================
-- TABELLA TEAMS
-- =====================================================
-- Rappresenta un workspace/team (può essere personale o condiviso)
-- Ogni progetto appartiene a un team
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indice per performance su ricerche per creatore
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);

-- =====================================================
-- TABELLA TEAM_MEMBERS
-- =====================================================
-- Gestisce l'appartenenza degli utenti ai team e i loro ruoli
-- Ogni utente può appartenere a più team con ruoli diversi
CREATE TABLE IF NOT EXISTS team_members (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'commenter', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, team_id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

-- =====================================================
-- TABELLA INVITES
-- =====================================================
-- Gestisce gli inviti pendenti (sia via email che via link)
-- Un invito può essere nominale (con email specifica) o pubblico (link condivisibile)
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT, -- NULL per inviti via link pubblico
  role TEXT NOT NULL CHECK (role IN ('editor', 'commenter', 'viewer')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_link_invite BOOLEAN DEFAULT false, -- true per link condivisibili
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ, -- Timestamp quando l'invito è stato accettato
  revoked BOOLEAN DEFAULT false
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_invites_team ON invites(team_id);
CREATE INDEX IF NOT EXISTS idx_invites_project ON invites(project_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invites_expires ON invites(expires_at);

-- =====================================================
-- AGGIORNA TABELLA PROJECTS
-- =====================================================
-- Aggiunge il campo team_id ai progetti esistenti per il multi-tenant
ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- Indice per performance su queries filtrate per team
CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team_id);

-- =====================================================
-- AGGIORNA TABELLA MEDIA (se esiste)
-- =====================================================
-- Aggiungi team_id anche a media per facilitare le policy RLS storage
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'media') THEN
    ALTER TABLE media ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_media_team ON media(team_id);
  END IF;
END $$;

-- =====================================================
-- FUNZIONE: Auto-crea team personale al primo login
-- =====================================================
-- Questa funzione viene triggerata alla creazione di un nuovo utente
-- Crea automaticamente un team personale e lo assegna come owner
CREATE OR REPLACE FUNCTION create_personal_team()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_team_id UUID;
BEGIN
  -- Crea il team personale per il nuovo utente
  INSERT INTO teams (name, created_by)
  VALUES (
    'My Workspace', -- Nome di default, l'utente può cambiarlo dopo
    NEW.id
  )
  RETURNING id INTO new_team_id;

  -- Aggiungi l'utente come owner del suo team personale
  INSERT INTO team_members (user_id, team_id, role)
  VALUES (NEW.id, new_team_id, 'owner');

  RETURN NEW;
END;
$$;

-- Trigger: esegui create_personal_team dopo inserimento in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_personal_team();

-- =====================================================
-- COMMENTI SULLE TABELLE
-- =====================================================
COMMENT ON TABLE teams IS 'Workspace/team per organizzare progetti e collaborazioni';
COMMENT ON TABLE team_members IS 'Membri dei team con ruoli (owner, editor, commenter, viewer)';
COMMENT ON TABLE invites IS 'Inviti pendenti per unirsi a team/progetti';
COMMENT ON COLUMN invites.email IS 'Email destinatario (NULL per inviti via link pubblico)';
COMMENT ON COLUMN invites.is_link_invite IS 'true per link condivisibili, false per inviti nominali';
COMMENT ON COLUMN invites.expires_at IS 'Scadenza invito (default 7 giorni)';
