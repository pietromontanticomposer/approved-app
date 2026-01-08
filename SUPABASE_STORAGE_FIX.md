# 🚨 IL PROBLEMA È SUPABASE STORAGE PERMISSIONS

## 🔍 Root Cause

Il 403 NON viene dal nostro auth - viene da **Supabase Storage**!

Il file viene uploadato al 95%, poi Supabase Storage risponde con 403 Forbidden.

Il codice in `app/api/upload/route.ts:495` cattura questo errore da Supabase:

```typescript
// If provider returned a status (e.g., 403), propagate it
if (providerStatus === 403) {
  return NextResponse.json(
    { error: `Forbidden: ${bodyMessage}` },
    { status: 403 }
  );
}
```

## 🎯 Causa Specifica

Il bucket **"media"** su Supabase ha **RLS (Row Level Security)** abilitato che blocca gli upload ANCHE con `service_role_key`.

## ✅ SOLUZIONE IMMEDIATA

### Opzione 1: Disabilita RLS (più veloce)

1. Vai su **Supabase Dashboard**: https://supabase.com/dashboard
2. Seleziona il tuo progetto
3. **Storage** → Click sul bucket **"media"**
4. **Configuration** tab
5. Trova **"Public bucket"** e **attivalo**

OPPURE esegui questo SQL:

```sql
-- Nella sezione SQL Editor di Supabase
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

### Opzione 2: Crea Policy per service_role (più sicuro)

Esegui questo SQL nel **SQL Editor** di Supabase:

```sql
-- Allow service_role to insert objects in media bucket
CREATE POLICY "Allow service_role insert"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'media');

-- Allow service_role to select objects
CREATE POLICY "Allow service_role select"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'media');

-- Allow service_role to update objects
CREATE POLICY "Allow service_role update"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'media');

-- Allow service_role to delete objects
CREATE POLICY "Allow service_role delete"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'media');
```

### Opzione 3: Rendi il bucket pubblico per upload

```sql
-- Make media bucket public for authenticated uploads
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Allow public reads
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');
```

## 🧪 Come Verificare

Dopo aver applicato una delle soluzioni:

1. Vai sull'app: https://approved-app-eight.vercel.app
2. Prova l'upload
3. **DOVREBBE FUNZIONARE** ✅

## 📊 Perché Falliva

1. ✅ Il nostro auth funziona (altrimenti fallirebbe subito, non al 95%)
2. ✅ Gli headers sono corretti
3. ✅ Il file viene trasmesso
4. ❌ Supabase Storage blocca l'upload con 403
5. ❌ Il nostro server propaga il 403 al client

## 🔧 Verifica Attuale

Controlla le policy esistenti con questa query:

```sql
SELECT *
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage';
```

Controlla se RLS è attivo:

```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'objects'
AND relnamespace = 'storage'::regnamespace;
```

## ⚠️ IMPORTANTE

Il `service_role_key` che usi nell'app **DOVREBBE** bypassare RLS, ma a volte Supabase Storage ha configurazioni che richiedono policy esplicite.

---

**La soluzione più veloce**: Vai su Supabase Dashboard → Storage → media → Make Public

Poi testa l'upload!
