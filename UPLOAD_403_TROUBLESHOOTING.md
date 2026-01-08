# Upload 403 Troubleshooting Guide

## Data: 2026-01-08

## Fixes Implementati

### ✅ Fix #1: Header x-actor-id nell'XHR Upload
**File**: [public/flow.js:1808-1810](public/flow.js#L1808-L1810)
```javascript
if (session.user?.id) {
  xhr.setRequestHeader('x-actor-id', session.user.id);
}
```

### ✅ Fix #2: APP_ALLOW_PUBLIC_USER su Vercel
**Stato**: Configurato in Production (1h ago)
```bash
vercel env ls
# APP_ALLOW_PUBLIC_USER = Encrypted (Production)
```

### ✅ Fix #3: canModifyProject in Modalità Pubblica
**File**: [lib/auth.ts:131-133](lib/auth.ts#L131-L133)
```typescript
const allowPublic = process.env.APP_ALLOW_PUBLIC_USER === '1';
if (allowPublic) return true;
```

---

## Passi per Verificare il Fix

### 1. Verifica Deploy Completato
```bash
# Check ultimo deploy
vercel ls approved-app-eight --limit 1

# O visita Vercel Dashboard
https://vercel.com/<your-team>/approved-app-eight/deployments
```

### 2. Hard Refresh del Browser
**IMPORTANTE**: La cache browser potrebbe servire la vecchia versione di `flow.js`

- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) o `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` o `Cmd+Shift+R`
- **Safari**: `Cmd+Option+R`

Oppure:
1. Apri DevTools (F12)
2. Vai su **Network** tab
3. Spunta **"Disable cache"**
4. Ricarica la pagina

### 3. Verifica Headers Inviati
Apri DevTools (F12) → Network tab → Prova l'upload:

1. Cerca la richiesta **POST /api/upload**
2. Click → **Headers** → **Request Headers**
3. Verifica che siano presenti:
   ```
   Authorization: Bearer demo
   x-actor-id: <il-tuo-demo-user-id>
   ```

### 4. Controlla Console Logs
DevTools → **Console** tab

Cerca:
```
[Upload] Auth headers set - user: <user-id>
```

Se vedi:
```
[Upload] No session/token found!
```
Allora il problema è ancora lato client.

### 5. Verifica Logs Server (Vercel)
```bash
# Real-time logs durante l'upload
vercel logs --app approved-app-eight --follow

# O nel Vercel Dashboard:
# https://vercel.com/.../approved-app-eight/logs
```

Cerca:
```
[POST /api/upload] Authenticated user: <user-id>
[POST /api/upload] Permission check: { userId: '...', projectId: '...', canModify: true }
[POST /api/upload] Permission check PASSED
```

Se vedi:
```
[POST /api/upload] FORBIDDEN: User ... forbidden from uploading
```
Allora `APP_ALLOW_PUBLIC_USER` non è attivo.

---

## Possibili Cause Residue (se ancora 403)

### A. Supabase Storage Bucket Permissions

Il bucket `media` potrebbe avere RLS (Row Level Security) che blocca anche il `service_role_key`.

**Soluzione**:
1. Vai su Supabase Dashboard → Storage → `media` bucket
2. Verifica **Policies**
3. Se RLS è abilitato, aggiungi policy per `service_role`:
   ```sql
   -- Allow service_role to upload
   CREATE POLICY "Allow service_role uploads"
   ON storage.objects FOR INSERT
   TO service_role
   WITH CHECK (bucket_id = 'media');
   ```

4. Oppure **disabilita RLS** sul bucket (se solo per testing):
   ```sql
   ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
   ```

### B. Supabase Service Role Key Errata

Verifica che `SUPABASE_SERVICE_ROLE_KEY` su Vercel sia corretta:

```bash
# Controlla lunghezza (dovrebbe essere ~200+ caratteri)
vercel env ls

# Confronta con Supabase Dashboard:
# Project Settings → API → service_role key (secret)
```

### C. Bucket "media" Non Esiste

Verifica che il bucket esista su Supabase:
1. Supabase Dashboard → Storage
2. Cerca bucket chiamato **"media"**
3. Se non esiste, crealo:
   - Name: `media`
   - Public: **No** (usiamo signed URLs)
   - File size limit: 500MB

### D. Environment Variable Non Applicata

Se `APP_ALLOW_PUBLIC_USER` è stata aggiunta di recente, potrebbe non essere nel deployment attuale:

```bash
# Forza un nuovo deploy
vercel --prod

# O fai un commit dummy per triggerare auto-deploy
git commit --allow-empty -m "Trigger deploy for env var update"
git push origin main
```

---

## Test Diretti (da terminale)

### Test 1: API Upload con Demo Auth
```bash
# Crea file di test
echo "test content" > test.txt

# Test con demo auth + x-actor-id
curl -v \
  -H "Authorization: Bearer demo" \
  -H "x-actor-id: test-user-123" \
  -F "file=@test.txt" \
  -F "projectId=<un-project-id-valido>" \
  https://approved-app-eight.vercel.app/api/upload
```

**Aspettato**:
- Status: `201 Created`
- Response: `{ "success": true, "path": "...", "mediaUrl": "..." }`

**Se 401**: Manca header x-actor-id
**Se 403**: Problema con `canModifyProject` o bucket permissions
**Se 400**: `projectId` non valido

### Test 2: Verifica Auth Endpoint
```bash
# Test auth demo
curl -v \
  -H "Authorization: Bearer demo" \
  -H "x-actor-id: test-user-123" \
  https://approved-app-eight.vercel.app/api/upload
```

---

## Quick Fix Checklist

- [ ] Deploy completato su Vercel
- [ ] Hard refresh del browser (Ctrl+Shift+R)
- [ ] Headers `Authorization` + `x-actor-id` presenti in Network tab
- [ ] Console mostra `[Upload] Auth headers set`
- [ ] Logs Vercel mostrano `Permission check PASSED`
- [ ] `APP_ALLOW_PUBLIC_USER=1` visibile in `vercel env ls`
- [ ] Bucket `media` esiste su Supabase
- [ ] `SUPABASE_SERVICE_ROLE_KEY` corretta (lunghezza ~200+ chars)

---

## Contatti Utili

- **Vercel Dashboard**: https://vercel.com
- **Supabase Dashboard**: https://supabase.com/dashboard
- **App Live**: https://approved-app-eight.vercel.app

## Commit Recenti
```
c6d1a07 Add bucket diagnostics for upload route
f753866 Add upload diagnostic + env fallbacks for Supabase keys
291c93d CRITICAL FIX: Add x-actor-id header to upload XHR - fixes 401/403
c663b0e Fix 403: allow public user uploads when APP_ALLOW_PUBLIC_USER=1
96ca4da Add detailed error logging for 403 debugging
```

---

## Se Tutto Fallisce

1. Controlla che il demo user ID sia consistente:
   - Apri DevTools Console
   - Esegui: `localStorage.getItem('demoUserId')`
   - Dovrebbe essere lo stesso in ogni ricarica

2. Prova a creare un vero account Supabase:
   - Login con email/password
   - Testa l'upload con auth vera

3. Verifica che il problema sia specifico al 403:
   - Prova altri endpoint (es. GET projects)
   - Verifica che l'autenticazione funzioni altrove

---

**Ultimo aggiornamento**: 2026-01-08 19:30 CET
