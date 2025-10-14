#!/bin/bash
# End-to-end test for math exam integration
# Tests complete workflow: generation → viewing → grading

echo "🎯 Math Exam End-to-End Test"
echo "============================="
echo ""

# Configuration
API_URL=${1:-"http://localhost:3001"}
IMAGE_PATH="assets/images/math8thgrade/potenssi.JPG"

if [ ! -f "$IMAGE_PATH" ]; then
  echo "❌ Test image not found: $IMAGE_PATH"
  exit 1
fi

# Step 1: Generate exam
echo "Step 1: Generating math exam..."
echo "  API: $API_URL"
echo "  Image: $IMAGE_PATH"
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/api/mobile/exam-questions" \
  -F "images=@$IMAGE_PATH" \
  -F "category=mathematics" \
  -F "grade=8" \
  -F "language=fi" \
  -F "student_id=test-e2e-$(date +%s)")

echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# Extract exam URL
EXAM_URL=$(echo "$RESPONSE" | jq -r '.examUrl' 2>/dev/null)
EXAM_ID=$(echo "$RESPONSE" | jq -r '.examId' 2>/dev/null)
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)

if [ "$SUCCESS" != "true" ] || [ "$EXAM_URL" == "null" ] || [ -z "$EXAM_URL" ]; then
  echo ""
  echo "❌ Failed to generate exam"
  echo "Response: $RESPONSE"
  exit 1
fi

echo ""
echo "✅ Exam generated successfully"
echo "   Exam URL: $EXAM_URL"
echo "   Exam ID: $EXAM_ID"
echo ""

# Step 2: Verify metadata
echo "Step 2: Verify Response Metadata..."
PROCESSING_TIME=$(echo "$RESPONSE" | jq -r '.data.metadata.processingTime' 2>/dev/null)
IMAGE_COUNT=$(echo "$RESPONSE" | jq -r '.data.metadata.imageCount' 2>/dev/null)
PROMPT_USED=$(echo "$RESPONSE" | jq -r '.data.metadata.promptUsed' 2>/dev/null)

echo "   Processing time: ${PROCESSING_TIME}ms"
echo "   Image count: $IMAGE_COUNT"
echo "   Prompt used: $PROMPT_USED"

if [ "$PROMPT_USED" != "MATH_V1_PROMPT" ] && [ "$PROMPT_USED" != "MATH_V1" ]; then
  echo "   ⚠️  Warning: Expected MATH_V1_PROMPT, got $PROMPT_USED"
fi
echo ""

# Step 3: Manual browser verification
echo "Step 3: Manual Browser Verification Required"
echo "================================================"
echo "👉 Open this URL in your browser: $EXAM_URL"
echo ""
echo "✅ Verify:"
echo "  1. LaTeX math renders correctly (fractions, exponents)"
echo "  2. Expressions like \$\\frac{x}{2}\$ show as proper fractions"
echo "  3. Exponents like \$10^2\$ show as superscripts"
echo "  4. No raw \$ symbols visible"
echo "  5. Questions are in Finnish"
echo "  6. Exactly 15 questions"
echo "  7. Each question has 4 options"
echo "  8. No JavaScript errors in browser console"
echo ""
echo "Press Enter after completing manual verification..."
read

# Step 4: Query exam data via API (if available)
echo ""
echo "Step 4: Testing Exam Retrieval API..."
EXAM_DATA=$(curl -s "$API_URL/api/exam/$EXAM_ID" 2>/dev/null)

if [ -n "$EXAM_DATA" ]; then
  QUESTION_COUNT=$(echo "$EXAM_DATA" | jq '.data.questions | length' 2>/dev/null)

  if [ -n "$QUESTION_COUNT" ]; then
    echo "   Question count: $QUESTION_COUNT"

    if [ "$QUESTION_COUNT" -ne 15 ]; then
      echo "   ⚠️  Expected 15 questions, got $QUESTION_COUNT"
    else
      echo "   ✅ Correct question count"
    fi
  fi

  # Check for LaTeX in questions
  HAS_LATEX=$(echo "$EXAM_DATA" | jq '.data.questions[].question_text' 2>/dev/null | grep -c '\$')
  if [ "$HAS_LATEX" -gt 0 ]; then
    echo "   ✅ LaTeX notation found in $HAS_LATEX question(s)"
  else
    echo "   ⚠️  No LaTeX notation detected (may be normal for some topics)"
  fi

  # Show sample question
  echo ""
  echo "   Sample question:"
  echo "$EXAM_DATA" | jq '.data.questions[0]' 2>/dev/null | head -20
else
  echo "   ⚠️  Could not retrieve exam data (API may not be available)"
fi

echo ""
echo "================================================"
echo "✅ End-to-end test complete"
echo ""
echo "Summary:"
echo "  - Exam generated: ✅"
echo "  - Exam ID: $EXAM_ID"
echo "  - Manual verification: Required (see above)"
echo "  - API retrieval: $([ -n "$EXAM_DATA" ] && echo "✅" || echo "⚠️")"
