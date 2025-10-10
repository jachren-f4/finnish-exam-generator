#!/bin/bash

# Test Rate Limiting
# This script tests the rate limiting functionality by making multiple requests

echo "=== RATE LIMITING TEST ==="
echo "Testing 10/hour limit by making 11 consecutive requests"
echo ""

# Configuration
API_URL="http://localhost:3000/api/mobile/exam-questions"
TEST_USER_ID="550e8400-e29b-41d4-a716-446655440000" # Valid UUID format
TEST_IMAGE="assets/images/physics_hires/fyssa2_hires.jpg"

# Check if image exists
if [ ! -f "$TEST_IMAGE" ]; then
  echo "❌ Error: Test image not found at $TEST_IMAGE"
  echo "Please provide a valid test image path"
  exit 1
fi

echo "Configuration:"
echo "  API URL: $API_URL"
echo "  User ID: $TEST_USER_ID"
echo "  Image: $TEST_IMAGE"
echo ""

# Make 11 requests to test rate limiting
for i in {1..11}; do
  echo "Request $i/11:"

  # Make request and capture HTTP status code
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$API_URL" \
    -F "images=@$TEST_IMAGE" \
    -F "user_id=$TEST_USER_ID" \
    -F "category=core_academics" \
    -F "grade=8")

  # Check response
  if [ "$HTTP_STATUS" == "200" ]; then
    echo "  ✅ Status: 200 OK - Request allowed"
  elif [ "$HTTP_STATUS" == "429" ]; then
    echo "  🚫 Status: 429 Too Many Requests - Rate limit exceeded!"
    echo ""
    echo "=== RATE LIMITING WORKING CORRECTLY ==="
    echo "Request #$i was blocked as expected (limit is 10/hour)"

    # Get rate limit details
    echo ""
    echo "Getting rate limit details..."
    curl -s -X POST "$API_URL" \
      -F "images=@$TEST_IMAGE" \
      -F "user_id=$TEST_USER_ID" \
      -F "category=core_academics" \
      -F "grade=8" | jq '.'

    exit 0
  else
    echo "  ⚠️  Status: $HTTP_STATUS - Unexpected response"
  fi

  # Small delay between requests
  sleep 1
done

echo ""
echo "=== TEST FAILED ==="
echo "Expected request #11 to be rate limited, but it wasn't"
echo "Check rate limiter configuration"
exit 1
