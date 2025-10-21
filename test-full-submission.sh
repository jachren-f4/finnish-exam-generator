#!/bin/bash

EXAM_ID="a7ff5f9b-768e-4591-ba81-a2736f5cf8fe"

echo "Fetching all questions..."
QUESTIONS=$(curl -s "https://exam-generator-staging.vercel.app/api/exam/$EXAM_ID" | jq -c '.data.questions')

echo "Building answers for all 15 questions..."
ANSWERS="["
FIRST=true
echo "$QUESTIONS" | jq -c '.[]' | while read question; do
  Q_ID=$(echo "$question" | jq -r '.id')
  # Use first option as answer
  ANSWER=$(echo "$question" | jq -r '.options[0]')

  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    ANSWERS="$ANSWERS,"
  fi

  echo "  Q: $Q_ID = $ANSWER"
done

# Generate full answer JSON manually
FULL_ANSWERS='{"answers":['

COUNT=0
echo "$QUESTIONS" | jq -c '.[]' | while read question; do
  Q_ID=$(echo "$question" | jq -r '.id')
  ANSWER=$(echo "$question" | jq -r '.options[0]')

  if [ $COUNT -gt 0 ]; then
    FULL_ANSWERS="$FULL_ANSWERS,"
  fi

  FULL_ANSWERS="$FULL_ANSWERS{\"question_id\":\"$Q_ID\",\"answer_text\":\"$ANSWER\"}"
  COUNT=$((COUNT+1))
done

FULL_ANSWERS="$FULL_ANSWERS]}"

echo ""
echo "Submitting all 15 answers..."
curl -X POST "https://exam-generator-staging.vercel.app/api/exam/$EXAM_ID/submit" \
  -H "Content-Type: application/json" \
  -d "$FULL_ANSWERS" | jq '.'
