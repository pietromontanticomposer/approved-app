# 🚨 ISTRUZIONI URGENTI PER RISOLVERE IL CARICAMENTO LENTO

## Problema Critico Rilevato

Il database Supabase ha lo schema vecchio con `projects.title` invece di `projects.name`.
Questo causa errori 500 su **TUTTE** le richieste a `/api/projects` e blocca completamente l'applicazione.

```
Errore nei log:
column projects.title does not exist (code: 42703)
```

## Soluzione: Applicare le Migration

### Opzione 1: Via Supabase SQL Editor (CONSIGLIATA)

1. Vai su [Supabase Dashboard](https://app.supabase.com)
2. Seleziona il tuo progetto
3. Clicca su "SQL Editor" nel menu laterale
4. Crea una "New Query"
5. Copia e incolla il contenuto di `migrations/001_init.sql`
6. Clicca "RUN"
7. Ripeti per le altre migration in ordine:
   - `002_add_missing_columns.sql`
   - `003_multi_tenant_setup.sql`
   - `010_add_owner_id_to_projects.sql`

### Opzione 2: Via Connection String (se configurata)

Se hai configurato `SUPABASE_DB_URL` nel file `.env.local`:

```bash
# Verifica che la variabile sia presente
cat .env.local | grep SUPABASE_DB_URL

# Esegui la migration via API (solo in development)
curl -X POST http://localhost:3000/api/migrate
```

**NOTA**: L'endpoint `/api/migrate` attualmente NON richiede autenticazione ed è una vulnerabilità di sicurezza (verrà fixata).

### Opzione 3: Via psql (Avanzato)

Se hai `psql` installato:

```bash
psql "YOUR_SUPABASE_DB_URL" < migrations/001_init.sql
```

## Verifica che la Migration sia Applicata

Dopo aver eseguito le migration, verifica con questa query SQL:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'projects'
  AND table_schema = 'public';
```

Dovresti vedere `name` invece di `title`.

## Dopo la Migration

1. Riavvia il server dev: `npm run dev`
2. Ricarica la pagina nel browser
3. Il caricamento dovrebbe essere molto più veloce (< 1 secondo)

## Altri Problemi Trovati (non bloccanti)

Vedi il file `PERFORMANCE_REPORT.md` per una lista completa di ottimizzazioni consigliate.
