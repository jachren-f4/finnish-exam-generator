# Audio Summary Generation Specification

## Overview

ExamGenie can generate educational audio summaries alongside exam questions in a single Gemini API call. The summary is structured into sections and designed to be converted to speech for student study material.

## Implementation Details

### Model Configuration
- **Model:** Gemini 2.5 Flash-Lite
- **Temperature:** 0 (deterministic output)
- **Processing Time:** ~15-17 seconds
- **Cost:** ~$0.002 per exam (questions + summary)

### Summary Structure

The summary is divided into four sections, returned as separate JSON fields:

```json
{
  "questions": [...],
  "summary": {
    "introduction": "Overview of topic (150-200 words)",
    "key_concepts": "Detailed explanations (350-400 words)",
    "examples_and_applications": "Practical examples (250-300 words)",
    "summary_conclusion": "Review and takeaways (150-200 words)",
    "total_word_count": 967,
    "language": "fi"
  }
}
```

### Actual Output Metrics

Based on testing with physics content (3 images, grade 8, Finnish language):

| Section | Target | Actual Average |
|---------|--------|----------------|
| **Introduction** | 300-400 words | ~160 words |
| **Key Concepts** | 800-1000 words | ~360 words |
| **Examples & Applications** | 600-800 words | ~290 words |
| **Summary/Conclusion** | 300-400 words | ~170 words |
| **Total** | 2000+ words | **~970 words** |

### Audio Characteristics

- **Total Words:** ~970 words
- **Estimated Audio Length:** 7-10 minutes at conversational speaking rate (150-160 words/min)
- **Language:** Matches source material (Finnish, English, Swedish, etc.)
- **Tone:** Educational, appropriate for grades 1-9

## Prompt Requirements

The combined prompt must include:

1. **Task 1:** Generate exactly 15 multiple-choice questions
2. **Task 2:** Generate structured summary with four sections
3. **Language consistency:** Same language for questions and summary
4. **Format specification:** Explicit JSON structure with section names

### Key Prompt Elements

```
TASK 2: Generate a comprehensive educational summary divided into structured sections:

Required sections (each in same language as source material):
1. **introduction** (300-400 words): Overview of the topic
2. **key_concepts** (800-1000 words): Detailed explanation of main concepts
3. **examples_and_applications** (600-800 words): Practical examples
4. **summary_conclusion** (300-400 words): Review of key points

REQUIRED FORMAT:
{
  "summary": {
    "introduction": "...",
    "key_concepts": "...",
    "examples_and_applications": "...",
    "summary_conclusion": "...",
    "total_word_count": 970,
    "language": "fi"
  }
}
```

## Model Behavior Notes

### Observed Characteristics

1. **Word Count Limitation:** Gemini 2.5 Flash-Lite consistently generates ~1000 words regardless of requested length (2000+ words)
2. **Word Count Reporting:** Model may report higher word counts (e.g., 2598) than actual output (967)
3. **Quality vs. Length:** Output quality is high despite shorter length than requested
4. **Consistency:** Word counts are stable across multiple test runs

### Why ~1000 Words?

Gemini 2.5 Flash-**Lite** is optimized for concise, efficient responses. The "Lite" variant appears to have built-in constraints favoring brevity. For longer summaries, consider:
- Two-step generation (generate + expand)
- Regular Gemini 2.5 Flash (not Lite, higher cost)
- Accept ~1000 words as pedagogically optimal (shorter audio = higher completion rate)

## Integration Guidelines

### Step 1: Generate Content
- Use existing `getCategoryAwarePrompt()` modified to include summary sections
- Single Gemini API call for both questions and summary
- Parse JSON response to extract both arrays

### Step 2: Combine Sections
```typescript
const fullSummary = [
  summary.introduction,
  summary.key_concepts,
  summary.examples_and_applications,
  summary.summary_conclusion
].join('\n\n');
```

### Step 3: Text-to-Speech Conversion
- Input: Combined summary text (~970 words)
- Expected audio: 7-10 minutes
- Use Google Cloud Text-to-Speech API
- Voice settings: Match detected language

### Step 4: Storage
- Upload MP3 to Supabase Storage bucket: `audio-summaries`
- Store URL in `examgenie_exams.audio_url`
- Store metadata in `examgenie_exams.audio_metadata` (duration, word count, cost)

## Database Schema

Add to `examgenie_exams` table:

```sql
ALTER TABLE examgenie_exams ADD COLUMN summary_text TEXT;
ALTER TABLE examgenie_exams ADD COLUMN audio_url TEXT;
ALTER TABLE examgenie_exams ADD COLUMN audio_metadata JSONB;
```

Example `audio_metadata`:
```json
{
  "word_count": 970,
  "duration_seconds": 480,
  "language": "fi",
  "voice_name": "fi-FI-Standard-A",
  "generated_at": "2025-10-13T08:00:00Z",
  "tts_cost": 0.000096
}
```

## Cost Analysis

| Component | Cost per Exam |
|-----------|---------------|
| Gemini API (questions + summary) | $0.002 |
| Google Cloud TTS (~970 words) | $0.0001 |
| **Total** | **~$0.002** |

## Testing

Test script available: `test-summary-generation.ts`

```bash
npx tsx test-summary-generation.ts
```

Validates:
- JSON structure correctness
- All four sections present
- Word counts per section
- Language consistency
- Total word count vs. reported count

## Recommendations

### For Production
1. **Accept ~1000 word summaries** as optimal for audio learning
2. **Monitor completion rates** to validate audio length effectiveness
3. **Cache audio files** indefinitely (regeneration costs same as generation)
4. **Optional audio** - Generate only if user requests or usage shows value

### For Future Enhancement
If longer summaries needed:
- Implement two-step generation (generate → expand)
- Switch to Gemini 2.5 Flash (not Lite)
- Add user setting for summary length preference

---

**Last Updated:** October 2025
**Test Results:** `prompttests/test-summary-*.json`
**Related:** `test-summary-generation.ts`, `src/lib/config.ts`
