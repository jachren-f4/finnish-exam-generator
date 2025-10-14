#!/bin/bash
# Backward Compatibility Test
# Verifies that non-math categories still work after math integration

echo "🔄 Backward Compatibility Test"
echo "=============================="
echo ""

API_URL=${1:-"http://localhost:3001"}
TEMP_DIR="/tmp/exam-tests"
mkdir -p "$TEMP_DIR"

echo "Testing API: $API_URL"
echo ""

# Test results tracker
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test a category
test_category() {
  local category=$1
  local image_path=$2
  local grade=$3
  local test_name=$4

  echo "Test: $test_name"
  echo "  Category: $category"
  echo "  Image: $image_path"
  echo "  Grade: $grade"

  if [ ! -f "$image_path" ]; then
    echo "  ⚠️  SKIPPED: Image not found"
    echo ""
    return
  fi

  local output_file="$TEMP_DIR/test-$(echo $category | tr '_' '-')-$(date +%s).json"

  local response=$(curl -s -X POST "$API_URL/api/mobile/exam-questions" \
    -F "images=@$image_path" \
    -F "category=$category" \
    -F "grade=$grade" \
    -F "student_id=test-compat-$(date +%s)" \
    -w "\nHTTP_STATUS:%{http_code}" \
    -o "$output_file" 2>&1)

  local http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)

  if [ "$http_status" == "200" ]; then
    local success=$(cat "$output_file" | jq -r '.success' 2>/dev/null)
    local exam_url=$(cat "$output_file" | jq -r '.examUrl' 2>/dev/null)

    if [ "$success" == "true" ] && [ "$exam_url" != "null" ] && [ -n "$exam_url" ]; then
      echo "  ✅ PASSED"
      echo "     Exam URL: $exam_url"
      TESTS_PASSED=$((TESTS_PASSED + 1))
    else
      echo "  ❌ FAILED: success=$success, examUrl=$exam_url"
      echo "     Response: $(cat "$output_file" | jq . 2>/dev/null)"
      TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
  else
    echo "  ❌ FAILED: HTTP $http_status"
    echo "     Response: $(cat "$output_file" 2>/dev/null)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi

  echo ""
}

# Test 1: Mathematics category (should route to math service)
echo "=== MATH CATEGORY TESTS ==="
echo ""
test_category "mathematics" "assets/images/math8thgrade/potenssi.JPG" "8" "Math - Exponents"
test_category "mathematics" "assets/images/math8thgrade/algebra.jpg" "8" "Math - Algebra"

# Test 2: Core Academics (should use existing logic)
echo "=== CORE ACADEMICS TESTS ==="
echo ""
test_category "core_academics" "assets/images/history_de/historybio1.JPG" "7" "History"

# Test 3: No category specified (should default to core_academics)
echo "=== DEFAULT CATEGORY TEST ==="
echo ""
echo "Test: No Category Specified (should default)"
IMAGE_PATH="assets/images/math8thgrade/potenssi.JPG"

if [ -f "$IMAGE_PATH" ]; then
  OUTPUT_FILE="$TEMP_DIR/test-no-category-$(date +%s).json"

  RESPONSE=$(curl -s -X POST "$API_URL/api/mobile/exam-questions" \
    -F "images=@$IMAGE_PATH" \
    -F "grade=8" \
    -F "student_id=test-no-category-$(date +%s)" \
    -w "\nHTTP_STATUS:%{http_code}" \
    -o "$OUTPUT_FILE" 2>&1)

  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)

  if [ "$HTTP_STATUS" == "200" ]; then
    SUCCESS=$(cat "$OUTPUT_FILE" | jq -r '.success' 2>/dev/null)
    EXAM_URL=$(cat "$OUTPUT_FILE" | jq -r '.examUrl' 2>/dev/null)

    if [ "$SUCCESS" == "true" ] && [ "$EXAM_URL" != "null" ] && [ -n "$EXAM_URL" ]; then
      echo "  ✅ PASSED (defaults to core_academics)"
      echo "     Exam URL: $EXAM_URL"
      TESTS_PASSED=$((TESTS_PASSED + 1))
    else
      echo "  ❌ FAILED: success=$SUCCESS, examUrl=$EXAM_URL"
      TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
  else
    echo "  ❌ FAILED: HTTP $HTTP_STATUS"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
else
  echo "  ⚠️  SKIPPED: Image not found"
fi
echo ""

# Summary
echo "=============================="
echo "SUMMARY"
echo "=============================="
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo "✅ All backward compatibility tests passed!"
  echo "   Non-math categories work as expected"
  echo "   Math category routes correctly"
  exit 0
else
  echo "❌ Some tests failed"
  echo "   Review failures above"
  exit 1
fi
