#!/bin/bash
# Test script for diagnosing 403 upload errors
# Usage: ./test-upload-403.sh [project-id]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_URL="https://approved-app-eight.vercel.app"
TEST_USER_ID="test-user-$(date +%s)"
PROJECT_ID="${1:-}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Upload 403 Diagnostic Test${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 1: Check if project ID provided
if [ -z "$PROJECT_ID" ]; then
  echo -e "${YELLOW}⚠ No project ID provided${NC}"
  echo -e "${YELLOW}Usage: $0 <project-id>${NC}\n"

  echo -e "${BLUE}Fetching a project ID from API...${NC}"
  PROJECTS_JSON=$(curl -s "${APP_URL}/api/projects" \
    -H "Authorization: Bearer demo" \
    -H "x-actor-id: ${TEST_USER_ID}")

  PROJECT_ID=$(echo "$PROJECTS_JSON" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/')

  if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}✗ Could not fetch a project ID. Please provide one manually.${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ Using project ID: ${PROJECT_ID}${NC}\n"
fi

# Step 2: Create test file
echo -e "${BLUE}Creating test file...${NC}"
TEST_FILE="test-upload-$(date +%s).txt"
echo "Test upload from script at $(date)" > "$TEST_FILE"
echo -e "${GREEN}✓ Created ${TEST_FILE}${NC}\n"

# Step 3: Test upload WITHOUT x-actor-id (should fail)
echo -e "${BLUE}Test 1: Upload WITHOUT x-actor-id (should fail with 401)${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer demo" \
  -F "file=@${TEST_FILE}" \
  -F "projectId=${PROJECT_ID}" \
  "${APP_URL}/api/upload")

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ PASS: Got 401 as expected (no x-actor-id)${NC}\n"
else
  echo -e "${RED}✗ FAIL: Expected 401, got ${HTTP_CODE}${NC}\n"
fi

# Step 4: Test upload WITH x-actor-id (should succeed or give 403)
echo -e "${BLUE}Test 2: Upload WITH x-actor-id${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer demo" \
  -H "x-actor-id: ${TEST_USER_ID}" \
  -F "file=@${TEST_FILE}" \
  -F "projectId=${PROJECT_ID}" \
  "${APP_URL}/api/upload")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo -e "HTTP Status: ${HTTP_CODE}"
echo -e "Response Body:\n${BODY}\n"

if [ "$HTTP_CODE" = "201" ]; then
  echo -e "${GREEN}✓✓✓ SUCCESS: Upload completed!${NC}"
  echo -e "${GREEN}The 403 issue is FIXED! 🎉${NC}\n"
elif [ "$HTTP_CODE" = "403" ]; then
  echo -e "${RED}✗✗✗ FAIL: Still getting 403 Forbidden${NC}"
  echo -e "${YELLOW}Possible causes:${NC}"
  echo -e "  1. APP_ALLOW_PUBLIC_USER not set or not '1'"
  echo -e "  2. Supabase Storage bucket permissions/RLS"
  echo -e "  3. SUPABASE_SERVICE_ROLE_KEY incorrect"
  echo -e "  4. Bucket 'media' doesn't exist\n"
elif [ "$HTTP_CODE" = "401" ]; then
  echo -e "${RED}✗ FAIL: Still getting 401 (x-actor-id not recognized)${NC}\n"
elif [ "$HTTP_CODE" = "400" ]; then
  echo -e "${YELLOW}⚠ FAIL: Got 400 Bad Request${NC}"
  echo -e "${YELLOW}Check if projectId is valid: ${PROJECT_ID}${NC}\n"
else
  echo -e "${YELLOW}⚠ Unexpected status: ${HTTP_CODE}${NC}\n"
fi

# Step 5: Check Vercel environment variables
echo -e "${BLUE}Test 3: Checking Vercel environment variables${NC}"
if command -v vercel &> /dev/null; then
  echo -e "${GREEN}✓ Vercel CLI found${NC}"

  ENV_OUTPUT=$(vercel env ls 2>&1 || echo "ERROR")

  if echo "$ENV_OUTPUT" | grep -q "APP_ALLOW_PUBLIC_USER"; then
    echo -e "${GREEN}✓ APP_ALLOW_PUBLIC_USER is set${NC}"
  else
    echo -e "${RED}✗ APP_ALLOW_PUBLIC_USER is NOT set${NC}"
    echo -e "${YELLOW}Run: vercel env add APP_ALLOW_PUBLIC_USER${NC}"
  fi

  if echo "$ENV_OUTPUT" | grep -q "SUPABASE_SERVICE_ROLE_KEY"; then
    echo -e "${GREEN}✓ SUPABASE_SERVICE_ROLE_KEY is set${NC}"
  else
    echo -e "${RED}✗ SUPABASE_SERVICE_ROLE_KEY is NOT set${NC}"
  fi
  echo ""
else
  echo -e "${YELLOW}⚠ Vercel CLI not installed (skipping env check)${NC}\n"
fi

# Step 6: Check git status
echo -e "${BLUE}Test 4: Checking git status${NC}"
CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo -e "Current commit: ${CURRENT_COMMIT}"

LATEST_COMMITS=$(git log --oneline -3 2>/dev/null || echo "Could not fetch commits")
echo -e "Recent commits:\n${LATEST_COMMITS}\n"

# Cleanup
echo -e "${BLUE}Cleaning up test file...${NC}"
rm -f "$TEST_FILE"
echo -e "${GREEN}✓ Cleanup complete${NC}\n"

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Test User ID: ${TEST_USER_ID}"
echo -e "Project ID: ${PROJECT_ID}"
echo -e "Final Status: ${HTTP_CODE}"
echo ""

if [ "$HTTP_CODE" = "201" ]; then
  echo -e "${GREEN}✓ ALL TESTS PASSED - Upload working! 🎉${NC}"
  exit 0
else
  echo -e "${RED}✗ Tests failed - see details above${NC}"
  echo -e "${YELLOW}Check UPLOAD_403_TROUBLESHOOTING.md for next steps${NC}"
  exit 1
fi
