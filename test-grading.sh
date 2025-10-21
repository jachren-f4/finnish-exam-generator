#!/bin/bash

echo "🧪 Testing Exam Grading Flow"
echo "============================"

# Step 1: Generate exam
echo ""
echo "Step 1: Generating exam..."
RESPONSE=$(curl -s -X POST https://exam-generator-staging.vercel.app/api/mobile/exam-questions \
  -F "images=@assets/images/ylli_compressed/sivu36-min.jpg" \
  -F "images=@assets/images/ylli_compressed/sivu37-min.jpg" \
  -F "images=@assets/images/ylli_compressed/sivu38-min.jpg" \
  -F "category=core_academics" \
  -F "grade=5" \
  -F "student_id=fc495b10-c771-4bd1-8bb4-b2c5003b9613")

EXAM_ID=$(echo "$RESPONSE" | jq -r '.exam_id')

if [ "$EXAM_ID" == "null" ] || [ -z "$EXAM_ID" ]; then
  echo "❌ Failed to generate exam"
  echo "$RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Exam generated: $EXAM_ID"
echo "   URL: https://exam-generator-staging.vercel.app/exam/$EXAM_ID"

# Wait for exam to be fully created
sleep 2

# Step 2: Fetch exam questions
echo ""
echo "Step 2: Fetching questions..."
EXAM_DATA=$(curl -s "https://exam-generator-staging.vercel.app/api/exam/$EXAM_ID")

# Extract first 3 question IDs
Q1=$(echo "$EXAM_DATA" | jq -r '.data.questions[0].id')
Q2=$(echo "$EXAM_DATA" | jq -r '.data.questions[1].id')
Q3=$(echo "$EXAM_DATA" | jq -r '.data.questions[2].id')

echo "✅ Questions fetched"
echo "   Q1: $Q1"
echo "   Q2: $Q2"
echo "   Q3: $Q3"

# Get correct answers for first 3 questions
A1=$(echo "$EXAM_DATA" | jq -r '.data.questions[0].options[1]')
A2=$(echo "$EXAM_DATA" | jq -r '.data.questions[1].options[0]')
A3=$(echo "$EXAM_DATA" | jq -r '.data.questions[2].options[2]')

# Step 3: Submit answers (just first 3 for testing)
echo ""
echo "Step 3: Submitting answers..."
SUBMIT_RESPONSE=$(curl -s -X POST "https://exam-generator-staging.vercel.app/api/exam/$EXAM_ID/submit" \
  -H "Content-Type: application/json" \
  -d "{
    \"answers\": [
      {\"question_id\": \"$Q1\", \"answer_text\": \"$A1\"},
      {\"question_id\": \"$Q2\", \"answer_text\": \"$A2\"},
      {\"question_id\": \"$Q3\", \"answer_text\": \"$A3\"}
    ]
  }")

# Check if submission was successful
SUCCESS=$(echo "$SUBMIT_RESPONSE" | jq -r '.success')

if [ "$SUCCESS" == "true" ]; then
  echo "✅ GRADING SUCCESSFUL!"
  echo ""
  echo "📊 Results:"
  echo "$SUBMIT_RESPONSE" | jq '{
    success: .success,
    final_grade: .data.final_grade,
    percentage: .data.percentage,
    total_points: .data.total_points,
    max_total_points: .data.max_total_points,
    questions_correct: .data.questions_correct,
    questions_incorrect: .data.questions_incorrect,
    attempt_number: .data.attempt_number
  }'
  echo ""
  echo "🎉 STAGING GRADING WORKS! Bug fixed!"
else
  echo "❌ GRADING FAILED"
  echo "$SUBMIT_RESPONSE" | jq '.'
  exit 1
fi
