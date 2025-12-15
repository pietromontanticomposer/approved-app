-- Migration 004: Row Level Security Policies
-- Implementa l'isolamento multi-tenant con RLS su tutte le tabelle
-- IMPORTANTE: Applica questa migrazione DOPO la 003

-- =====================================================
-- ABILITA RLS SU TUTTE LE TABELLE
-- =====================================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cues ENABLE ROW LEVEL SECURITY;
ALTER TABLE versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICY: TEAMS
-- =====================================================
-- Gli utenti possono vedere solo i team di cui sono membri
CREATE POLICY "Users can view their teams"
  ON teams
  FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Gli utenti autenticati possono creare nuovi team
CREATE POLICY "Authenticated users can create teams"
  ON teams
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Solo gli owner possono modificare il team
CREATE POLICY "Team owners can update team"
  ON teams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
        AND team_id = teams.id
        AND role = 'owner'
    )
  );

-- Solo gli owner possono eliminare il team
CREATE POLICY "Team owners can delete team"
  ON teams
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
        AND team_id = teams.id
        AND role = 'owner'
    )
  );

-- =====================================================
-- POLICY: TEAM_MEMBERS
-- =====================================================
-- Gli utenti possono vedere i membri dei loro team
CREATE POLICY "Users can view team members"
  ON team_members
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Solo gli owner possono aggiungere membri
CREATE POLICY "Team owners can add members"
  ON team_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = team_members.team_id
        AND tm.role = 'owner'
    )
  );

-- Solo gli owner possono rimuovere membri (o l'utente può rimuovere se stesso)
CREATE POLICY "Team owners can remove members or users can leave"
  ON team_members
  FOR DELETE
  USING (
    user_id = auth.uid() -- Può rimuovere se stesso
    OR EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = team_members.team_id
        AND tm.role = 'owner'
    )
  );

-- Solo gli owner possono modificare i ruoli
CREATE POLICY "Team owners can update member roles"
  ON team_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = team_members.team_id
        AND tm.role = 'owner'
    )
  );

-- =====================================================
-- POLICY: PROJECTS
-- =====================================================
-- Gli utenti possono vedere i progetti dei loro team
CREATE POLICY "Team members can view projects"
  ON projects
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- I membri del team possono creare progetti (owner o editor)
CREATE POLICY "Team members can create projects"
  ON projects
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  );

-- Solo owner e editor possono modificare progetti
CREATE POLICY "Owners and editors can update projects"
  ON projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
        AND team_id = projects.team_id
        AND role IN ('owner', 'editor')
    )
  );

-- Solo gli owner possono eliminare progetti
CREATE POLICY "Team owners can delete projects"
  ON projects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
        AND team_id = projects.team_id
        AND role = 'owner'
    )
  );

-- =====================================================
-- POLICY: CUES
-- =====================================================
-- Gli utenti possono vedere i cue dei progetti del loro team
CREATE POLICY "Team members can view cues"
  ON cues
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Owner e editor possono creare cues
CREATE POLICY "Owners and editors can create cues"
  ON cues
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      INNER JOIN team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'editor')
    )
  );

-- Owner e editor possono modificare cues
CREATE POLICY "Owners and editors can update cues"
  ON cues
  FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      INNER JOIN team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'editor')
    )
  );

-- Solo owner possono eliminare cues
CREATE POLICY "Team owners can delete cues"
  ON cues
  FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      INNER JOIN team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
        AND tm.role = 'owner'
    )
  );

-- =====================================================
-- POLICY: VERSIONS
-- =====================================================
-- I membri possono vedere le versioni
CREATE POLICY "Team members can view versions"
  ON versions
  FOR SELECT
  USING (
    cue_id IN (
      SELECT c.id FROM cues c
      INNER JOIN projects p ON p.id = c.project_id
      INNER JOIN team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Owner e editor possono creare versioni
CREATE POLICY "Owners and editors can create versions"
  ON versions
  FOR INSERT
  WITH CHECK (
    cue_id IN (
      SELECT c.id FROM cues c
      INNER JOIN projects p ON p.id = c.project_id
      INNER JOIN team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'editor')
    )
  );

-- Owner e editor possono modificare versioni
CREATE POLICY "Owners and editors can update versions"
  ON versions
  FOR UPDATE
  USING (
    cue_id IN (
      SELECT c.id FROM cues c
      INNER JOIN projects p ON p.id = c.project_id
      INNER JOIN team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'editor')
    )
  );

-- Solo owner possono eliminare versioni
CREATE POLICY "Team owners can delete versions"
  ON versions
  FOR DELETE
  USING (
    cue_id IN (
      SELECT c.id FROM cues c
      INNER JOIN projects p ON p.id = c.project_id
      INNER JOIN team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
        AND tm.role = 'owner'
    )
  );

-- =====================================================
-- POLICY: COMMENTS
-- =====================================================
-- I membri possono vedere i commenti
CREATE POLICY "Team members can view comments"
  ON comments
  FOR SELECT
  USING (
    version_id IN (
      SELECT v.id FROM versions v
      INNER JOIN cues c ON c.id = v.cue_id
      INNER JOIN projects p ON p.id = c.project_id
      INNER JOIN team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Owner, editor e commenter possono creare commenti (NON i viewer)
CREATE POLICY "Members can create comments"
  ON comments
  FOR INSERT
  WITH CHECK (
    version_id IN (
      SELECT v.id FROM versions v
      INNER JOIN cues c ON c.id = v.cue_id
      INNER JOIN projects p ON p.id = c.project_id
      INNER JOIN team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'editor', 'commenter')
    )
  );

-- Gli utenti possono modificare solo i propri commenti, o gli owner possono modificare tutti
CREATE POLICY "Users can update own comments or owners can update all"
  ON comments
  FOR UPDATE
  USING (
    author = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR version_id IN (
      SELECT v.id FROM versions v
      INNER JOIN cues c ON c.id = v.cue_id
      INNER JOIN projects p ON p.id = c.project_id
      INNER JOIN team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
        AND tm.role = 'owner'
    )
  );

-- Gli utenti possono eliminare solo i propri commenti, o gli owner possono eliminare tutti
CREATE POLICY "Users can delete own comments or owners can delete all"
  ON comments
  FOR DELETE
  USING (
    author = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR version_id IN (
      SELECT v.id FROM versions v
      INNER JOIN cues c ON c.id = v.cue_id
      INNER JOIN projects p ON p.id = c.project_id
      INNER JOIN team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
        AND tm.role = 'owner'
    )
  );

-- =====================================================
-- POLICY: INVITES
-- =====================================================
-- Gli owner del team possono vedere gli inviti del loro team
CREATE POLICY "Team owners can view invites"
  ON invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
        AND team_id = invites.team_id
        AND role = 'owner'
    )
  );

-- Gli owner possono creare inviti
CREATE POLICY "Team owners can create invites"
  ON invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
        AND team_id = invites.team_id
        AND role = 'owner'
    )
  );

-- Gli owner possono revocare inviti
CREATE POLICY "Team owners can update invites"
  ON invites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
        AND team_id = invites.team_id
        AND role = 'owner'
    )
  );

-- Gli owner possono eliminare inviti
CREATE POLICY "Team owners can delete invites"
  ON invites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
        AND team_id = invites.team_id
        AND role = 'owner'
    )
  );

-- =====================================================
-- COMMENTI SULLA SICUREZZA
-- =====================================================
-- Queste policy implementano il modello multi-tenant:
-- - Ogni utente vede solo i dati dei team di cui fa parte
-- - I ruoli limitano le operazioni di scrittura
-- - Owner: tutti i permessi
-- - Editor: può modificare contenuti ma non gestire membri
-- - Commenter: può solo commentare
-- - Viewer: solo lettura
