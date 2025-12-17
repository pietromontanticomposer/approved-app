#!/usr/bin/env bash
set -euo pipefail

if [ -z "${PROD_URL:-}" ]; then
  echo "Usage: PROD_URL=https://your-deploy.vercel.app ./scripts/smoke_e2e_prod.sh"
  exit 1
fi

echo "Running smoke E2E against $PROD_URL"

create_resp=$(curl -s -X POST -H "Content-Type: application/json" -d '{"name":"smoke-prod-'"$(date +%s)"'","team_id":"auto"}' "$PROD_URL/api/projects")
echo "create_resp: $create_resp"
project_id=$(node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log((d.project&&d.project.id)||'');" <<< "$create_resp")
if [ -z "$project_id" ]; then echo "Failed to create project"; exit 2; fi
echo "project_id=$project_id"

create_share_resp=$(curl -s -X POST -H "Content-Type: application/json" -H "x-actor-id: 65e6a4da-631d-4fb2-a1d3-988847890aa7" -d "{\"project_id\":\"$project_id\"}" "$PROD_URL/api/projects/share")
echo "create_share_resp: $create_share_resp"
share_id=$(node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.id||'');" <<< "$create_share_resp")
link=$(node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.link||'');" <<< "$create_share_resp")
echo "share_id=$share_id link=$link"

token=$(node -e "const l=process.argv[1]||''; const m=l.split('token=')[1]||''; console.log(decodeURIComponent(m));" "$link")
echo "token extracted"

details=$(curl -s "$PROD_URL/api/share/details?share_id=$share_id&token=$(node -e "const t=process.argv[1]||''; console.log(encodeURIComponent(t));" "$token")")
echo "details: $details"

# Redeem as velvet user ID
redeem_resp=$(curl -s -X POST -H "Content-Type: application/json" -H "x-actor-id: 519c4346-cc31-439a-b01e-937660df8f5a" -d "{\"share_id\":\"$share_id\",\"token\":\"$token\"}" "$PROD_URL/api/share/redeem")
echo "redeem_resp: $redeem_resp"

echo "Smoke E2E production done"
