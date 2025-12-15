#!/usr/bin/env bash
set -euo pipefail

# Smoke E2E script (local)
# Usage: source .env.local && ./scripts/smoke_e2e.sh

echo "Starting smoke E2E test against http://localhost:3000"

# 1) create project
create_resp=$(curl -s -X POST -H "Content-Type: application/json" -d '{"name":"smoke-test-project","team_id":"auto"}' http://localhost:3000/api/projects)
echo "create_resp: $create_resp"
project_id=$(node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log((d.project && d.project.id) || '');" <<< "$create_resp") || true
if [ -z "$project_id" ]; then echo "Failed to create project"; exit 2; fi
echo "project_id=$project_id"

# 2) create share
create_share_resp=$(curl -s -X POST -H "Content-Type: application/json" -H "x-actor-id: 65e6a4da-631d-4fb2-a1d3-988847890aa7" -d "{\"project_id\":\"$project_id\"}" http://localhost:3000/api/projects/share)
echo "create_share_resp: $create_share_resp"
share_id=$(node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.id||'');" <<< "$create_share_resp") || true
link=$(node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.link||'');" <<< "$create_share_resp") || true
echo "share_id=$share_id link=$link"

# 3) details (no auth)
tok=$(node -e "const l=process.argv[1]||''; const m=l.split('token=')[1]||''; console.log(encodeURIComponent(m));" "$link")
details=$(curl -s "http://localhost:3000/api/share/details?share_id=$share_id&token=$tok")
echo "details: $details"

echo "Smoke test done"
