#!/bin/bash
# Script to apply migration 009_project_notes.sql to Supabase

# Load environment variables
source .env.local 2>/dev/null || true

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ Error: NEXT_PUBLIC_SUPABASE_URL not set in .env.local"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not set in .env.local"
  exit 1
fi

echo "🚀 Applying migration 009_project_notes.sql to Supabase..."
echo "📁 Database: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Extract project reference from URL (e.g., https://xxx.supabase.co -> xxx)
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -E 's/https?:\/\/([^.]+).*/\1/')

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "⚠️  Supabase CLI not found. Installing via npm..."
  npm install -g supabase
fi

# Apply migration using Supabase CLI
echo "📝 Executing SQL migration..."
supabase db push --db-url "postgresql://postgres:[YOUR_DB_PASSWORD]@db.$PROJECT_REF.supabase.co:5432/postgres" \
  --include-all \
  --dry-run=false

echo ""
echo "✅ Migration applied successfully!"
echo ""
echo "🔍 Verifying tables..."
echo "   - project_notes"
echo "   - cue_notes"
echo ""
echo "✨ You can now use the Notes feature!"
