#!/usr/bin/env bash
set -euo pipefail

echo "This script will check invites for a given email and optionally insert missing project_members."
echo "It runs locally and requires psql (Postgres client) and node to be installed."

read -r -p "Enter the target email to check (e.g. velvetpianoofficial@gmail.com): " TARGET_EMAIL

read -r -p "Enter your Supabase Pooler (Postgres) connection string (will not be shown): " -s DB_URI
echo

export SUPABASE_DB_URL="$DB_URI"

echo "Running Node DB connection check (check_db.js)..."
node check_db.js || { echo "check_db.js failed — aborting"; exit 1; }

echo
echo "Querying invites and project_members for $TARGET_EMAIL"

PSQL_CMD="psql \"$DB_URI\" -v ON_ERROR_STOP=1 -q -t -A -c"

echo "-- Invites for the email --"
eval "$PSQL_CMD \"SELECT id, project_id, email, role, invited_by, used_at FROM invites WHERE email = '$TARGET_EMAIL';\""

echo "\n-- auth.users matching the email --"
eval "$PSQL_CMD \"SELECT id, email FROM auth.users WHERE email = '$TARGET_EMAIL';\""

echo "\n-- project_members for that user (if any) --"
eval "$PSQL_CMD \"SELECT pm.project_id, pm.member_id, pm.role, pm.added_by, pm.added_at FROM project_members pm JOIN auth.users u ON u.id = pm.member_id WHERE u.email = '$TARGET_EMAIL';\""

echo
read -r -p "If missing project_members should be inserted, type 'yes' to run the fix INSERT now: " CONFIRM
if [ "$CONFIRM" = "yes" ]; then
  echo "Running INSERT to add missing project_members (this is idempotent)..."
  read -r -p "(confirm) run INSERT now? Type 'run' to proceed: " RUNCONFIRM
  if [ "$RUNCONFIRM" = "run" ]; then
    SQL=$(cat <<'SQL'
INSERT INTO project_members (project_id, member_id, role, added_by, added_at)
SELECT 
  i.project_id,
  u.id as member_id,
  i.role,
  i.invited_by,
  i.used_at
FROM invites i
JOIN auth.users u ON u.email = i.email
WHERE i.used_at IS NOT NULL 
  AND i.project_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_members pm 
    WHERE pm.project_id = i.project_id AND pm.member_id = u.id
  )
ON CONFLICT (project_id, member_id) DO NOTHING;
SQL

    # execute
    printf "%s" "$SQL" | psql "$DB_URI"
    echo "INSERT completed."
  else
    echo "Aborted by user. No changes made."
  fi
else
  echo "No changes requested. Exiting."
fi

echo "Done. If you updated Vercel environment variables, remember to redeploy the site."
