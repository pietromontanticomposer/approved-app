# 🚨 ISTRUZIONI IMMEDIATE PER FAR FUNZIONARE I LOGIN

## Problema Attuale
❌ Le funzioni PostgreSQL per gli inviti non sono state applicate
❌ Quindi la pagina `/invite/[token]` NON funziona ancora

---

## ✅ SOLUZIONE RAPIDA (5 minuti)

### STEP 1: Applica le Funzioni SQL

1. **Apri Supabase Dashboard**: https://supabase.com/dashboard/project/waaigankcctijalvlppk

2. **Vai su SQL Editor** (icona database a sinistra)

3. **Clicca "New Query"**

4. **Copia TUTTO il contenuto del file** `migrations/005_invite_functions.sql`

5. **Incolla nell'editor SQL**

6. **Clicca "Run"** (o premi Ctrl+Enter)

7. **Verifica che compaia**: ✅ Success. No rows returned

---

### STEP 2: Testa che Funzioni

Dopo aver applicato le funzioni SQL, testa:

```bash
node check_supabase.js
```

Dovresti vedere:
```
✅ Function 'get_invite_details': EXISTS
```

---

## Alternative: Applica tramite terminale

Se preferisci il terminale:

```bash
# Opzione 1: Via psql (se hai PostgreSQL installato)
PGPASSWORD='Zambelli123@' psql "postgresql://postgres@db.waaigankcctijalvlppk.supabase.co:5432/postgres" -f migrations/005_invite_functions.sql

# Opzione 2: Usa l'apply_migrations.js
node apply_migrations.js migrations/005_invite_functions.sql
```

---

## DOPO AVER APPLICATO LE FUNZIONI

Testa il login:

1. Vai su http://localhost:3000/login
2. Clicca "✨ Accedi senza password (Magic Link)"
3. Inserisci una tua email
4. Controlla la casella → clicca il link
5. ✅ Dovresti essere loggato!

---

## Configurazioni Opzionali (da fare dopo)

### OAuth Google/Apple
- Dashboard Supabase → Authentication → Providers
- Abilita Google/Apple
- Configura credenziali

### Storage Policies
- Dashboard Supabase → Storage → audio-files → Policies
- Crea le 4 policy dal file `migrations/006_storage_policies.sql`

---

## Cosa è già stato fatto ✅

- ✅ Tabelle `teams`, `team_members`, `invites` create
- ✅ RLS policies applicate
- ✅ Progetti esistenti aggiornati con `team_id`
- ✅ UI Login con Magic Link, OAuth
- ✅ UI Share Modal completa
- ✅ Pagina `/invite/[token]` creata
- ✅ API `/api/invites` funzionante

---

## Cosa manca ❌

- ❌ Funzioni SQL da applicare manualmente (STEP 1 sopra)
- ⚠️  OAuth non configurato (opzionale)
- ⚠️  Storage policies non applicate (opzionale)

---

**👉 FAI LO STEP 1 E SEI PRONTO!**
