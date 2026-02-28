-- SUPABASE STORAGE COMPLETE POLICIES
-- Esegui questo nel SQL Editor di Supabase Dashboard

-- 1. Policy INSERT (già creata, ma la includiamo per completezza)
CREATE POLICY IF NOT EXISTS "Allow service_role uploads"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'media');

CREATE POLICY IF NOT EXISTS "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- 2. Policy SELECT (necessaria per verificare l'esistenza del file)
CREATE POLICY IF NOT EXISTS "Allow service_role select"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'media');

CREATE POLICY IF NOT EXISTS "Allow authenticated select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'media');

-- 3. Policy UPDATE (necessaria se upsert o per aggiornare metadata)
CREATE POLICY IF NOT EXISTS "Allow service_role update"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'media');

CREATE POLICY IF NOT EXISTS "Allow authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media');

-- 4. Policy DELETE (utile per cancellazione file)
CREATE POLICY IF NOT EXISTS "Allow service_role delete"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'media');

CREATE POLICY IF NOT EXISTS "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media');

-- 5. Verifica che RLS sia attivo (dovrebbe essere true)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 6. Verifica tutte le policy create
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
