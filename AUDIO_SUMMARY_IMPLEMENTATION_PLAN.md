# Audio Summary Implementation Plan

## Overview

This document outlines the complete implementation for generating audio summaries alongside exam questions. The audio will be accessible via a hyperlink on the first question of each exam.

**Key Features:**
- ~1000 word summary in 4 sections (introduction, key concepts, examples, conclusion)
- Text-to-Speech conversion using Google Cloud TTS with service account authentication
- Audio stored in Supabase Storage
- Link displayed on first question: "🎧 Listen to audio summary in [Language]"
- Non-blocking: Audio generation failure doesn't prevent exam creation
- **Zero Flutter client changes required** - works with existing `/api/mobile/exam-questions` endpoint

---

## Phase 1: Database Setup

### Task 1.1: Create Database Migration

**File:** `supabase/migrations/004_add_audio_summary.sql` (NEW)

```sql
-- Add audio summary columns to examgenie_exams
ALTER TABLE examgenie_exams
  ADD COLUMN summary_text TEXT,
  ADD COLUMN audio_url TEXT,
  ADD COLUMN audio_metadata JSONB;

-- Add index for audio_url lookups
CREATE INDEX idx_examgenie_exams_audio_url ON examgenie_exams(audio_url);

-- Add comment documentation
COMMENT ON COLUMN examgenie_exams.summary_text IS 'Combined educational summary (~1000 words) from 4 sections';
COMMENT ON COLUMN examgenie_exams.audio_url IS 'Public URL to MP3 audio file in Supabase Storage';
COMMENT ON COLUMN examgenie_exams.audio_metadata IS 'Audio generation metadata (word_count, duration, language, voice, cost)';
```

**Run:**
```bash
supabase db push
```

### Task 1.2: Update TypeScript Types

**File:** `src/lib/supabase.ts`

**Location:** Line ~149, in `ExamGenieExam` interface

**Add:**
```typescript
export interface ExamGenieExam {
  // ... existing fields
  summary_text: string | null
  audio_url: string | null
  audio_metadata: {
    word_count: number
    duration_seconds: number
    language: string
    voice_name: string
    generated_at: string
    tts_cost: number
    sections: {
      introduction: number
      key_concepts: number
      examples_and_applications: number
      summary_conclusion: number
    }
  } | null
}
```

---

## Phase 2: Backend - Prompt Integration

**IMPORTANT:** The existing `/api/mobile/exam-questions` endpoint will automatically generate audio summaries without any changes to the Flutter client. The audio URL will be included in the exam response if generation succeeds.

### Task 2.1: Update config.ts Prompts

**File:** `src/lib/config.ts`

**Location:** Line ~240, after `getLanguageStudiesPrompt`

**Add new function:**
```typescript
getCategoryAwarePromptWithSummary: (category: string, grade?: number, language: string = 'en') => {
  return `Create a text-based exam from educational content for grade ${grade || 'appropriate'} students.

CRITICAL CONSTRAINT: Students will NOT have access to any visual elements during the exam

Avoid:
- Visual references from the material, like images or page or chapter numbers
- References to graph, table, diagram, or coordinate systems
- Something that is factually untrue
- Something that is impossible to answer without the images
- Questions that aren't explicitly based on the source material

TARGET: Use the same language as the source material. Subject area: ${category}.

TASK 1: Generate exactly 15 questions that test understanding of the educational concepts in the material.

TASK 2: Generate a comprehensive educational summary divided into structured sections:

Required sections (each in same language as source material):
1. **introduction** (300-400 words): Overview of the topic and why it's important
2. **key_concepts** (800-1000 words): Detailed explanation of main concepts with definitions
3. **examples_and_applications** (600-800 words): Practical examples and real-world applications
4. **summary_conclusion** (300-400 words): Review of key points and takeaways

Total target: Approximately 1000 words across all sections combined.

REQUIRED FORMAT:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "[Question text in same language as source material]",
      "options": ["[Option A]", "[Option B]", "[Option C]", "[Option D]"],
      "correct_answer": "[Exact match from options array]",
      "explanation": "[Brief explanation in same language]"
    }
  ],
  "summary": {
    "introduction": "[300-400 word introduction]",
    "key_concepts": "[800-1000 word detailed explanation]",
    "examples_and_applications": "[600-800 word practical examples]",
    "summary_conclusion": "[300-400 word review]",
    "total_word_count": [actual total word count across all sections],
    "language": "[detected language code, e.g. 'fi', 'en', 'sv']"
  }
}

IMPORTANT:
- The correct_answer field must contain the exact text from the options array
- Each summary section should provide comprehensive coverage
- Aim for approximately 1000 words total across all sections
- Include the total_word_count field with the actual combined count
- Include the language field (e.g., 'fi', 'en', 'sv')
- Use the SAME language for questions, explanations, and all summary sections`
}
```

### Task 2.2: Update Mobile API Service to Use New Prompt

**File:** `src/lib/services/mobile-api-service.ts`

**Location:** Line ~233, in `processWithGemini()` method

**Replace:** The existing prompt selection logic

**With:**
```typescript
if (customPrompt && customPrompt.trim() !== '') {
  promptToUse = customPrompt
  promptType = 'CUSTOM'
} else if (category) {
  // Use new prompt with summary generation
  promptToUse = PROMPTS.getCategoryAwarePromptWithSummary(category, grade, language)
  promptType = `CATEGORY_WITH_SUMMARY(${category}, grade-${grade || 'auto'}, lang-${language})`
} else {
  promptToUse = PROMPTS.getCategoryAwarePromptWithSummary('core_academics', grade, language)
  promptType = `CATEGORY_WITH_SUMMARY(core_academics, grade-${grade || 'auto'}, lang-${language})`
}
```

### Task 2.3: Extract Summary from Gemini Response

**File:** `src/lib/services/mobile-api-service.ts`

**Location:** Line ~336, in `createExamFromResponse()` after parsing questions

**Add after line 344 (after JSON.parse):**
```typescript
// Parse the Gemini response to extract questions
let parsedQuestions = []
let summaryText: string | null = null
let summaryLanguage: string | null = null
let summaryWordCount = 0

try {
  const parsedResult = JSON.parse(geminiData.rawText)
  parsedQuestions = parsedResult.questions || []

  // Extract and combine summary sections
  if (parsedResult.summary) {
    const sections = [
      parsedResult.summary.introduction,
      parsedResult.summary.key_concepts,
      parsedResult.summary.examples_and_applications,
      parsedResult.summary.summary_conclusion
    ].filter(Boolean)

    summaryText = sections.join('\n\n')
    summaryLanguage = parsedResult.summary.language || 'fi'
    summaryWordCount = parsedResult.summary.total_word_count || 0

    console.log(`Summary extracted: ${summaryWordCount} words in ${summaryLanguage}`)
  }
} catch (parseError) {
  console.error('Failed to parse Gemini JSON response:', parseError)
  return null
}
```

---

## Phase 3: Text-to-Speech Service

### Task 3.1: Install Dependencies

**Run:**
```bash
npm install @google-cloud/text-to-speech
npm install --save-dev @types/google-cloud__text-to-speech
```

### Task 3.2: Environment Variable

**File:** `.env.local`

**Add:**
```bash
# Google Cloud Text-to-Speech - Service Account JSON
GOOGLE_CLOUD_CREDENTIALS_JSON='{"type":"service_account","project_id":"ai-test-prep-app",...}'
```

**For Vercel:**
1. Copy the entire contents of `AITestPrepApp.json`
2. Go to Vercel → Project → Settings → Environment Variables
3. Add new variable:
   - **Name:** `GOOGLE_CLOUD_CREDENTIALS_JSON`
   - **Value:** Paste the entire JSON (including the outer `{}`)
   - **Environment:** Production, Preview, Development
4. Redeploy after adding

**Note:** The JSON contains the private key and all authentication details needed for Google Cloud TTS API.

### Task 3.3: Create TTS Service

**File:** `src/lib/services/tts-service.ts` (NEW)

```typescript
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

interface AudioResult {
  audioBuffer: Buffer;
  metadata: {
    duration_seconds: number;
    word_count: number;
    voice_name: string;
    tts_cost: number;
  };
}

const VOICE_MAP: Record<string, string> = {
  'fi': 'fi-FI-Standard-A',
  'en': 'en-US-Standard-A',
  'sv': 'sv-SE-Standard-A',
  'es': 'es-ES-Standard-A',
  'de': 'de-DE-Standard-A',
  'fr': 'fr-FR-Standard-A',
};

export class TTSService {
  /**
   * Generate audio from text using Google Cloud Text-to-Speech
   * @param text Summary text (~1000 words)
   * @param language Language code (e.g., 'fi', 'en')
   * @returns Audio buffer and metadata
   */
  static async generateAudio(
    text: string,
    language: string
  ): Promise<AudioResult> {
    console.log(`[TTS] Generating audio for ${language} (${text.length} chars)`)

    const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS_JSON;
    if (!credentialsJson) {
      throw new Error('GOOGLE_CLOUD_CREDENTIALS_JSON not configured');
    }

    // Parse the service account JSON
    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (error) {
      throw new Error('Failed to parse GOOGLE_CLOUD_CREDENTIALS_JSON');
    }

    // Initialize client with service account credentials
    const client = new TextToSpeechClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      projectId: credentials.project_id,
    });

    // Select voice based on language
    const voiceName = VOICE_MAP[language] || VOICE_MAP['en'];
    const languageCode = language === 'fi' ? 'fi-FI' :
                        language === 'sv' ? 'sv-SE' :
                        language === 'es' ? 'es-ES' :
                        language === 'de' ? 'de-DE' :
                        language === 'fr' ? 'fr-FR' : 'en-US';

    // Configure request
    const request = {
      input: { text },
      voice: {
        languageCode,
        name: voiceName,
        ssmlGender: 'NEUTRAL' as const,
      },
      audioConfig: {
        audioEncoding: 'MP3' as const,
        speakingRate: 1.0,
        pitch: 0.0,
      },
    };

    // Make TTS request
    const startTime = Date.now();
    const [response] = await client.synthesizeSpeech(request);
    const duration = Date.now() - startTime;

    if (!response.audioContent) {
      throw new Error('No audio content received from TTS API');
    }

    // Calculate cost (Google Cloud TTS pricing: ~$4 per 1M characters)
    const charCount = text.length;
    const ttsCost = (charCount / 1_000_000) * 4.0;

    // Estimate audio duration (average speaking rate: 150 words/min)
    const wordCount = text.split(/\s+/).length;
    const estimatedDurationSeconds = Math.ceil((wordCount / 150) * 60);

    console.log(`[TTS] Generated ${charCount} chars → ~${estimatedDurationSeconds}s audio (cost: $${ttsCost.toFixed(6)})`)

    return {
      audioBuffer: Buffer.from(response.audioContent as Uint8Array),
      metadata: {
        duration_seconds: estimatedDurationSeconds,
        word_count: wordCount,
        voice_name: voiceName,
        tts_cost: ttsCost,
      },
    };
  }
}
```

---

## Phase 4: Audio Storage

### Task 4.1: Create Supabase Storage Bucket

**Via Supabase Dashboard:**
1. Go to Storage
2. Create new bucket:
   - **Name:** `audio-summaries`
   - **Public:** Yes
   - **File size limit:** 50 MB
   - **Allowed MIME types:** `audio/mpeg`

**Do this for:**
- Staging project
- Production project

### Task 4.2: Extend Storage Service

**File:** `src/lib/storage.ts`

**Location:** After line 83 (end of class)

**Add method:**
```typescript
/**
 * Upload audio summary to Supabase Storage
 * @param audioBuffer MP3 audio buffer
 * @param examId Exam ID for filename
 * @param language Language code for filename
 * @returns Public URL or error
 */
static async uploadAudioSummary(
  audioBuffer: Buffer,
  examId: string,
  language: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const timestamp = Date.now();
    const filename = `${examId}_${timestamp}_${language}.mp3`;

    console.log(`[Storage] Uploading audio: ${filename} (${audioBuffer.length} bytes)`);

    const { data, error } = await supabase.storage
      .from('audio-summaries')
      .upload(filename, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false
      });

    if (error) {
      console.error('[Storage] Upload error:', error);
      return { url: null, error: error.message };
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('audio-summaries')
      .getPublicUrl(data.path);

    console.log(`[Storage] Upload successful: ${urlData.publicUrl}`);
    return { url: urlData.publicUrl, error: null };
  } catch (err) {
    console.error('[Storage] Upload exception:', err);
    return { url: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
```

---

## Phase 5: Integration in Mobile API

### Task 5.1: Add Summary to Exam Creation

**File:** `src/lib/services/mobile-api-service.ts`

**Location:** Line ~456, in `createExamFromResponse()`, in `examData` object

**Update examData to include:**
```typescript
const examData: any = {
  id: examId,
  user_id: userId,
  subject: request.subject || 'Yleinen',
  grade: request.grade?.toString() || '1',
  status: 'READY',
  processed_text: geminiData.rawText,
  share_id: shareId,
  created_at: new Date().toISOString(),
  generation_prompt: promptUsed || null,
  ai_provider: getConfiguredProviderType(),
  summary_text: summaryText, // NEW: Add summary text
  audio_url: null,            // NEW: Will be updated after TTS
  audio_metadata: null        // NEW: Will be updated after TTS
};
```

### Task 5.2: Generate Audio After Exam Creation

**File:** `src/lib/services/mobile-api-service.ts`

**Location:** Line ~518, AFTER questions are inserted (after questionsError check)

**Add audio generation (make it non-blocking):**
```typescript
// Create questions in examgenie_questions table
const { error: questionsError } = await supabaseAdmin
  .from('examgenie_questions')
  .insert(questionsData)

if (questionsError) {
  console.error('Failed to create examgenie_questions:', questionsError)
  // Clean up exam record
  await supabaseAdmin.from('examgenie_exams').delete().eq('id', examId)
  return null
}

// === NEW: Generate audio summary (non-blocking) ===
if (summaryText && summaryLanguage) {
  // Don't await - run in background, don't block exam creation
  this.generateAudioSummaryAsync(
    examId,
    summaryText,
    summaryLanguage,
    summaryWordCount
  ).catch(err => {
    console.error('[Audio] Background generation failed:', err);
  });
}
// === END NEW ===

timer.endPhase('ExamGenie Exam Creation')
console.log(`⏱️  [TIMER] ExamGenie exam creation: ${Date.now() - examCreationStartTime}ms`)
```

### Task 5.3: Add Async Audio Generation Method

**File:** `src/lib/services/mobile-api-service.ts`

**Location:** After `cleanupFiles()` method (~line 555)

**Add new private method:**
```typescript
/**
 * Generate audio summary asynchronously (non-blocking)
 * Failures are logged but don't affect exam creation
 */
private static async generateAudioSummaryAsync(
  examId: string,
  summaryText: string,
  summaryLanguage: string,
  summaryWordCount: number
): Promise<void> {
  try {
    console.log(`[Audio] Starting background generation for exam ${examId}`);
    const startTime = Date.now();

    // Import services
    const { TTSService } = await import('./tts-service');
    const { SupabaseStorageManager } = await import('../storage');

    // Generate audio
    const audioResult = await TTSService.generateAudio(
      summaryText,
      summaryLanguage
    );

    // Upload to storage
    const uploadResult = await SupabaseStorageManager.uploadAudioSummary(
      audioResult.audioBuffer,
      examId,
      summaryLanguage
    );

    if (uploadResult.error || !uploadResult.url) {
      throw new Error(`Upload failed: ${uploadResult.error}`);
    }

    // Update exam record with audio URL and metadata
    const { error: updateError } = await supabaseAdmin!
      .from('examgenie_exams')
      .update({
        audio_url: uploadResult.url,
        audio_metadata: {
          word_count: summaryWordCount,
          duration_seconds: audioResult.metadata.duration_seconds,
          language: summaryLanguage,
          voice_name: audioResult.metadata.voice_name,
          generated_at: new Date().toISOString(),
          tts_cost: audioResult.metadata.tts_cost,
          sections: {} // Could add individual section word counts here
        }
      })
      .eq('id', examId);

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[Audio] ✅ Generation complete for ${examId} (${totalTime}ms)`);
  } catch (error) {
    console.error(`[Audio] ❌ Generation failed for exam ${examId}:`, error);
    // Don't throw - this is a background task
  }
}
```

**Note:** Import at top of file:
```typescript
import { SupabaseStorageManager } from '../storage'
```

---

## Phase 6: Frontend Display

### Task 6.1: Update ExamData Type

**File:** `src/app/exam/[id]/page.tsx`

**Location:** Line 11-15

**Update interface:**
```typescript
interface ExamState extends ExamData {
  canReuse: boolean
  hasBeenCompleted: boolean
  latestGrading?: any
  audio_url?: string | null          // NEW
  audio_metadata?: {                 // NEW
    language: string
    duration_seconds: number
    word_count: number
  } | null
}
```

### Task 6.2: Add Language Helper Function

**File:** `src/app/exam/[id]/page.tsx`

**Location:** Line 16, before the component

**Add helper:**
```typescript
// Helper to get human-readable language name
const getLanguageName = (code: string): string => {
  const names: Record<string, string> = {
    'fi': 'Finnish',
    'en': 'English',
    'sv': 'Swedish',
    'es': 'Spanish',
    'de': 'German',
    'fr': 'French',
  };
  return names[code] || code.toUpperCase();
};

export default function ExamPage() {
  // ... existing code
```

### Task 6.3: Display Audio Link on First Question

**File:** `src/app/exam/[id]/page.tsx`

**Location:** Line 373, after "Question Type Badge" section

**Add audio link (only on first question):**
```typescript
{/* Question Type Badge */}
<div style={{
  display: 'inline-block',
  background: COLORS.background.secondary,
  color: COLORS.primary.medium,
  padding: `${SPACING.xs} ${SPACING.sm}`,
  borderRadius: RADIUS.sm,
  fontSize: TYPOGRAPHY.fontSize.sm,
  fontWeight: TYPOGRAPHY.fontWeight.medium,
  marginBottom: SPACING.sm,
}}>
  {currentQuestion + 1} / {exam.total_questions}
</div>

{/* === NEW: Audio Summary Link - Only on first question === */}
{currentQuestion === 0 && exam.audio_url && exam.audio_metadata?.language && (
  <div style={{
    marginBottom: SPACING.sm,
    padding: `${SPACING.sm} ${SPACING.md}`,
    background: COLORS.background.secondary,
    borderRadius: RADIUS.sm,
    border: `1px solid ${COLORS.border.light}`,
  }}>
    <a
      href={exam.audio_url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.primary.dark,
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.textDecoration = 'underline';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.textDecoration = 'none';
      }}
    >
      <span>🎧</span>
      <span>Listen to audio summary in {getLanguageName(exam.audio_metadata.language)}</span>
      {exam.audio_metadata.duration_seconds && (
        <span style={{ color: COLORS.primary.medium }}>
          ({Math.ceil(exam.audio_metadata.duration_seconds / 60)} min)
        </span>
      )}
    </a>
  </div>
)}
{/* === END NEW === */}

<h2 style={{
  fontSize: TYPOGRAPHY.fontSize.xl,
  fontWeight: TYPOGRAPHY.fontWeight.semibold,
  color: COLORS.primary.text,
  marginBottom: SPACING.md,
  lineHeight: TYPOGRAPHY.lineHeight.normal,
}}>{currentQ.question_text}</h2>
```

---

## Phase 7: Testing & Validation

### Task 7.1: Test Summary Generation Structure

```bash
# Verify test passes with expected structure
npx tsx test-summary-generation.ts

# Expected output:
# ✅ 15 questions
# ✅ 4 summary sections
# ✅ ~900 words total
# ✅ Language field present
```

### Task 7.2: Test Full Exam Creation Locally

**Setup:**
```bash
# Add Google Cloud credentials to .env.local
echo 'GOOGLE_CLOUD_CREDENTIALS_JSON='"'"'<paste AITestPrepApp.json contents>'"'"'' >> .env.local

# Start dev server
npm run dev
```

**Test exam creation:**
```bash
# Create exam with image (existing Flutter endpoint)
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/physics/kpl11a compr.jpeg" \
  -F "category=core_academics" \
  -F "grade=8" \
  -F "language=fi" \
  -F "user_id=test-user-123"

# Verify response includes:
# - examUrl
# - examId
# - gradingUrl
# - Check database for summary_text
# - Wait 5 seconds, check database for audio_url (generated in background)
```

### Task 7.3: Test Audio Generation

**Verify:**
1. Check console logs for `[Audio] Starting background generation`
2. Check Supabase Storage bucket for new MP3 file
3. Check database for `audio_url` and `audio_metadata`
4. Visit exam URL and verify link appears on first question
5. Click link and verify audio plays

### Task 7.4: Test Error Scenarios

**Test graceful failures:**
```bash
# 1. Missing Google Cloud credentials
# - Exam should still create successfully
# - Audio should fail silently in background
# - Check console for: [Audio] ❌ Generation failed

# 2. Invalid JSON in credentials
# - Exam should still create successfully
# - Check console for: Failed to parse GOOGLE_CLOUD_CREDENTIALS_JSON

# 3. Invalid language code
# - Should fallback to English voice
# - Audio should still generate

# 4. Storage bucket doesn't exist
# - Exam should still create
# - Audio upload should fail silently
# - Check console for: [Storage] Upload error
```

### Task 7.5: Test Different Languages

```bash
# Test Finnish
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/physics/kpl11a compr.jpeg" \
  -F "language=fi"

# Test English
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/test-image.jpg" \
  -F "language=en"

# Test Swedish
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/test-image.jpg" \
  -F "language=sv"
```

---

## Phase 8: Deployment

### Task 8.1: Update Environment Variables

**Vercel → Settings → Environment Variables:**

Add for **both staging and production:**

1. Go to Vercel project settings
2. Environment Variables → Add New
3. **Name:** `GOOGLE_CLOUD_CREDENTIALS_JSON`
4. **Value:** Paste entire contents of `AITestPrepApp.json` file:
   ```json
   {"type":"service_account","project_id":"ai-test-prep-app","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"...","universe_domain":"googleapis.com"}
   ```
5. Select all environments: Production, Preview, Development
6. Save

**Important:** The JSON must be valid - include all the content from the file, preserving the `\n` characters in the private key.

### Task 8.2: Run Database Migration

```bash
# Staging
supabase db push --db-url postgresql://postgres:[password]@[staging-host]:5432/postgres

# Production (after staging tested)
supabase db push --db-url postgresql://postgres:[password]@[production-host]:5432/postgres
```

### Task 8.3: Create Storage Buckets

**In Supabase Dashboard:**

**Staging:**
1. Go to Storage → New Bucket
2. Name: `audio-summaries`
3. Public: ✓
4. Save

**Production:**
1. Go to Storage → New Bucket
2. Name: `audio-summaries`
3. Public: ✓
4. Save

### Task 8.4: Deploy to Staging

```bash
git checkout staging
git pull origin staging

# Commit changes
git add .
git commit -m "Add audio summary generation with TTS"
git push origin staging

# Vercel auto-deploys
# Test on staging URL
```

### Task 8.5: Deploy to Production

```bash
# Create PR
gh pr create --base main --head staging --title "Release: Audio Summary Feature"

# After review and merge:
# - Vercel auto-deploys to production
# - Monitor logs for errors
# - Test with real exam creation
```

---

## Cost Analysis

| Component | Per Exam | Notes |
|-----------|----------|-------|
| Gemini API (questions + summary) | $0.002 | ~6,300 tokens |
| Google Cloud TTS (~900 words) | $0.0001 | ~7,000 characters |
| Supabase Storage | ~$0.000001 | ~500KB MP3 |
| **Total** | **~$0.002** | Minimal increase |

**Monthly (1000 exams):** ~$2.00

---

## Performance Impact

| Metric | Before | After | Impact |
|--------|--------|-------|--------|
| **Exam Creation** | 15-17s | 15-17s | None (audio runs async) |
| **API Response** | Immediate | Immediate | None |
| **Audio Ready** | N/A | +3-5s | Background process |
| **Total Cost** | $0.002 | $0.002 | Negligible |

---

## Monitoring & Debugging

### Logs to Watch

**Console logs:**
```
[Audio] Starting background generation for exam <id>
[TTS] Generating audio for fi (7340 chars)
[TTS] Generated 7340 chars → ~420s audio (cost: $0.000029)
[Storage] Uploading audio: <exam-id>_<timestamp>_fi.mp3 (524288 bytes)
[Storage] Upload successful: https://...
[Audio] ✅ Generation complete for <id> (4523ms)
```

**Error logs:**
```
[Audio] ❌ Generation failed for exam <id>: <error>
```

### Database Queries

**Check audio generation status:**
```sql
SELECT
  id,
  summary_text IS NOT NULL as has_summary,
  audio_url IS NOT NULL as has_audio,
  audio_metadata->>'duration_seconds' as duration,
  audio_metadata->>'language' as language,
  created_at
FROM examgenie_exams
ORDER BY created_at DESC
LIMIT 10;
```

**Check failure rate:**
```sql
SELECT
  COUNT(*) as total_exams,
  SUM(CASE WHEN summary_text IS NOT NULL THEN 1 ELSE 0 END) as with_summary,
  SUM(CASE WHEN audio_url IS NOT NULL THEN 1 ELSE 0 END) as with_audio,
  ROUND(100.0 * SUM(CASE WHEN audio_url IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 2) as audio_success_rate
FROM examgenie_exams
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## Rollback Plan

If issues arise:

1. **Disable audio generation:**
   ```typescript
   // In mobile-api-service.ts, comment out:
   // this.generateAudioSummaryAsync(...)
   ```

2. **Remove frontend link:**
   ```typescript
   // In exam/[id]/page.tsx, comment out audio link section
   ```

3. **Revert database:**
   ```sql
   ALTER TABLE examgenie_exams
     DROP COLUMN summary_text,
     DROP COLUMN audio_url,
     DROP COLUMN audio_metadata;
   ```

---

## Future Enhancements

- [ ] Add audio download button (in addition to link)
- [ ] Add playback speed control
- [ ] Support multiple voice options per language
- [ ] Add audio preview in mobile app before exam starts
- [ ] Add retry mechanism for failed audio generations
- [ ] Add admin dashboard to view audio generation stats
- [ ] Support regeneration if summary text is updated

---

## Flutter Client Compatibility

**IMPORTANT:** No changes required to the Flutter mobile app!

The existing API endpoint `/api/mobile/exam-questions` already returns the exam data structure. After this implementation:

**Before (current response):**
```json
{
  "success": true,
  "examUrl": "https://exam-generator.vercel.app/exam/abc123",
  "examId": "abc123",
  "gradingUrl": "https://exam-generator.vercel.app/grading/abc123"
}
```

**After (with audio - same endpoint):**
```json
{
  "success": true,
  "examUrl": "https://exam-generator.vercel.app/exam/abc123",
  "examId": "abc123",
  "gradingUrl": "https://exam-generator.vercel.app/grading/abc123"
}
```

The `audio_url` is stored in the database but not returned in the initial API response. The audio is generated in the background (3-5 seconds after exam creation).

**How Flutter app accesses audio:**
1. User clicks `examUrl` to take the exam
2. Web page loads exam from database (includes `audio_url` if ready)
3. Web page displays audio link on first question
4. User clicks link to listen

**Result:** Flutter app works without any code changes. Audio appears automatically on the web exam page.

---

## Summary

**Estimated Implementation Time:** 6-8 hours

**Risk Level:** Low (non-blocking, graceful degradation)

**User Impact:** High (valuable study aid, minimal UI change)

**Maintenance:** Low (stable APIs, automatic retries not needed)

**Flutter Compatibility:** ✅ Zero changes required - works with existing endpoint

---

**Last Updated:** October 2025
**Related Documents:**
- `AUDIO_SUMMARY_SPECIFICATION.md`
- `test-summary-generation.ts`
- `README.md`
