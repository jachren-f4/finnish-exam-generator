#!/bin/bash

# Test script to verify history prompt routing works correctly

echo "🧪 Testing History Prompt Routing"
echo "=================================="
echo ""

# Check if dev server is running
if ! curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "❌ Error: Dev server not running"
    echo "   Start it with: npm run dev"
    exit 1
fi

# Check if test images exist
if [ ! -f "assets/images/history-test/sivu12.jpeg" ]; then
    echo "❌ Error: Test images not found in assets/images/history-test/"
    exit 1
fi

echo "📋 Test Configuration:"
echo "  - Image: assets/images/history-test/sivu12.jpeg"
echo "  - Subject: Historia (Finnish)"
echo "  - Grade: 5"
echo "  - Expected: HISTORY prompt should be used"
echo ""

echo "🚀 Sending request..."
echo ""

# Make request and capture response
RESPONSE=$(curl -s -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/history-test/sivu12.jpeg" \
  -F "subject=Historia" \
  -F "grade=5")

# Check if response is successful
if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    echo "✅ Request successful!"
    echo ""

    # Extract key information
    QUESTION_COUNT=$(echo "$RESPONSE" | jq '.questions | length')
    FIRST_QUESTION=$(echo "$RESPONSE" | jq -r '.questions[0].question_text')
    LANGUAGE=$(echo "$RESPONSE" | jq -r '.summary.language // "not specified"')

    echo "📊 Response Analysis:"
    echo "  - Questions generated: $QUESTION_COUNT"
    echo "  - Language detected: $LANGUAGE"
    echo "  - First question: $FIRST_QUESTION"
    echo ""

    # Check if questions are in Finnish
    if echo "$FIRST_QUESTION" | grep -q "Suomen\|sisällisso\|punaisten\|valkoisten"; then
        echo "✅ Questions appear to be in Finnish (correct)"
    else
        echo "⚠️  Questions may not be in Finnish"
    fi

    # Check for generic definitions (should be minimal)
    GENERIC_COUNT=$(echo "$RESPONSE" | jq '[.questions[].question_text | select(contains("Mitä tarkoittaa") or contains("What does") or contains("What is"))] | length')
    echo "  - Generic definition questions: $GENERIC_COUNT/15"

    if [ "$GENERIC_COUNT" -lt 3 ]; then
        echo "✅ Low generic definitions (good)"
    else
        echo "⚠️  High number of generic definitions"
    fi

else
    echo "❌ Request failed"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | jq '.'
    exit 1
fi

echo ""
echo "📝 To check full response:"
echo "   cat test-history-routing-output.json | jq '.'"

# Save full response
echo "$RESPONSE" | jq '.' > test-history-routing-output.json

echo ""
echo "✅ Test completed!"
