#!/bin/bash

# Test API Translation Script
# Tests API error messages in both English and Finnish

echo "======================================"
echo "Testing API Error Messages"
echo "======================================"
echo ""

# Check if server is running
echo "🔍 Checking if dev server is running..."
if ! curl -s http://localhost:3001 > /dev/null; then
  echo "❌ Dev server not running. Please start with: npm run dev"
  exit 1
fi
echo "✅ Dev server is running"
echo ""

echo "======================================"
echo "TEST 1: Missing user_id (should fail)"
echo "======================================"
echo "Expected: Error message in current locale"
echo ""

curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/test-image.jpg" 2>/dev/null | jq '.error'

echo ""
echo "======================================"
echo "TEST 2: Invalid category (should fail)"
echo "======================================"
echo "Expected: Invalid category error in current locale"
echo ""

curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/test-image.jpg" \
  -F "category=invalid_category" \
  -F "student_id=fc495b10-c771-4bd1-8bb4-b2c5003b9613" 2>/dev/null | jq '.error'

echo ""
echo "======================================"
echo "TEST 3: Invalid grade (should fail)"
echo "======================================"
echo "Expected: Invalid grade error in current locale"
echo ""

curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/test-image.jpg" \
  -F "grade=99" \
  -F "student_id=fc495b10-c771-4bd1-8bb4-b2c5003b9613" 2>/dev/null | jq '.error'

echo ""
echo "======================================"
echo "All tests complete!"
echo "========================================"
echo ""
echo "To test in different locales:"
echo "1. Stop the dev server (Ctrl+C)"
echo "2. Change NEXT_PUBLIC_LOCALE in .env.local"
echo "3. Restart dev server: npm run dev"
echo "4. Run this script again"
echo ""
echo "Current locale from .env.local:"
grep NEXT_PUBLIC_LOCALE .env.local || echo "  (not set, defaults to 'en')"
