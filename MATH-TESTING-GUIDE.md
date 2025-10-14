# Mathematics Integration - Testing Guide

**Phase 4: Comprehensive Testing**
**Created**: 2025-10-14
**Status**: Ready for Testing

---

## Overview

This guide covers all testing procedures for the mathematics exam integration. Complete all tests before deploying to production.

---

## Prerequisites

- [ ] Phases 1-3 completed and committed
- [ ] Local development server running: `npm run dev` on port 3001
- [ ] `.env.local` configured with `GEMINI_API_KEY`
- [ ] Test images available in `assets/images/math8thgrade/`
- [ ] Browser with developer console available
- [ ] `jq` installed for JSON parsing: `brew install jq`

---

## Test Scripts Available

### 1. **Standalone Math Service Test**
```bash
npx tsx --env-file=.env.local test-math-service-local.ts
```
- Tests math service in isolation
- Verifies V1 prompt, validation, temperature retry
- **Expected**: 15 questions, validation score ≥ 90

### 2. **End-to-End Test**
```bash
chmod +x test-math-e2e.sh
./test-math-e2e.sh
```
- Tests complete workflow: generation → viewing → grading
- Includes manual browser verification steps
- **Expected**: Working exam with rendered LaTeX

### 3. **Backward Compatibility Test**
```bash
chmod +x test-backward-compatibility.sh
./test-backward-compatibility.sh
```
- Tests all categories (math, core_academics, none)
- Verifies no breaking changes
- **Expected**: All categories work

---

## Task 4.1: Math Exam End-to-End ✅

**Automated Script**: `./test-math-e2e.sh`

**Manual Steps**:
1. Run script: `./test-math-e2e.sh`
2. Script generates exam and provides URL
3. Open URL in browser
4. Verify rendering (see checklist below)
5. Complete exam and check grading

**Browser Verification Checklist**:
- [ ] LaTeX renders (not raw `$...$`)
- [ ] Fractions display properly: `$\frac{1}{2}$` → ½
- [ ] Exponents display: `$10^2$` → 10²
- [ ] Greek letters display: `$\pi$` → π
- [ ] Questions in Finnish
- [ ] 15 questions total
- [ ] 4 options per question
- [ ] No JavaScript console errors

---

## Task 4.2: LaTeX Rendering Verification 📐

**Test Various LaTeX Patterns**:

Generate exam with:
```bash
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/math8thgrade/algebra.jpg" \
  -F "category=mathematics" \
  -F "grade=8" \
  -F "language=fi"
```

**Verify These Render Correctly**:

| LaTeX Input | Expected Render | Status |
|-------------|-----------------|--------|
| `$\frac{1}{2}$` | ½ (fraction) | [ ] |
| `$x^2$` | x² (superscript) | [ ] |
| `$x_1$` | x₁ (subscript) | [ ] |
| `$\pi r^2$` | πr² | [ ] |
| `$\sqrt{16}$` | √16 | [ ] |
| `$\frac{x^2 + 5x}{3}$` | Complex fraction | [ ] |
| `$10^{-3}$` | 10⁻³ (negative exp) | [ ] |

**Edge Cases**:
- [ ] Text with dollar sign: "The price is $5.99" → displays as-is (not LaTeX)
- [ ] Unmatched delimiter: "Cost is $5" → displays as-is
- [ ] Very long formula → wraps properly on mobile
- [ ] Formula in option text → renders in option box

---

## Task 4.3: Performance Testing ⚡

**Test Script**:
```bash
#!/bin/bash
echo "Performance Test - 5 Runs"
echo "========================="

for i in {1..5}; do
  echo "Run $i:"
  START=$(date +%s%3N)

  RESPONSE=$(curl -s -X POST http://localhost:3001/api/mobile/exam-questions \
    -F "images=@assets/images/math8thgrade/potenssi.JPG" \
    -F "category=mathematics" \
    -F "grade=8" \
    -F "student_id=perf-test-$i")

  END=$(date +%s%3N)
  DURATION=$((END - START))

  TEMP=$(echo "$RESPONSE" | jq -r '.data.metadata.geminiUsage.temperature' 2>/dev/null)
  echo "  Duration: ${DURATION}ms"
  echo "  Temperature: $TEMP"
  echo ""
done
```

**Expected Results**:
- [ ] Average response time: 3-10 seconds
- [ ] Temperature 0 success rate: >70%
- [ ] No timeouts (< 60 seconds)
- [ ] Consistent results across runs

**Performance Benchmarks**:
- **Excellent**: <5 seconds, temperature 0
- **Good**: 5-8 seconds, temperature 0-0.3
- **Acceptable**: 8-15 seconds, any temperature
- **Poor**: >15 seconds or frequent temperature 0.5

---

## Task 4.4: Validation Testing 🎯

**Goal**: Verify validation scores are consistently high

**Test Script**:
```bash
#!/bin/bash
echo "Validation Testing - Multiple Images"
echo "===================================="

for image in potenssi.JPG algebra.jpg geometry.JPG jakolasku.JPG; do
  echo "Testing: $image"

  curl -s -X POST http://localhost:3001/api/mobile/exam-questions \
    -F "images=@assets/images/math8thgrade/$image" \
    -F "category=mathematics" \
    -F "grade=8" \
    -F "student_id=validation-test-$(date +%s)" | jq '.success, .examId'

  echo ""
  echo "Check server logs for validation score..."
  echo ""
  sleep 2
done
```

**Check Server Logs For**:
```
[Math Service] Validation score: 135/100
[Math Service] Temperature used: 0
```

**Success Criteria**:
- [ ] All exams pass validation (score ≥ 90)
- [ ] No self-admitted errors ("oikea vastaus on", "lähin vastaus")
- [ ] No visual references ("kuva", "sivu")
- [ ] All correct_answer values exist in options
- [ ] LaTeX syntax valid (no unclosed delimiters)

---

## Task 4.5: Mobile App Compatibility 📱

**Verify Response Format**:
```bash
curl -s -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/math8thgrade/potenssi.JPG" \
  -F "category=mathematics" \
  -F "grade=8" \
  -F "student_id=mobile-test" | \
  jq '{
    success: .success,
    examUrl: .examUrl,
    examId: .examId,
    gradingUrl: .gradingUrl,
    metadata: .data.metadata
  }'
```

**Required Fields** (Flutter app expects):
- [ ] `success` (boolean)
- [ ] `examUrl` (string, full URL)
- [ ] `examId` (UUID string)
- [ ] `gradingUrl` (string, full URL)
- [ ] `data.metadata.processingTime` (number, milliseconds)
- [ ] `data.metadata.imageCount` (number)
- [ ] `data.metadata.promptUsed` (string)
- [ ] `data.metadata.geminiUsage` (object)

**Mobile Browser Test**:
1. Generate exam on localhost
2. Open exam URL on mobile device (same network)
3. Verify LaTeX renders on mobile
4. Test responsiveness (portrait and landscape)
5. Complete exam on mobile
6. Check grading page

---

## Task 4.6: Error Handling Tests ❌

**Test Various Error Scenarios**:

### Test 1: Invalid Image Format
```bash
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@README.md" \
  -F "category=mathematics" \
  -F "grade=8"

# Expected: HTTP 400, validation error
```

### Test 2: Too Many Images
```bash
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/math8thgrade/potenssi.JPG" \
  -F "images=@assets/images/math8thgrade/algebra.jpg" \
  -F "images=@assets/images/math8thgrade/geometry.JPG" \
  -F "images=@assets/images/math8thgrade/jakolasku.JPG" \
  -F "images=@assets/images/math8thgrade/potenssi.JPG" \
  -F "images=@assets/images/math8thgrade/algebra.jpg" \
  -F "category=mathematics" \
  -F "grade=8"

# Expected: HTTP 400, "Maximum 20 images allowed"
```

### Test 3: Invalid Grade
```bash
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/math8thgrade/potenssi.JPG" \
  -F "category=mathematics" \
  -F "grade=999"

# Expected: Should still work (uses default grade 8)
```

### Test 4: Missing Required Field (on staging with user_id requirement)
```bash
curl -X POST https://exam-generator-staging.vercel.app/api/mobile/exam-questions \
  -F "images=@assets/images/math8thgrade/potenssi.JPG" \
  -F "category=mathematics" \
  -F "grade=8"

# Expected: HTTP 400, "user_id required" (if enforced on staging)
```

**Success Criteria**:
- [ ] All error scenarios return appropriate HTTP codes (400, 500)
- [ ] Error messages are clear and helpful
- [ ] No server crashes
- [ ] No sensitive information leaked in errors
- [ ] Errors logged properly in console

---

## Task 4.7: Regression Testing 🔄

**Automated Script**: `./test-backward-compatibility.sh`

**Manual Verification**:

### Test 1: Core Academics (Non-Math)
```bash
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/history_de/historybio1.JPG" \
  -F "category=core_academics" \
  -F "grade=7" \
  -F "student_id=regression-core"
```
- [ ] Returns HTTP 200
- [ ] Exam created successfully
- [ ] No math service logs in console
- [ ] Uses existing prompt (not MATH_V1)

### Test 2: No Category (Default Behavior)
```bash
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/math8thgrade/potenssi.JPG" \
  -F "grade=8" \
  -F "student_id=regression-default"
```
- [ ] Returns HTTP 200
- [ ] Defaults to core_academics
- [ ] Does NOT route to math service (no category specified)
- [ ] Exam created successfully

### Test 3: Custom Prompt (Overrides Category)
```bash
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/math8thgrade/algebra.jpg" \
  -F "category=mathematics" \
  -F "grade=8" \
  -F "customPrompt=Generate 5 easy math questions for kids" \
  -F "student_id=regression-custom"
```
- [ ] Returns HTTP 200
- [ ] Uses custom prompt (NOT math service)
- [ ] Console shows "CUSTOM" prompt type
- [ ] Generates ~5 questions (not 15)

**Regression Checklist**:
- [ ] All existing categories work
- [ ] Response format unchanged
- [ ] No new errors introduced
- [ ] Performance not degraded
- [ ] Database schema unchanged

---

## Task 4.8: Database Verification 🗄️

**Connect to database** and run these queries:

### Query 1: Find Recent Math Exams
```sql
SELECT
  id,
  subject,
  grade,
  status,
  created_at,
  LENGTH(generation_prompt) as prompt_length,
  (SELECT COUNT(*) FROM examgenie_questions WHERE exam_id = examgenie_exams.id) as question_count
FROM examgenie_exams
WHERE generation_prompt LIKE '%FORBIDDEN ERROR%'  -- Math prompt marker
ORDER BY created_at DESC
LIMIT 10;
```

**Verify**:
- [ ] Math exams appear in results
- [ ] `generation_prompt` stored (not null)
- [ ] Prompt contains "FORBIDDEN ERROR" (math prompt indicator)
- [ ] Question count = 15
- [ ] Status = 'READY'

### Query 2: Inspect Math Questions
```sql
SELECT
  question_number,
  LEFT(question_text, 100) as question_preview,
  LENGTH(question_text) as question_length,
  jsonb_array_length(options) as option_count,
  correct_answer,
  LENGTH(explanation) as explanation_length
FROM examgenie_questions
WHERE exam_id = 'your-math-exam-id-here'
ORDER BY question_number;
```

**Verify**:
- [ ] Exactly 15 questions (1-15)
- [ ] All questions have 4 options
- [ ] Question text contains `$` (LaTeX delimiters)
- [ ] `correct_answer` exists in options (check a few manually)
- [ ] Explanations are present and reasonable length

### Query 3: Check Audio Summary Status
```sql
SELECT
  id,
  subject,
  audio_url,
  audio_metadata
FROM examgenie_exams
WHERE generation_prompt LIKE '%FORBIDDEN ERROR%'
LIMIT 5;
```

**Verify**:
- [ ] `audio_url` is NULL (math exams don't generate summaries by design)
- [ ] `audio_metadata` is NULL
- [ ] This is expected behavior (math service doesn't include summary generation)

---

## Testing Checklist Summary

### Core Functionality
- [ ] Math service standalone test passes
- [ ] End-to-end workflow works
- [ ] LaTeX renders correctly in browser
- [ ] Questions are high quality (validation ≥ 90)

### Integration
- [ ] Math routing works (category=mathematics)
- [ ] Backward compatibility maintained
- [ ] Custom prompts override category
- [ ] Response format unchanged

### Performance
- [ ] Response time acceptable (<10s)
- [ ] Temperature retry works
- [ ] No memory leaks
- [ ] No server crashes

### Edge Cases
- [ ] Error handling works
- [ ] Invalid inputs rejected gracefully
- [ ] Edge case LaTeX patterns render
- [ ] Mobile compatibility verified

### Database
- [ ] Math exams stored correctly
- [ ] Prompts saved
- [ ] 15 questions per exam
- [ ] LaTeX present in questions

---

## Troubleshooting

### LaTeX Not Rendering
**Symptoms**: Raw `$...$` visible in questions
**Check**:
1. Browser console for KaTeX errors
2. Network tab for KaTeX CDN loading
3. Verify KaTeX scripts in `<head>`
4. Try hard refresh (Cmd+Shift+R)

**Fix**: Re-run Phase 1 (KaTeX integration)

### Validation Failures
**Symptoms**: `[Math Service] Validation score: 65/100`
**Check**:
1. Server logs for specific errors
2. Common issues: duplicate options, visual references, self-admitted errors

**Fix**: Review and adjust V1 prompt forbidden patterns

### Temperature Retry Not Working
**Symptoms**: Always uses temperature 0, even when failing
**Check**:
1. `detectInfiniteLoop()` logic
2. `callGeminiWithRetry()` implementation
3. Server logs for retry attempts

**Fix**: Review math-exam-service.ts retry logic

### Routing Not Working
**Symptoms**: Math category uses wrong prompt
**Check**:
1. Server logs for "ROUTING TO MATH EXAM SERVICE"
2. Category value in request
3. Routing logic in `processWithGemini()`

**Fix**: Review routing condition in mobile-api-service.ts

---

## Test Results Template

Copy this template to track your testing progress:

```markdown
# Math Integration Testing Results
**Date**: [DATE]
**Tester**: [NAME]
**Environment**: [local/staging/production]

## Test Summary
- [ ] Task 4.1: End-to-End
- [ ] Task 4.2: LaTeX Rendering
- [ ] Task 4.3: Performance
- [ ] Task 4.4: Validation
- [ ] Task 4.5: Mobile Compatibility
- [ ] Task 4.6: Error Handling
- [ ] Task 4.7: Regression
- [ ] Task 4.8: Database Verification

## Issues Found
1. [Issue description]
   - Severity: [High/Medium/Low]
   - Steps to reproduce: [...]
   - Expected: [...]
   - Actual: [...]

## Performance Metrics
- Average response time: X seconds
- Temperature 0 success rate: X%
- Validation scores: X-Y/100

## Notes
[Any additional observations]

## Recommendation
[ ] Ready for production
[ ] Needs fixes before deployment
```

---

## Next Steps After Testing

**If All Tests Pass** ✅:
- Proceed to Phase 5: Deployment
- Create production release PR
- Deploy to staging first, monitor for 24 hours
- Deploy to production

**If Tests Fail** ❌:
- Document failures in detail
- Create GitHub issues for each problem
- Fix issues and retest
- Do not proceed to deployment

---

**Created**: 2025-10-14
**Last Updated**: 2025-10-14
**Phase**: 4 (Testing)
**Next Phase**: 5 (Deployment)
