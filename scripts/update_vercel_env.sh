#!/usr/bin/env bash
set -euo pipefail

echo "This script helps you update Vercel environment variables with your Supabase Pooler URI."
echo "It runs locally and will ask you to paste the Pooler connection string (kept only on your machine)."

read -r -p "Vercel project name (e.g. my-team/my-project) or leave empty to skip project flag: " VERCEL_PROJECT
read -r -p "Enter your Supabase Pooler (Postgres) connection string (transaction mode, port 6543). Paste it and press Enter: " POOLER_URI

if ! command -v vercel >/dev/null 2>&1; then
  echo "vercel CLI not found. Install it: npm i -g vercel" >&2
  exit 1
fi

echo "You can run this script multiple times; it will add the variable to production/preview/development."

ENV_CMD_BASE=(vercel env add SUPABASE_DB_URL)
if [ -n "$VERCEL_PROJECT" ]; then
  ENV_CMD_BASE+=(--project "$VERCEL_PROJECT")
fi

for ENV in production preview development; do
  echo "Adding SUPABASE_DB_URL to Vercel ($ENV)..."
  # Pipe the value to vercel env add which expects the value interactively
  printf "%s\n" "$POOLER_URI" | ${ENV_CMD_BASE[@]} $ENV
done

echo "Optionally, if your app uses DATABASE_URL instead of SUPABASE_DB_URL, run the following commands in your terminal (paste the same Pooler URI when asked):"
if [ -n "$VERCEL_PROJECT" ]; then
  echo "  vercel env add DATABASE_URL production --project $VERCEL_PROJECT"
  echo "  vercel env add DATABASE_URL preview --project $VERCEL_PROJECT"
  echo "  vercel env add DATABASE_URL development --project $VERCEL_PROJECT"
else
  echo "  vercel env add DATABASE_URL production"
  echo "  vercel env add DATABASE_URL preview"
  echo "  vercel env add DATABASE_URL development"
fi

echo "Done. After updating env variables, redeploy your Vercel project (manual redeploy)."
