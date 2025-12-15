-- Migration 006: Storage Policies per Multi-Tenant
-- Policy di sicurezza per Supabase Storage
-- IMPORTANTE: Queste policy vanno applicate manualmente dal Supabase Dashboard > Storage > Policies

-- =====================================================
-- STORAGE BUCKET: audio-files
-- =====================================================

-- POLICY: I membri del team possono vedere i file del loro team
-- Nome: "Team members can view team audio files"
-- Operation: SELECT
-- Policy Definition:
/*
(storage.foldername(name))[1] IN (
  SELECT team_id::text 
  FROM team_members 
  WHERE user_id = auth.uid()
)
*/

-- POLICY: Owner e Editor possono caricare file
-- Nome: "Owners and editors can upload audio files"
-- Operation: INSERT
-- Policy Definition:
/*
(storage.foldername(name))[1] IN (
  SELECT team_id::text 
  FROM team_members 
  WHERE user_id = auth.uid() 
    AND role IN ('owner', 'editor')
)
*/

-- POLICY: Owner e Editor possono aggiornare file
-- Nome: "Owners and editors can update audio files"
-- Operation: UPDATE
-- Policy Definition:
/*
(storage.foldername(name))[1] IN (
  SELECT team_id::text 
  FROM team_members 
  WHERE user_id = auth.uid() 
    AND role IN ('owner', 'editor')
)
*/

-- POLICY: Solo Owner possono eliminare file
-- Nome: "Team owners can delete audio files"
-- Operation: DELETE
-- Policy Definition:
/*
(storage.foldername(name))[1] IN (
  SELECT team_id::text 
  FROM team_members 
  WHERE user_id = auth.uid() 
    AND role = 'owner'
)
*/

-- =====================================================
-- ISTRUZIONI PER L'APPLICAZIONE MANUALE
-- =====================================================
-- 1. Vai su Supabase Dashboard > Storage
-- 2. Seleziona il bucket "audio-files"
-- 3. Vai su "Policies"
-- 4. Clicca "New Policy" per ogni policy sopra
-- 5. Copia il "Policy Definition" nella sezione "Policy Definition"
-- 6. Salva ogni policy
-- 
-- NOTA: Le policy storage devono essere create manualmente perché 
-- Supabase Storage usa un sistema diverso dalle policy RLS standard.
-- 
-- STRUTTURA DELLE CARTELLE:
-- Il sistema organizzerà i file così:
-- audio-files/
--   ├── {team_id_1}/
--   │   ├── audio1.mp3
--   │   └── audio2.mp3
--   └── {team_id_2}/
--       ├── audio3.mp3
--       └── audio4.mp3

-- =====================================================
-- FUNZIONE HELPER PER STORAGE POLICIES
-- =====================================================
CREATE OR REPLACE FUNCTION get_team_id_from_path(file_path TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Estrae il team_id dal path: "team_id/filename.mp3"
  v_team_id := (string_to_array(file_path, '/'))[1]::UUID;
  RETURN v_team_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION get_team_id_from_path IS 'Estrae il team_id dal path di un file storage';

-- =====================================================
-- QUERY DI VERIFICA
-- =====================================================
-- Dopo aver applicato le policy, usa queste query per verificare:

-- 1. Verifica che gli utenti vedano solo i file dei loro team
/*
SELECT 
  tm.user_id,
  tm.team_id,
  tm.role,
  COUNT(*) as file_count
FROM team_members tm
GROUP BY tm.user_id, tm.team_id, tm.role;
*/

-- 2. Verifica che i file siano organizzati per team
/*
SELECT 
  m.team_id,
  t.name as team_name,
  COUNT(*) as media_count,
  SUM(m.size) as total_size_bytes
FROM media m
INNER JOIN teams t ON t.id = m.team_id
GROUP BY m.team_id, t.name;
*/
