#!/bin/bash

# Test Request Logging
# This script tests that requests are being logged to the database

echo "=== REQUEST LOGGING TEST ==="
echo ""

# Configuration
API_URL="http://localhost:3000/api/mobile/exam-questions"
TEST_USER_ID="550e8400-e29b-41d4-a716-446655440000"
TEST_IMAGE="assets/images/physics_hires/fyssa2_hires.jpg"

# Check if image exists
if [ ! -f "$TEST_IMAGE" ]; then
  echo "❌ Error: Test image not found at $TEST_IMAGE"
  exit 1
fi

echo "Configuration:"
echo "  API URL: $API_URL"
echo "  User ID: $TEST_USER_ID"
echo "  Image: $TEST_IMAGE"
echo ""

# Make a test request
echo "Step 1: Making test API request..."
echo "────────────────────────────────────────────────────────"

RESPONSE=$(curl -s -X POST "$API_URL" \
  -F "images=@$TEST_IMAGE" \
  -F "user_id=$TEST_USER_ID" \
  -F "category=mathematics" \
  -F "grade=5" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

echo "Response Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" == "200" ]; then
  echo "✅ Request successful"
else
  echo "❌ Request failed with status $HTTP_STATUS"
  echo "$RESPONSE"
  exit 1
fi

echo ""
echo "Step 2: Check server logs for logging confirmation"
echo "────────────────────────────────────────────────────────"
echo "Look for these lines in your server console:"
echo "  [RequestLogger] Initialized (enabled: true)"
echo "  (No error about 'api_request_logs' table missing)"
echo ""
echo "If you see this error, the migration didn't work:"
echo "  ❌ [RequestLogger] Failed to insert log: Could not find the table..."
echo ""

# Pause for user to check
read -p "Did you see '[RequestLogger] Initialized' without errors? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "❌ Migration may not have been applied correctly"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Check Supabase Dashboard → Table Editor"
  echo "  2. Verify 'api_request_logs' table exists"
  echo "  3. Check migration SQL ran without errors"
  echo "  4. Restart dev server: Ctrl+C then 'npm run dev'"
  exit 1
fi

echo ""
echo "Step 3: Verify log entry in Supabase Dashboard"
echo "────────────────────────────────────────────────────────"
echo ""
echo "Go to Supabase Dashboard and run this query:"
echo ""
echo "────────────────────────────────────────────────────────"
echo "SELECT"
echo "  request_id,"
echo "  user_id,"
echo "  endpoint,"
echo "  response_status,"
echo "  has_valid_jwt,"
echo "  auth_source,"
echo "  rate_limit_status,"
echo "  rate_limit_remaining,"
echo "  created_at"
echo "FROM api_request_logs"
echo "ORDER BY created_at DESC"
echo "LIMIT 5;"
echo "────────────────────────────────────────────────────────"
echo ""
echo "Expected result:"
echo "  - 1+ rows returned"
echo "  - user_id: $TEST_USER_ID"
echo "  - endpoint: /api/mobile/exam-questions"
echo "  - response_status: 200"
echo "  - has_valid_jwt: false"
echo "  - auth_source: body"
echo "  - rate_limit_status: passed"
echo "  - rate_limit_remaining: 9 (or less)"
echo ""

read -p "Did you see the log entry in Supabase? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "✅ REQUEST LOGGING TEST PASSED!"
  echo "═══════════════════════════════════════════════════════"
  echo ""
  echo "✓ Migration applied successfully"
  echo "✓ Request logged to database"
  echo "✓ All fields captured correctly"
  echo ""
  echo "Next steps:"
  echo "  1. Run rate limiting test: ./scripts/test-rate-limiting.sh"
  echo "  2. Run JWT validation test: ./scripts/test-jwt-validation.sh"
  echo "  3. Run admin API test: ./scripts/test-admin-api.sh"
else
  echo ""
  echo "❌ REQUEST LOGGING TEST FAILED"
  echo ""
  echo "The table exists but no logs are being written."
  echo ""
  echo "Troubleshooting:"
  echo "  1. Check SUPABASE_SERVICE_ROLE_KEY is set in .env.local"
  echo "  2. Check Supabase RLS policies allow INSERT"
  echo "  3. Check server logs for database errors"
  echo "  4. Verify Supabase credentials are correct"
fi
