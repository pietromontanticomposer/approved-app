-- fix_supabase_media.sql
-- Script di supporto per normalizzare campi media nelle versioni
-- Esegui in ambiente di staging o dopo aver fatto un backup del DB.

BEGIN;

-- 1) Backup rapido della tabella `versions`
DROP TABLE IF EXISTS versions_backup;
CREATE TABLE versions_backup AS SELECT * FROM versions;

-- 2) Estrarre storage path da `media_url` (signed o public Supabase URLs)
UPDATE versions
SET media_storage_path = regexp_replace(
  split_part(media_url, '?', 1),
  '^https?://[^/]+/storage/v1/object/(?:sign|public)/([^/]+)/(.*)$',
  '\\1/\\2'
)
WHERE media_url IS NOT NULL
  AND (media_storage_path IS NULL OR media_storage_path = '')
  AND media_url LIKE '%/storage/v1/object/%';

-- 3) Estrarre storage path da `media_thumbnail_url`
UPDATE versions
SET media_thumbnail_path = regexp_replace(
  split_part(media_thumbnail_url, '?', 1),
  '^https?://[^/]+/storage/v1/object/(?:sign|public)/([^/]+)/(.*)$',
  '\\1/\\2'
)
WHERE media_thumbnail_url IS NOT NULL
  AND (media_thumbnail_path IS NULL OR media_thumbnail_path = '')
  AND media_thumbnail_url LIKE '%/storage/v1/object/%';

-- 4) (OPZIONALE) Se preferisci rimuovere gli URL firmati salvati nel DB
-- dopo aver estratto il path, decommenta le due righe seguenti.
-- UPDATE versions SET media_url = NULL WHERE media_storage_path IS NOT NULL;
-- UPDATE versions SET media_thumbnail_url = NULL WHERE media_thumbnail_path IS NOT NULL;

-- 5) Inferire `media_type` da filename/storage path quando mancante
UPDATE versions
SET media_type = CASE
  WHEN (COALESCE(media_original_name, '') ~* '\\.(mp3|wav|aiff|aif|flac|aac|m4a|ogg|oga|opus)$'
        OR COALESCE(media_storage_path, '') ~* '\\.(mp3|wav|aiff|aif|flac|aac|m4a|ogg|oga|opus)$') THEN 'audio'
  WHEN (COALESCE(media_original_name, '') ~* '\\.(mp4|mov|mkv|webm|avi|m4v)$'
        OR COALESCE(media_storage_path, '') ~* '\\.(mp4|mov|mkv|webm|avi|m4v)$') THEN 'video'
  ELSE media_type
END
WHERE media_type IS NULL;

-- 6) Indici utili per velocizzare lookup per path
CREATE INDEX IF NOT EXISTS idx_versions_media_storage_path ON versions (media_storage_path);
CREATE INDEX IF NOT EXISTS idx_versions_media_thumbnail_path ON versions (media_thumbnail_path);

COMMIT;

-- NOTE:
-- - Verifica il risultato su un subset prima di applicare in produzione.
-- - Se la tua applicazione usa anche tabelle per reference versions, ripeti analoghe query
--   sostituendo `versions` con `reference_versions` (se esiste).
