#!/bin/bash

# Test JWT Validation
# This script tests optional JWT authentication

echo "=== JWT VALIDATION TEST ==="
echo ""

# Configuration
API_URL="http://localhost:3000/api/mobile/exam-questions"
TEST_IMAGE="assets/images/physics_hires/fyssa2_hires.jpg"

# Check if image exists
if [ ! -f "$TEST_IMAGE" ]; then
  echo "❌ Error: Test image not found at $TEST_IMAGE"
  exit 1
fi

echo "Configuration:"
echo "  API URL: $API_URL"
echo "  Image: $TEST_IMAGE"
echo ""

# Test 1: Request WITHOUT JWT (body user_id only)
echo "Test 1: Request WITHOUT JWT (backwards compatibility)"
echo "────────────────────────────────────────────────────────"
curl -s -X POST "$API_URL" \
  -F "images=@$TEST_IMAGE" \
  -F "user_id=550e8400-e29b-41d4-a716-446655440000" \
  -F "category=mathematics" \
  -F "grade=5" \
  -w "\nHTTP Status: %{http_code}\n" | head -20

echo ""
echo "Expected: Request succeeds with auth_source='body'"
echo ""

# Test 2: Request WITH INVALID JWT
echo "Test 2: Request WITH INVALID JWT"
echo "────────────────────────────────────────────────────────"
curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer invalid.jwt.token" \
  -F "images=@$TEST_IMAGE" \
  -F "user_id=550e8400-e29b-41d4-a716-446655440000" \
  -F "category=mathematics" \
  -F "grade=5" \
  -w "\nHTTP Status: %{http_code}\n" | head -20

echo ""
echo "Expected: Request succeeds but falls back to body user_id"
echo "  (JWT validation fails gracefully)"
echo ""

# Test 3: Request WITH VALID JWT (requires real Supabase JWT)
echo "Test 3: Request WITH VALID JWT"
echo "────────────────────────────────────────────────────────"
echo "⚠️  This test requires a real Supabase JWT token"
echo ""
echo "To get a valid JWT token:"
echo "  1. Sign in to your Flutter app"
echo "  2. Extract the JWT from: supabase.auth.session()?.accessToken"
echo "  3. Set JWT_TOKEN environment variable:"
echo "     export JWT_TOKEN='your-jwt-token-here'"
echo "  4. Re-run this script"
echo ""

if [ -n "$JWT_TOKEN" ]; then
  echo "Testing with provided JWT token..."
  curl -s -X POST "$API_URL" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -F "images=@$TEST_IMAGE" \
    -F "category=mathematics" \
    -F "grade=5" \
    -w "\nHTTP Status: %{http_code}\n" | head -20

  echo ""
  echo "Expected: Request succeeds with auth_source='jwt'"
  echo "  (User ID extracted from JWT, not from body)"
else
  echo "Skipping - no JWT_TOKEN environment variable set"
fi

echo ""
echo "=== TEST COMPLETE ==="
echo ""
echo "Check server logs for JWT validation details:"
echo "  - [JWT] Valid token for user: <user_id>"
echo "  - [JWT] Invalid token: <error>"
echo "  - [Auth] JWT provided: true/false, Source: jwt/body/none"
