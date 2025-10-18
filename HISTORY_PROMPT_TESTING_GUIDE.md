# History Exam Prompt Testing Guide

## Problem Identified

The current history exam (Finnish Civil War) has issues:

1. **Factual Error**: Claims Svinhufvud was Finland's first president (actually Ståhlberg)
2. **Off-Topic Questions**: 10/15 questions are generic definitions (democracy, totalitarianism, etc.)
3. **Missing Key Content**: No questions about the actual narrative of the civil war

**Root Cause**: The generic `getCategoryAwarePrompt()` doesn't guide Gemini to focus on the specific historical content in the material.

## Solution: Improved History-Specific Prompt

The new prompt in `test-history-prompt.ts` includes:

### ✅ Key Improvements

1. **Content Analysis First**
   - Forces Gemini to identify main topic before generating questions
   - Extracts key events, figures, dates, narrative
   - Validates facts are from source material

2. **Question Priority System**
   - 40% Main Events (what happened, chronology)
   - 30% Causes & Consequences (why, results)
   - 20% Key Figures & Groups (who was involved)
   - 10% Context & Terms (only if central to topic)

3. **Forbidden Question Types**
   - No generic definitions unless tied to main topic
   - No questions about briefly mentioned concepts
   - No facts not present in material
   - No "which is true?" questions without focus

4. **Factual Accuracy Verification**
   - Explicit instruction to verify dates, names, events
   - "If uncertain, SKIP the question" rule
   - Source verification field for each question

5. **Quality Metrics**
   - Tracks question distribution
   - Counts generic definitions (should be 0 or minimal)
   - Validates 60%+ questions focus on main content

## How to Use

### Step 1: Prepare Test Images

```bash
# Create test folder
mkdir -p assets/images/history-test

# Add your history textbook images
# (Copy the Finnish Civil War images or other history content)
```

### Step 2: Run Test Script

```bash
npx tsx test-history-prompt.ts
```

### Step 3: Review Output

The script generates `test-output-history.json` with:

```json
{
  "test_metadata": { ... },
  "prompt_used": "...",
  "gemini_response": {
    "content_analysis": {
      "main_topic": "Finnish Civil War of 1918",
      "key_events": [...],
      "key_figures": [...],
      "main_narrative": "..."
    },
    "questions": [ ... ],
    "quality_metrics": {
      "main_event_questions": 6,
      "cause_consequence_questions": 5,
      "key_figure_questions": 3,
      "context_term_questions": 1,
      "generic_definition_questions": 0,  // ← Should be 0!
      "factual_accuracy_verified": true
    }
  }
}
```

### Step 4: Evaluate Results

**Look for:**

✅ `content_analysis.main_topic` correctly identifies the topic
✅ `quality_metrics.main_event_questions` ≥ 6
✅ `quality_metrics.generic_definition_questions` = 0 or 1
✅ Questions reference specific events/people from material
✅ No factual errors in answers

**Red flags:**

❌ Generic questions like "What is democracy?"
❌ Questions about concepts not central to topic
❌ Factual errors (wrong dates, names)
❌ Questions requiring outside knowledge

## Comparison: Old vs New Prompt

### Old Prompt (getCategoryAwarePrompt)
```
❌ Subject area: core academics (too broad)
❌ "Generate 15 questions that test understanding"
❌ No content analysis requirement
❌ No question priority guidance
❌ No factual verification checks
```

**Result**: 10/15 generic definitions, 1 factual error

### New Prompt (getHistoryPrompt)
```
✅ Analyze main topic FIRST
✅ Extract key events, figures, dates
✅ 40% questions on main events
✅ 30% questions on causes/consequences
✅ Verify ALL facts before finalizing
✅ Track question distribution
```

**Expected Result**: 9+/15 focused questions, 0 factual errors

## Integration Plan

After testing shows improved results:

1. **Option A: Add to config.ts**
   ```typescript
   // In src/lib/config.ts
   export const PROMPTS = {
     getCategoryAwarePrompt: ...,
     getLanguageStudiesPrompt: ...,
     getMathPrompt: ...,
     getHistoryPrompt: (grade, language) => { ... }  // Add this
   }
   ```

2. **Option B: Route by category**
   ```typescript
   // In mobile-api-service.ts
   if (category === 'mathematics') {
     return generateMathExam(...)
   } else if (category === 'history' || category === 'social_studies') {
     return generateHistoryExam(...)  // New service
   } else {
     return generateStandardExam(...)
   }
   ```

3. **Option C: Enhance getCategoryAwarePrompt**
   - Add history-specific guidance to existing prompt
   - Use conditional logic based on category

## Testing Checklist

Before deploying the new prompt:

- [ ] Test with Finnish Civil War images (known case)
- [ ] Test with other history topics (geography, world history)
- [ ] Verify factual accuracy (cross-check dates, names)
- [ ] Check language detection works (Finnish, English, Swedish)
- [ ] Ensure 60%+ questions focus on main content
- [ ] Validate generic definitions < 20%
- [ ] Test with different grade levels (3, 5, 7, 9)
- [ ] Compare output quality with old prompt

## Expected Improvements

**For Finnish Civil War exam:**

Old questions:
- ❌ "What is democracy?" (generic, not in material)
- ❌ "What is totalitarianism?" (generic, not in material)
- ❌ "What is international cooperation?" (off-topic)

New questions:
- ✅ "What were the main causes of the Finnish Civil War?"
- ✅ "What were the consequences of the civil war for Finnish society?"
- ✅ "How did the civil war affect Finland's path to independence?"
- ✅ "What role did class conflicts play in starting the war?"

## Notes

- The test script uses `gemini-2.0-flash-exp` (latest model)
- Temperature is set to 0 for deterministic, factually accurate output
- The prompt is ~3500 characters (well within limits)
- JSON response format enables structured analysis
- Quality metrics allow automated validation

## Troubleshooting

**No images found:**
```bash
# Check folder exists
ls -la assets/images/history-test/

# Should see .jpg, .png, or .heic files
```

**Parse error:**
```bash
# Check test-output-history-raw.txt for Gemini's response
cat test-output-history-raw.txt
```

**Still getting generic questions:**
- Review `content_analysis` section - is main topic identified correctly?
- Check `quality_metrics` - are categories being tracked?
- Try increasing grade level (generic questions may be age-appropriate for grade 3)

## Next Steps

1. Place Finnish Civil War images in `assets/images/history-test/`
2. Run `npx tsx test-history-prompt.ts`
3. Review `test-output-history.json`
4. Compare question quality with original exam
5. Iterate on prompt if needed
6. Deploy to production when satisfied
