#!/bin/bash

# Test Admin API Endpoints
# This script tests the admin rate limit monitoring endpoints

echo "=== ADMIN API TEST ==="
echo ""

# Configuration
ADMIN_API_URL="http://localhost:3000/api/admin/rate-limits"

# Check if SUPABASE_SERVICE_ROLE_KEY is set
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set"
  echo ""
  echo "To run this test:"
  echo "  1. Get your service role key from Supabase dashboard"
  echo "  2. Set environment variable:"
  echo "     export SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'"
  echo "  3. Re-run this script"
  exit 1
fi

echo "Configuration:"
echo "  API URL: $ADMIN_API_URL"
echo "  Auth: Using SUPABASE_SERVICE_ROLE_KEY"
echo ""

# Test 1: Get all users' rate limits
echo "Test 1: Get all users' rate limit status"
echo "────────────────────────────────────────────────────────"
curl -s -X GET "$ADMIN_API_URL" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq '.'

echo ""

# Test 2: Get specific user's rate limits
TEST_USER_ID="550e8400-e29b-41d4-a716-446655440000"
echo "Test 2: Get specific user's rate limit status"
echo "────────────────────────────────────────────────────────"
echo "User ID: $TEST_USER_ID"
curl -s -X GET "$ADMIN_API_URL?user_id=$TEST_USER_ID" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq '.'

echo ""

# Test 3: Reset user's rate limits
echo "Test 3: Reset user's rate limits"
echo "────────────────────────────────────────────────────────"
echo "User ID: $TEST_USER_ID"
read -p "Are you sure you want to reset rate limits for this user? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  curl -s -X DELETE "$ADMIN_API_URL?user_id=$TEST_USER_ID" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" | jq '.'
else
  echo "Skipped reset operation"
fi

echo ""

# Test 4: Unauthorized access (without service role key)
echo "Test 4: Unauthorized access (should fail)"
echo "────────────────────────────────────────────────────────"
curl -s -X GET "$ADMIN_API_URL" | jq '.'

echo ""
echo "=== TEST COMPLETE ==="
