# Mathematics Exam Integration - Detailed Task List

**Project**: ExamGenie - Finnish Exam Generator
**Feature**: Mathematics Exam Generation with LaTeX Support
**Created**: 2025-10-14
**Status**: 📋 Planning Phase

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: Add KaTeX Support](#phase-1-add-katex-support-for-latex-rendering)
4. [Phase 2: Create Math Service](#phase-2-create-math-exam-service)
5. [Phase 3: Integrate Routing](#phase-3-integrate-math-routing)
6. [Phase 4: Testing](#phase-4-testing)
7. [Phase 5: Deployment](#phase-5-deployment)
8. [Rollback Plan](#rollback-plan)
9. [Timeline Estimate](#timeline-estimate)

---

## Overview

### Goal
Integrate the tested mathematics exam generation system into ExamGenie's production API endpoint while adding LaTeX rendering support for mathematical notation.

### Why This Matters
- Math exams contain LaTeX notation (`$\frac{x}{2}$`, `$\pi r^2$`, etc.)
- Current system displays LaTeX as raw text → **broken user experience**
- Need KaTeX library to render math beautifully

### Strategy
1. **First**: Add KaTeX support to exam viewer (fixes visualization)
2. **Second**: Add math-specific generation service (quality & validation)
3. **Third**: Route `category=mathematics` to math service
4. **Result**: Beautiful, validated math exams via existing API

---

## Prerequisites

### Before Starting

- [ ] Review this entire document
- [ ] Understand current system architecture (see `README.md` and `PROJECT_OVERVIEW.md`)
- [ ] Read `MATH-EXAM-GENERATION-README.md` for math prompt details
- [ ] Ensure staging environment is accessible
- [ ] Have test images ready in `assets/images/math8thgrade/`
- [ ] Verify `GEMINI_API_KEY` is set in `.env.local`

### Required Knowledge

- [ ] Next.js 15 App Router
- [ ] React Server Components vs. Client Components
- [ ] TypeScript interfaces
- [ ] Gemini 2.5 Flash-Lite API
- [ ] KaTeX rendering library
- [ ] Supabase database structure

---

## Phase 1: Add KaTeX Support (for LaTeX Rendering)

**Estimated Time**: 1 hour
**Risk Level**: Low (non-breaking change)
**Goal**: Enable LaTeX math rendering in exam viewer

### Task 1.1: Add KaTeX CDN to Root Layout

**File**: `/src/app/layout.tsx`

**Current State** (lines 1-21):
```tsx
import type { Metadata } from 'next'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
```

**Changes Needed**:

- [ ] Add KaTeX CSS link to `<head>` section
- [ ] Use integrity hash for security (CDN verification)
- [ ] Add crossOrigin attribute

**Implementation Details**:
```tsx
<html lang="en">
  <head>
    {/* KaTeX CSS for LaTeX math rendering */}
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
      integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV"
      crossOrigin="anonymous"
    />
  </head>
  <body className="antialiased">
    {children}
  </body>
</html>
```

**Testing**:
- [ ] Run `npm run build` - should compile without errors
- [ ] View any exam page - no visual changes expected
- [ ] Check browser console - no KaTeX errors (since no rendering yet)

---

### Task 1.2: Add KaTeX Scripts to Exam Page

**File**: `/src/app/exam/[id]/page.tsx`

**Changes Needed**:

1. **Add Script imports** (top of file, around line 8):
```tsx
import Script from 'next/script'
```

2. **Add KaTeX rendering effect** (after existing useEffect, around line 37):
```tsx
// Render LaTeX math notation with KaTeX
useEffect(() => {
  const renderMath = () => {
    if (typeof window !== 'undefined' && (window as any).renderMathInElement) {
      try {
        (window as any).renderMathInElement(document.body, {
          delimiters: [
            { left: "$$", right: "$$", display: true },   // Block math
            { left: "$", right: "$", display: false }      // Inline math
          ],
          throwOnError: false  // Don't break on invalid LaTeX
        })
      } catch (error) {
        console.warn('KaTeX rendering failed:', error)
      }
    }
  }

  // Small delay to ensure DOM is ready
  const timer = setTimeout(renderMath, 100)
  return () => clearTimeout(timer)
}, [currentQuestion, exam])  // Re-render when question changes
```

3. **Add Script tags to JSX** (at the start of return statement, around line 297):
```tsx
return (
  <>
    {/* KaTeX Scripts for LaTeX Rendering */}
    <Script
      src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"
      integrity="sha384-XjKyOOlGwcjNTAIQHIpgOno0Hl1YQqzUOEleOLALmuqehneUG+vnGctmUb0ZY0l8"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
    <Script
      src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
      integrity="sha384-+VBxd3r6XgURycqtZ117nYw44OOcIax56Z4dCRWbxyPt0Koah1uHoK0o4+/RRE05"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />

    {/* Existing modal style */}
    <style>{`
      @media (max-width: 640px) {
        // ... existing styles ...
```

**Checklist**:
- [ ] Import `Script` from `next/script`
- [ ] Add `useEffect` for KaTeX rendering
- [ ] Add both KaTeX script tags (main + auto-render)
- [ ] Use `strategy="afterInteractive"` for performance
- [ ] Include integrity hashes for security
- [ ] Add dependency array `[currentQuestion, exam]` to useEffect

**Testing**:
- [ ] Run `npm run build` - should compile without errors
- [ ] Test with non-math exam - should work normally (no LaTeX)
- [ ] Test with math test string - should render (see Task 1.3)

---

### Task 1.3: Test KaTeX Rendering

**Create Test Exam**:

1. **Option A: Manual Database Insert** (if you have DB access):
```sql
-- Insert a test exam with LaTeX
INSERT INTO examgenie_exams (id, user_id, subject, grade, status, share_id)
VALUES (
  'test-math-katex-uuid',
  'your-user-id',
  'Mathematics',
  '8',
  'READY',
  'testmath'
);

-- Insert a test question with LaTeX
INSERT INTO examgenie_questions (id, exam_id, question_number, question_text, question_type, options, correct_answer, max_points, is_selected)
VALUES (
  'test-q-uuid',
  'test-math-katex-uuid',
  1,
  'Laske lausekkeen $\frac{x^2 + 5x}{3}$ arvo, kun $x = 6$.',
  'multiple_choice',
  '["14", "$\\frac{66}{3}$", "22", "$x^2$"]'::jsonb,
  '22',
  2,
  true
);
```

2. **Option B: Generate via API** (recommended):
```bash
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/math8thgrade/potenssi.JPG" \
  -F "category=core_academics" \
  -F "grade=8" \
  -F "language=fi" \
  -F "student_id=test-user-id"

# Get exam URL from response, open in browser
```

3. **Verify LaTeX Rendering**:
- [ ] Visit exam URL: `http://localhost:3001/exam/{exam-id}`
- [ ] Check that `$\frac{x^2 + 5x}{3}$` renders as a proper fraction (not raw text)
- [ ] Check that `$x = 6$` renders as formatted math
- [ ] Open browser console - no JavaScript errors
- [ ] Inspect network tab - KaTeX CSS and JS loaded successfully

**Expected Results**:

✅ **Good**:
```
Question: "Laske lausekkeen [formatted fraction] arvo, kun x = 6"
```

❌ **Bad** (if KaTeX not working):
```
Question: "Laske lausekkeen $\frac{x^2 + 5x}{3}$ arvo, kun $x = 6$"
            ↑ Raw text, not rendered
```

---

### Task 1.4: Test Non-Math Exams (Regression)

**Goal**: Ensure KaTeX doesn't break existing exams

**Test Cases**:

- [ ] **Test 1: Core Academics Exam** (no LaTeX)
  ```bash
  curl -X POST http://localhost:3001/api/mobile/exam-questions \
    -F "images=@assets/images/history_de/some-image.jpg" \
    -F "category=core_academics" \
    -F "grade=5"
  ```
  - Verify: Displays normally, no errors

- [ ] **Test 2: Language Studies Exam** (no LaTeX)
  ```bash
  curl -X POST http://localhost:3001/api/mobile/exam-questions \
    -F "images=@assets/images/language.jpg" \
    -F "category=language_studies" \
    -F "grade=7"
  ```
  - Verify: Displays normally, no errors

- [ ] **Test 3: Exam with Accidental Dollar Signs** (edge case)
  - Create question with text: "The price is $5.99"
  - Verify: Displays as "$5.99" (not treated as LaTeX)
  - Note: Single `$` without matching pair is ignored by KaTeX

**Success Criteria**:
- [ ] All existing exams display correctly
- [ ] No JavaScript console errors
- [ ] No visual regressions
- [ ] Page load time unchanged (<100ms difference)

---

### Task 1.5: Commit KaTeX Changes

**Before Committing**:
- [ ] Run `npm run build` - must pass
- [ ] Run `npm run lint` - must pass
- [ ] Test locally with 3+ different exams
- [ ] Review all changes in diff

**Git Commands**:
```bash
git checkout staging
git pull origin staging

# Commit KaTeX changes
git add src/app/layout.tsx
git add src/app/exam/[id]/page.tsx
git commit -m "Add KaTeX support for LaTeX math rendering in exams

- Add KaTeX 0.16.9 CDN CSS to root layout
- Add KaTeX scripts to exam viewer with auto-render
- Enable LaTeX rendering for math notation ($...$, $$...$$)
- Backward compatible: only renders LaTeX if delimiters present
- Tested with math and non-math exams

Refs: MATH-INTEGRATION-TASK-LIST.md Phase 1"

# Push to staging
git push origin staging
```

**Verify Staging Deployment**:
- [ ] Wait for Vercel deployment (~2 minutes)
- [ ] Visit staging URL: `https://exam-generator-staging.vercel.app`
- [ ] Test exam viewing with LaTeX
- [ ] Check deployment logs for errors

---

## Phase 2: Create Math Exam Service

**Estimated Time**: 2-3 hours
**Risk Level**: Low (new file, no existing code modified)
**Goal**: Create standalone math generation service with V1 prompt

### Task 2.1: Create Math Service File

**File**: `/src/lib/services/math-exam-service.ts` (NEW FILE)

**Structure Overview**:
```
math-exam-service.ts
├── Interfaces (MathExamGenerationOptions, MathExamResult, MathQuestion)
├── MathExamService class
│   ├── generateMathExam() - Main entry point
│   ├── getMathPrompt() - V1 prompt builder
│   ├── callGeminiWithRetry() - Temperature retry logic
│   ├── detectInfiniteLoop() - Loop detection
│   └── validateMathExam() - Quality validation
└── Helper functions
```

**Create New File**:
- [ ] Create file: `src/lib/services/math-exam-service.ts`
- [ ] Add file header comment with description
- [ ] Import required dependencies

**Dependencies to Import**:
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getGeminiApiKey, GEMINI_CONFIG, MATH_EXAM_CONFIG } from '../config'
import { safeJsonParse } from '../utils/json-handler'
import { createUsageMetadata } from '../utils/cost-calculator'
```

---

### Task 2.2: Define Math Service Interfaces

**Add to**: `/src/lib/services/math-exam-service.ts`

**Interfaces Needed**:

```typescript
export interface MathQuestion {
  id: number
  type: string  // "multiple_choice" (math only uses this)
  question: string  // With LaTeX notation
  options: string[]  // Exactly 4 options
  correct_answer: string  // Must match one option exactly
  explanation: string  // Max 500 chars
}

export interface MathExamGenerationOptions {
  images: ImagePart[]  // Base64 encoded images
  grade: number  // 1-9 (Finnish grades)
  language: string  // ISO 639-1 code (e.g., 'fi', 'en')
  processingId: string  // For logging
}

export interface MathExamResult {
  success: boolean

  // Success fields
  rawText?: string  // JSON response from Gemini
  questions?: MathQuestion[]
  topic?: string
  grade?: number
  processingTime?: number
  temperatureUsed?: number
  validationScore?: number
  geminiUsage?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
    estimatedCost: number
    inputCost: number
    outputCost: number
    model: string
  }

  // Error fields
  error?: string
  details?: string
}

interface ImagePart {
  inlineData: {
    data: string  // Base64
    mimeType: string
  }
}
```

**Checklist**:
- [ ] Add all interfaces
- [ ] Use exact field names from test script
- [ ] Mark optional fields with `?`
- [ ] Add JSDoc comments for clarity

---

### Task 2.3: Implement Math Prompt Builder

**Add to**: `/src/lib/services/math-exam-service.ts`

**Method**: `getMathPrompt(grade: number, language: string): string`

**Source**: Copy from `test-math-exam-generation-v1.ts` lines 30-189

**Checklist**:
- [ ] Copy entire V1 math prompt
- [ ] Use template literal with `${grade}` variable
- [ ] Include all 4 FORBIDDEN ERROR sections
- [ ] Include self-validation checklist
- [ ] Include LaTeX notation rules
- [ ] Include question type distribution (6-4-3-2)
- [ ] Verify JSON escaping instructions
- [ ] Total prompt length should be ~7000 characters

**Code Structure**:
```typescript
/**
 * Get math exam generation prompt (V1)
 * Includes forbidden error patterns and self-validation
 */
private static getMathPrompt(grade: number, language: string = 'fi'): string {
  const EXAM_QUESTION_COUNT = MATH_EXAM_CONFIG.DEFAULT_QUESTION_COUNT // 15

  return `ROLE: You are an expert mathematics teacher creating exam questions for grade ${grade} students.

CONTEXT: You are analyzing textbook images containing mathematical content...

[COPY FULL PROMPT FROM test-math-exam-generation-v1.ts]

...Begin generating the pedagogically sound exam now.`
}
```

---

### Task 2.4: Implement Infinite Loop Detection

**Add to**: `/src/lib/services/math-exam-service.ts`

**Method**: `detectInfiniteLoop(text: string): boolean`

**Source**: Copy from `test-math-exam-generation-v1.ts` lines 209-239

**Detection Methods**:
1. Response > 50,000 characters
2. Repeated phrases (5+ consecutive occurrences)
3. Known loop phrases (>10 occurrences)

**Checklist**:
- [ ] Copy `detectInfiniteLoop()` function
- [ ] Test with known loop phrase: "ja tehtävässä on useita potensseja"
- [ ] Add console logging for detection reasons
- [ ] Return boolean (true = loop detected)

**Code**:
```typescript
/**
 * Detects if Gemini's response contains infinite loop repetition
 * Common with temperature 0 on certain math topics
 */
private static detectInfiniteLoop(text: string): boolean {
  // Check 1: Massive output
  if (text.length > MATH_EXAM_CONFIG.INFINITE_LOOP_DETECTION.MAX_CHARS) {
    console.log('  📏 Loop detected: Response exceeds 50K characters')
    return true
  }

  // Check 2: Repeated phrases
  const phrases = text.match(/([^\n]{20,})\1{4,}/g)
  if (phrases && phrases.length > 0) {
    console.log('  🔁 Loop detected: Repeated phrase pattern found')
    return true
  }

  // Check 3: Known loop phrases
  const knownLoops = ['ja tehtävässä on useita potensseja', 'ja tehtävässä', 'Tässä tapauksessa']
  for (const phrase of knownLoops) {
    const count = (text.match(new RegExp(phrase, 'g')) || []).length
    if (count > MATH_EXAM_CONFIG.INFINITE_LOOP_DETECTION.KNOWN_LOOP_PHRASE_THRESHOLD) {
      console.log(`  🔁 Loop detected: "${phrase}" appears ${count} times`)
      return true
    }
  }

  return false
}
```

---

### Task 2.5: Implement Temperature Retry Logic

**Add to**: `/src/lib/services/math-exam-service.ts`

**Method**: `callGeminiWithRetry()`

**Strategy**:
- Attempt 1: Temperature 0 (deterministic)
- Attempt 2: Temperature 0.3 (if loop detected or parse failed)
- Attempt 3: Temperature 0.5 (last resort)

**Source**: Inspired by `test-math-exam-generation-v1.ts` lines 272-351

**Checklist**:
- [ ] Use `MATH_EXAM_CONFIG.TEMPERATURE_RETRY_STRATEGY` array
- [ ] Loop through temperatures with for loop
- [ ] Call Gemini API with current temperature
- [ ] Check for infinite loop BEFORE parsing
- [ ] Attempt JSON parse with `safeJsonParse()`
- [ ] Return on success, continue on failure
- [ ] Log each attempt with temperature used

**Code Structure**:
```typescript
/**
 * Call Gemini with progressive temperature retry
 */
private static async callGeminiWithRetry(
  prompt: string,
  images: ImagePart[],
  processingId: string
): Promise<{ text: string; temperature: number; processingTime: number } | null> {

  const genAI = new GoogleGenerativeAI(getGeminiApiKey())
  const temperatures = MATH_EXAM_CONFIG.TEMPERATURE_RETRY_STRATEGY // [0, 0.3, 0.5]
  const maxAttempts = MATH_EXAM_CONFIG.MAX_RETRY_ATTEMPTS // 3

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentTemp = temperatures[attempt]
    console.log(`[Math Service] Attempt ${attempt + 1}/${maxAttempts} (temperature: ${currentTemp})`)

    // Create model with current temperature
    const model = genAI.getGenerativeModel({
      model: GEMINI_CONFIG.MODEL_NAME,
      generationConfig: {
        temperature: currentTemp,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192
      }
    })

    try {
      const startTime = Date.now()
      const result = await model.generateContent([prompt, ...images])
      const text = result.response.text()
      const processingTime = Date.now() - startTime

      console.log(`[Math Service] Response received: ${text.length} chars in ${processingTime}ms`)

      // Check for infinite loop BEFORE parsing
      if (this.detectInfiniteLoop(text)) {
        console.log(`[Math Service] ⚠️  Infinite loop detected`)
        if (attempt < maxAttempts - 1) {
          console.log(`[Math Service] Retrying with temperature ${temperatures[attempt + 1]}`)
          continue
        }
        return null // All attempts failed
      }

      return { text, temperature: currentTemp, processingTime }

    } catch (error) {
      console.error(`[Math Service] Attempt ${attempt + 1} failed:`, error)
      if (attempt === maxAttempts - 1) {
        return null
      }
    }
  }

  return null
}
```

---

### Task 2.6: Implement Math Exam Validation

**Add to**: `/src/lib/services/math-exam-service.ts`

**Method**: `validateMathExam(questions: MathQuestion[]): ValidationResult`

**Validation Levels** (from `validate-math-exams.ts`):
1. **Structural** (75 points): Schema, field presence, option count
2. **Quality** (45 points): No forbidden phrases, no self-admitted errors
3. **Mathematical** (15 points): LaTeX syntax, Finnish language, answer format

**Checklist**:
- [ ] Check all questions have required fields
- [ ] Verify exactly 4 options per question
- [ ] Check for duplicate options
- [ ] Detect self-admitted errors ("oikea vastaus on", "lähin vastaus")
- [ ] Verify `correct_answer` is in `options` array
- [ ] Check for visual references ("kuva", "sivu")
- [ ] Verify LaTeX syntax validity
- [ ] Check for Finnish characters (äöå)
- [ ] Return score out of 100

**Code Structure**:
```typescript
interface ValidationResult {
  score: number  // 0-100
  passed: boolean  // score >= 90
  errors: string[]
  warnings: string[]
}

/**
 * Validate math exam quality
 * Threshold: 90+ points to pass
 */
private static validateMathExam(questions: MathQuestion[]): ValidationResult {
  const result: ValidationResult = {
    score: 0,
    passed: false,
    errors: [],
    warnings: []
  }

  let structuralScore = 75 // Start with max
  let qualityScore = 45
  let mathematicalScore = 15

  // Level 1: Structural validation
  questions.forEach((q, idx) => {
    // Check required fields
    if (!q.id || !q.question || !q.options || !q.correct_answer || !q.explanation) {
      result.errors.push(`Q${idx + 1}: Missing required field`)
      structuralScore -= 5
    }

    // Check option count
    if (q.options.length !== 4) {
      result.errors.push(`Q${idx + 1}: Must have exactly 4 options (has ${q.options.length})`)
      structuralScore -= 5
    }

    // Check for duplicate options
    const uniqueOptions = new Set(q.options)
    if (uniqueOptions.size !== q.options.length) {
      result.errors.push(`Q${idx + 1}: Duplicate options detected`)
      structuralScore -= 5
    }
  })

  // Level 2: Quality validation
  const selfAdmittedErrors = [
    'oikea vastaus on',
    'lähin vastaus',
    'valitaan se',
    'Tehtävässä on virheellinen',
    'Huom:',
    'Korjataan'
  ]

  questions.forEach((q, idx) => {
    const explanation = q.explanation?.toLowerCase() || ''

    for (const phrase of selfAdmittedErrors) {
      if (explanation.includes(phrase.toLowerCase())) {
        result.errors.push(`Q${idx + 1}: AI admitted answer is wrong: "${phrase}"`)
        qualityScore -= 15  // Major deduction
      }
    }

    // Check for visual references
    const visualKeywords = ['kuva', 'sivu', 'taulukko', 'kaavio']
    for (const keyword of visualKeywords) {
      if (q.question.toLowerCase().includes(keyword)) {
        result.warnings.push(`Q${idx + 1}: Visual reference detected: "${keyword}"`)
        qualityScore -= 5
      }
    }
  })

  // Level 3: Mathematical validation
  questions.forEach((q, idx) => {
    // Check correct_answer is in options
    if (!q.options.includes(q.correct_answer)) {
      result.errors.push(`Q${idx + 1}: correct_answer "${q.correct_answer}" not in options`)
      mathematicalScore -= 5
    }

    // Check Finnish language (at least one Finnish character)
    const finnishChars = /[äöåÄÖÅ]/
    if (!finnishChars.test(q.question + q.explanation)) {
      result.warnings.push(`Q${idx + 1}: Missing Finnish characters`)
      mathematicalScore -= 2
    }
  })

  // Calculate final score
  result.score = Math.max(0, structuralScore + qualityScore + mathematicalScore)
  result.passed = result.score >= MATH_EXAM_CONFIG.VALIDATION_THRESHOLD

  return result
}
```

---

### Task 2.7: Implement Main Generation Method

**Add to**: `/src/lib/services/math-exam-service.ts`

**Method**: `static async generateMathExam(options: MathExamGenerationOptions): Promise<MathExamResult>`

**Flow**:
1. Get math prompt
2. Call Gemini with retry
3. Parse JSON response
4. Validate exam quality
5. Return result

**Checklist**:
- [ ] Log start of generation
- [ ] Call `getMathPrompt()` with grade
- [ ] Call `callGeminiWithRetry()` with images
- [ ] Handle null response (all retries failed)
- [ ] Parse JSON with `safeJsonParse()`
- [ ] Validate with `validateMathExam()`
- [ ] Check validation threshold (90+ points)
- [ ] Calculate token usage with `createUsageMetadata()`
- [ ] Return `MathExamResult` with all fields

**Code Structure**:
```typescript
export class MathExamService {
  /**
   * Generate math exam from textbook images
   * Uses V1 prompt with temperature retry and validation
   */
  static async generateMathExam(options: MathExamGenerationOptions): Promise<MathExamResult> {
    const { images, grade, language, processingId } = options

    console.log('[Math Service] Starting math exam generation')
    console.log('[Math Service] Grade:', grade)
    console.log('[Math Service] Language:', language)
    console.log('[Math Service] Images:', images.length)

    try {
      // Step 1: Get math prompt
      const prompt = this.getMathPrompt(grade, language)
      console.log('[Math Service] Prompt length:', prompt.length, 'characters')

      // Step 2: Call Gemini with temperature retry
      const geminiResult = await this.callGeminiWithRetry(prompt, images, processingId)

      if (!geminiResult) {
        return {
          success: false,
          error: 'Math exam generation failed',
          details: 'All temperature retry attempts failed (infinite loops or API errors)'
        }
      }

      console.log(`[Math Service] ✅ Success with temperature ${geminiResult.temperature}`)

      // Step 3: Parse JSON response
      const parseResult = safeJsonParse(geminiResult.text)

      if (!parseResult.success) {
        return {
          success: false,
          error: 'Failed to parse Gemini response',
          details: `JSON parse error: ${parseResult.error}`
        }
      }

      const examData = parseResult.data as { questions: MathQuestion[]; topic?: string; grade?: number }

      if (!examData.questions || examData.questions.length === 0) {
        return {
          success: false,
          error: 'No questions generated',
          details: 'Gemini returned valid JSON but with no questions'
        }
      }

      console.log('[Math Service] Parsed', examData.questions.length, 'questions')

      // Step 4: Validate exam quality
      const validation = this.validateMathExam(examData.questions)

      console.log(`[Math Service] Validation score: ${validation.score}/100`)

      if (!validation.passed) {
        console.error('[Math Service] ❌ Validation failed:', validation.errors)
        return {
          success: false,
          error: 'Math exam validation failed',
          details: `Score: ${validation.score}/100. Errors: ${validation.errors.join(', ')}`
        }
      }

      if (validation.warnings.length > 0) {
        console.warn('[Math Service] ⚠️  Warnings:', validation.warnings)
      }

      // Step 5: Calculate usage metadata
      const usage = createUsageMetadata(prompt, geminiResult.text, undefined)

      // Step 6: Return success result
      return {
        success: true,
        rawText: JSON.stringify(examData, null, 2),
        questions: examData.questions,
        topic: examData.topic,
        grade: examData.grade || grade,
        processingTime: geminiResult.processingTime,
        temperatureUsed: geminiResult.temperature,
        validationScore: validation.score,
        geminiUsage: usage
      }

    } catch (error) {
      console.error('[Math Service] Unexpected error:', error)
      return {
        success: false,
        error: 'Math exam generation error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // ... private methods (getMathPrompt, callGeminiWithRetry, detectInfiniteLoop, validateMathExam) ...
}
```

---

### Task 2.8: Add Math Config Constants

**File**: `/src/lib/config.ts`

**Add After Line 58** (after `EXAM_CONFIG`):

```typescript
// Math Exam Configuration
export const MATH_EXAM_CONFIG = {
  DEFAULT_QUESTION_COUNT: 15,
  QUESTION_DISTRIBUTION: {
    computational: 6,           // Pure numerical calculation
    formula_simplification: 4,  // Apply or simplify correctly
    word_problems: 3,           // Realistic numeric applications
    conceptual: 2               // Reasoning or understanding
  },
  TEMPERATURE_RETRY_STRATEGY: [0, 0.3, 0.5],
  MAX_RETRY_ATTEMPTS: 3,
  VALIDATION_THRESHOLD: 90, // Minimum score to pass (out of 100)
  INFINITE_LOOP_DETECTION: {
    MAX_CHARS: 50000,
    REPEATED_PHRASE_THRESHOLD: 5,
    KNOWN_LOOP_PHRASE_THRESHOLD: 10
  }
} as const
```

**Checklist**:
- [ ] Add `MATH_EXAM_CONFIG` constant
- [ ] Use `as const` for type safety
- [ ] Document each field with comments
- [ ] Export from config.ts

---

### Task 2.9: Test Math Service Standalone

**Create Test Script**: `test-math-service-local.ts`

```typescript
import { MathExamService } from './src/lib/services/math-exam-service'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function testMathService() {
  console.log('🧪 Testing Math Exam Service...')

  // Load test image
  const imagePath = path.join(__dirname, 'assets/images/math8thgrade/potenssi.JPG')
  const imageBuffer = fs.readFileSync(imagePath)
  const imageBase64 = imageBuffer.toString('base64')

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: 'image/jpeg'
    }
  }

  // Call math service
  const result = await MathExamService.generateMathExam({
    images: [imagePart],
    grade: 8,
    language: 'fi',
    processingId: 'test-local-' + Date.now()
  })

  console.log('\n📊 Result:', JSON.stringify(result, null, 2))

  if (result.success) {
    console.log('\n✅ SUCCESS')
    console.log('Questions:', result.questions?.length)
    console.log('Topic:', result.topic)
    console.log('Temperature:', result.temperatureUsed)
    console.log('Validation Score:', result.validationScore)
    console.log('Processing Time:', result.processingTime, 'ms')
  } else {
    console.log('\n❌ FAILURE')
    console.log('Error:', result.error)
    console.log('Details:', result.details)
  }
}

testMathService().catch(console.error)
```

**Run Test**:
```bash
npx tsx test-math-service-local.ts
```

**Expected Output**:
```
🧪 Testing Math Exam Service...
[Math Service] Starting math exam generation
[Math Service] Grade: 8
[Math Service] Language: fi
[Math Service] Images: 1
[Math Service] Prompt length: 7234 characters
[Math Service] Attempt 1/3 (temperature: 0)
[Math Service] Response received: 12456 chars in 4523ms
[Math Service] ✅ Success with temperature 0
[Math Service] Parsed 15 questions
[Math Service] Validation score: 100/100

✅ SUCCESS
Questions: 15
Topic: Exponents and Powers
Temperature: 0
Validation Score: 100
Processing Time: 4523 ms
```

**Checklist**:
- [ ] Create test script
- [ ] Run with `npx tsx test-math-service-local.ts`
- [ ] Verify 15 questions generated
- [ ] Check validation score >= 90
- [ ] Verify LaTeX notation present in questions
- [ ] Check no forbidden error phrases in explanations

---

### Task 2.10: Commit Math Service

```bash
git add src/lib/services/math-exam-service.ts
git add src/lib/config.ts
git add test-math-service-local.ts
git commit -m "Add Math Exam Service with V1 prompt and validation

- Create standalone math exam generation service
- Implement temperature retry logic (0 → 0.3 → 0.5)
- Add infinite loop detection for neural degeneration
- Implement 3-level validation (structural, quality, mathematical)
- Include V1 math prompt with forbidden error patterns
- Add math config constants (question distribution, thresholds)
- Standalone service tested with potenssi.JPG image
- Validation threshold: 90/100 points

Refs: MATH-INTEGRATION-TASK-LIST.md Phase 2"

git push origin staging
```

---

## Phase 3: Integrate Math Routing

**Estimated Time**: 1 hour
**Risk Level**: Medium (modifies existing service)
**Goal**: Route `category=mathematics` to math service

### Task 3.1: Add Math Service Import

**File**: `/src/lib/services/mobile-api-service.ts`

**Line ~12** (after other imports):
```typescript
import { MathExamService } from './math-exam-service'
```

**Checklist**:
- [ ] Add import statement
- [ ] Verify path is correct (`./math-exam-service`)
- [ ] Run `npm run build` - should compile without errors

---

### Task 3.2: Modify processWithGemini Method

**File**: `/src/lib/services/mobile-api-service.ts`

**Location**: Lines 215-301 (method `processWithGemini`)

**Current Logic**:
```typescript
private static async processWithGemini(
  fileMetadataList: any[],
  customPrompt: string | undefined,
  timer: OperationTimer,
  category?: string,
  subject?: string,
  grade?: number,
  language: string = 'en'
): Promise<...> {
  // Existing logic: language_studies, category_aware prompts
  // ...
}
```

**Add Router Logic at START of method** (before existing logic):

```typescript
private static async processWithGemini(...) {
  // === MATH ROUTING ===
  // Route mathematics category to specialized math service
  if (category === 'mathematics') {
    console.log('=== ROUTING TO MATH EXAM SERVICE ===')
    return await this.processWithMathService(
      fileMetadataList,
      grade,
      language || 'fi',  // Math defaults to Finnish if not specified
      timer.getCurrentDuration().toString() // Use as processingId
    )
  }

  // === EXISTING LOGIC FOR OTHER CATEGORIES (UNCHANGED) ===
  try {
    // Determine which prompt to use
    let promptToUse: string
    let promptType: string

    if (customPrompt && customPrompt.trim() !== '') {
      // ... existing custom prompt logic
    } else if (category === 'language_studies') {
      // ... existing language studies logic
    } else {
      // ... existing category aware logic
    }

    // ... rest of existing method unchanged
  }
}
```

**Checklist**:
- [ ] Add math routing at **start** of method (before try block)
- [ ] Check `category === 'mathematics'` exactly
- [ ] Return result from `processWithMathService()`
- [ ] Don't modify any existing logic below
- [ ] Keep all existing error handling

---

### Task 3.3: Add processWithMathService Method

**File**: `/src/lib/services/mobile-api-service.ts`

**Location**: After `processWithGemini` method (around line 302)

**Add New Method**:

```typescript
/**
 * Process math exam generation using specialized math service
 * with temperature retry and validation
 */
private static async processWithMathService(
  fileMetadataList: any[],
  grade: number | undefined,
  language: string,
  processingId: string
): Promise<{ success: true; data: any; processingTime: number; promptUsed: string } | { success: false; error: string; details: string }> {
  try {
    console.log('[Math Routing] Starting math exam generation')
    console.log('[Math Routing] Grade:', grade || 8)
    console.log('[Math Routing] Language:', language)
    console.log('[Math Routing] Images:', fileMetadataList.length)

    // Load image data into ImagePart format
    const fs = require('fs').promises
    const path = require('path')
    const imageParts = []

    for (const fileMetadata of fileMetadataList) {
      const filePath = path.join('/tmp', `${fileMetadata.id}${path.extname(fileMetadata.filename)}`)
      const buffer = await fs.readFile(filePath)
      const base64Data = buffer.toString('base64')

      imageParts.push({
        inlineData: {
          data: base64Data,
          mimeType: fileMetadata.mimeType
        }
      })
    }

    // Call math service with temperature retry and validation
    const mathResult = await MathExamService.generateMathExam({
      images: imageParts,
      grade: grade || 8,
      language: language || 'fi',
      processingId
    })

    if (!mathResult.success) {
      console.error('[Math Routing] Math service failed:', mathResult.error)
      return {
        success: false,
        error: mathResult.error || 'Math exam generation failed',
        details: mathResult.details || 'Unknown error'
      }
    }

    console.log('[Math Routing] ✅ Success!')
    console.log('[Math Routing] Temperature used:', mathResult.temperatureUsed)
    console.log('[Math Routing] Validation score:', mathResult.validationScore, '/100')
    console.log('[Math Routing] Question count:', mathResult.questions?.length || 0)
    console.log('[Math Routing] Topic:', mathResult.topic)

    // Format response to match existing system's format
    // This ensures compatibility with downstream exam creation logic
    const formattedResponse = {
      rawText: mathResult.rawText, // JSON string of questions
      geminiUsage: mathResult.geminiUsage
    }

    return {
      success: true,
      data: formattedResponse,
      processingTime: mathResult.processingTime || 0,
      promptUsed: 'MATH_V1' // Identifier for logging
    }

  } catch (error: any) {
    console.error('[Math Routing] Error:', error)
    return {
      success: false,
      error: 'Math service processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

**Checklist**:
- [ ] Add method after `processWithGemini`
- [ ] Use `private static` modifier
- [ ] Match return type with `processWithGemini`
- [ ] Load images from `/tmp` directory
- [ ] Call `MathExamService.generateMathExam()`
- [ ] Format response to match existing format (rawText + geminiUsage)
- [ ] Return `promptUsed: 'MATH_V1'` for logging
- [ ] Handle errors gracefully

---

### Task 3.4: Update Logging for Math Route

**File**: `/src/lib/services/mobile-api-service.ts`

**Location**: Around line 250 (inside `processWithGemini`)

**Find This**:
```typescript
console.log('Using prompt type:', promptType)
```

**Update To**:
```typescript
// Math routing happens before this point, so promptType is only for non-math
console.log('Using prompt type:', category === 'mathematics' ? 'MATH_V1' : promptType)
```

**Checklist**:
- [ ] Update logging to distinguish math vs non-math
- [ ] Verify console logs show correct prompt type
- [ ] Don't break existing logging

---

### Task 3.5: Test Math Routing Integration

**Create Test Script**: `test-math-routing.sh`

```bash
#!/bin/bash
# Test math exam generation through mobile API with routing

echo "🧪 Testing Math Routing Integration"
echo ""

# Test 1: Math exam (should route to math service)
echo "Test 1: Mathematics category (should use Math Service)"
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/math8thgrade/potenssi.JPG" \
  -F "category=mathematics" \
  -F "grade=8" \
  -F "language=fi" \
  -F "student_id=test-math-routing-$(date +%s)" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -o /tmp/math-routing-test.json

echo ""
echo "Response saved to: /tmp/math-routing-test.json"
cat /tmp/math-routing-test.json | jq .
echo ""

# Test 2: Core academics (should NOT route to math service)
echo ""
echo "Test 2: Core Academics category (should use existing logic)"
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/history_de/some-image.jpg" \
  -F "category=core_academics" \
  -F "grade=5" \
  -F "student_id=test-core-routing-$(date +%s)" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -o /tmp/core-routing-test.json

echo ""
echo "Response saved to: /tmp/core-routing-test.json"
cat /tmp/core-routing-test.json | jq .
```

**Make Executable and Run**:
```bash
chmod +x test-math-routing.sh
./test-math-routing.sh
```

**Expected Console Output** (from server logs):

**For Math Request**:
```
=== ROUTING TO MATH EXAM SERVICE ===
[Math Routing] Starting math exam generation
[Math Routing] Grade: 8
[Math Routing] Language: fi
[Math Service] Starting math exam generation
[Math Service] Attempt 1/3 (temperature: 0)
[Math Service] ✅ Success with temperature 0
[Math Service] Validation score: 100/100
[Math Routing] ✅ Success!
[Math Routing] Temperature used: 0
[Math Routing] Question count: 15
```

**For Core Academics Request**:
```
=== USING LEGACY MODE ===
Using prompt type: CATEGORY_AWARE_WITH_SUMMARY(core_academics, ...)
(No math routing messages)
```

**Checklist**:
- [ ] Math category routes to math service
- [ ] Non-math categories use existing logic
- [ ] Both return valid exam URLs
- [ ] Exams created in database
- [ ] No errors in console
- [ ] Response format identical for both

---

### Task 3.6: Verify Backward Compatibility

**Test All Categories**:

```bash
# Test 1: Mathematics (new routing)
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/math8thgrade/algebra.jpg" \
  -F "category=mathematics" \
  -F "grade=8"

# Test 2: Core Academics (existing routing)
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/history.jpg" \
  -F "category=core_academics" \
  -F "grade=7"

# Test 3: Language Studies (existing routing)
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/spanish.jpg" \
  -F "category=language_studies" \
  -F "grade=6"

# Test 4: No category (defaults to core_academics, existing routing)
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/general.jpg" \
  -F "grade=5"
```

**Success Criteria**:
- [ ] All 4 tests return HTTP 200
- [ ] All return valid `examUrl`, `examId`, `gradingUrl`
- [ ] Math exam has LaTeX in questions
- [ ] Non-math exams work as before
- [ ] No TypeScript errors
- [ ] No runtime errors

---

### Task 3.7: Commit Math Routing

```bash
git add src/lib/services/mobile-api-service.ts
git add test-math-routing.sh
git commit -m "Integrate math service routing into mobile API

- Route category=mathematics to MathExamService
- Add processWithMathService() method for math routing
- Load images from /tmp and convert to ImagePart format
- Return formatted response matching existing system structure
- Backward compatible: non-math categories unchanged
- Tested with mathematics, core_academics, language_studies

Routing Logic:
  mathematics → MathExamService (V1 prompt, temp retry, validation)
  other categories → existing logic (unchanged)

Refs: MATH-INTEGRATION-TASK-LIST.md Phase 3"

git push origin staging
```

---

## Phase 4: Testing

**Estimated Time**: 2 hours
**Risk Level**: Low (testing only)
**Goal**: Comprehensive testing of full integration

### Task 4.1: Test Math Exam End-to-End

**Test Flow**:
1. Generate exam via API
2. View in browser (verify LaTeX renders)
3. Submit answers
4. View grading results

**Test Script**: `test-math-e2e.sh`

```bash
#!/bin/bash
# End-to-end test for math exam integration

echo "🎯 Math Exam End-to-End Test"
echo "============================="
echo ""

# Step 1: Generate exam
echo "Step 1: Generating math exam..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/math8thgrade/geometry.JPG" \
  -F "category=mathematics" \
  -F "grade=8" \
  -F "language=fi" \
  -F "student_id=test-e2e-$(date +%s)")

echo "$RESPONSE" | jq .

# Extract exam URL
EXAM_URL=$(echo "$RESPONSE" | jq -r '.examUrl')
EXAM_ID=$(echo "$RESPONSE" | jq -r '.examId')

if [ "$EXAM_URL" == "null" ] || [ -z "$EXAM_URL" ]; then
  echo "❌ Failed to generate exam"
  exit 1
fi

echo ""
echo "✅ Exam generated successfully"
echo "Exam URL: $EXAM_URL"
echo "Exam ID: $EXAM_ID"
echo ""

# Step 2: Manual browser test
echo "Step 2: Manual Browser Test"
echo "👉 Open this URL in your browser: $EXAM_URL"
echo ""
echo "Verify:"
echo "  1. LaTeX math renders correctly (fractions, exponents)"
echo "  2. Question text is readable"
echo "  3. Options display properly"
echo "  4. No raw \$ symbols showing"
echo ""
echo "Press Enter when done reviewing..."
read

# Step 3: Test exam retrieval API
echo ""
echo "Step 3: Testing exam retrieval..."
EXAM_DATA=$(curl -s "http://localhost:3001/api/exam/$EXAM_ID")
QUESTION_COUNT=$(echo "$EXAM_DATA" | jq '.data.questions | length')

echo "Question count: $QUESTION_COUNT"

if [ "$QUESTION_COUNT" -ne 15 ]; then
  echo "⚠️  Expected 15 questions, got $QUESTION_COUNT"
fi

echo ""
echo "Sample question:"
echo "$EXAM_DATA" | jq '.data.questions[0]' | head -20

echo ""
echo "✅ End-to-end test complete"
```

**Run Test**:
```bash
chmod +x test-math-e2e.sh
./test-math-e2e.sh
```

**Manual Verification in Browser**:
- [ ] Open exam URL
- [ ] Verify LaTeX renders (not raw `$...$`)
- [ ] Check fractions display as ⎺x⎺ not `$\frac{x}{2}$`
  2
- [ ] Check exponents display as x² not `$x^2$`
- [ ] Check Greek letters display as π not `$\pi$`
- [ ] Navigate through all questions
- [ ] Submit answers (any answers)
- [ ] View grading page
- [ ] Verify feedback displays

---

### Task 4.2: Test LaTeX Rendering Specifically

**Create Test Exam with Various LaTeX Patterns**:

```bash
# Test various LaTeX patterns
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/math8thgrade/algebra.jpg" \
  -F "category=mathematics" \
  -F "grade=8" \
  -F "language=fi"
```

**In Browser, Check These Render Correctly**:

| LaTeX Input | Expected Render | Check |
|-------------|-----------------|-------|
| `$\frac{1}{2}$` | ½ (fraction) | [ ] |
| `$x^2$` | x² (superscript) | [ ] |
| `$x_1$` | x₁ (subscript) | [ ] |
| `$\pi r^2$` | πr² | [ ] |
| `$\sqrt{16}$` | √16 | [ ] |
| `$\frac{x^2 + 5x}{3}$` | (x² + 5x)/3 | [ ] |
| `$\alpha$, $\beta$` | α, β | [ ] |
| `$10^{-3}$` | 10⁻³ | [ ] |
| `$$\int x dx$$` | ∫ x dx (display mode) | [ ] |

**Edge Cases**:
- [ ] Text with `$` but not LaTeX: "The price is $5.99" → displays as-is
- [ ] Unmatched delimiter: "Cost is $5" → displays as-is
- [ ] Very long formula: wraps properly on mobile
- [ ] Formula in option text: renders in option box

---

### Task 4.3: Performance Testing

**Test Response Times**:

```bash
# Test math generation speed
for i in {1..5}; do
  echo "Test $i:"
  curl -w "Time: %{time_total}s\n" -o /dev/null -s \
    -X POST http://localhost:3001/api/mobile/exam-questions \
    -F "images=@assets/images/math8thgrade/potenssi.JPG" \
    -F "category=mathematics" \
    -F "grade=8"
  echo ""
done
```

**Expected Times**:
- [ ] First attempt (temp 0): 3-6 seconds
- [ ] With retry (temp 0.3): 6-12 seconds
- [ ] With retry (temp 0.5): 9-18 seconds

**Success Criteria**:
- [ ] Average response time < 10 seconds
- [ ] No timeouts (< 60 seconds)
- [ ] Consistent results across runs

---

### Task 4.4: Validation Testing

**Test Validation Scores**:

```bash
# Generate 5 math exams and check validation scores
for image in potenssi.JPG algebra.jpg geometry.JPG jakolasku.JPG; do
  echo "Testing: $image"

  # Check server logs for validation score
  curl -s -X POST http://localhost:3001/api/mobile/exam-questions \
    -F "images=@assets/images/math8thgrade/$image" \
    -F "category=mathematics" \
    -F "grade=8" | jq .

  echo ""
done
```

**Check Server Logs For**:
- [ ] All exams pass validation (score >= 90)
- [ ] No self-admitted errors detected
- [ ] No visual references detected
- [ ] All correct_answer values in options
- [ ] Temperature used (ideally 0)

**If Validation Fails**:
1. Check which error triggered failure
2. Review question content in database
3. Verify prompt includes forbidden error patterns
4. May need to adjust validation threshold or prompt

---

### Task 4.5: Mobile App Compatibility Test

**Test Response Format**:

```bash
# Verify response matches Flutter app expectations
RESPONSE=$(curl -s -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/math8thgrade/potenssi.JPG" \
  -F "category=mathematics" \
  -F "grade=8" \
  -F "student_id=flutter-test-user")

echo "$RESPONSE" | jq '{
  examUrl: .examUrl,
  examId: .examId,
  gradingUrl: .gradingUrl,
  metadata: .data.metadata
}'
```

**Required Fields** (Flutter app expects):
- [ ] `examUrl` (string)
- [ ] `examId` (UUID)
- [ ] `gradingUrl` (string)
- [ ] `data.metadata.processingTime` (number)
- [ ] `data.metadata.imageCount` (number)
- [ ] No breaking changes to response structure

**If Testing with Real Flutter App**:
1. Point Flutter to staging: `https://exam-generator-staging.vercel.app`
2. Generate math exam from app
3. View exam in mobile browser
4. Verify LaTeX renders on mobile
5. Submit answers
6. View grading

---

### Task 4.6: Error Handling Tests

**Test Various Error Scenarios**:

```bash
# Test 1: Invalid image
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@README.md" \
  -F "category=mathematics" \
  -F "grade=8"
# Expected: HTTP 400, validation error

# Test 2: Too many images
for i in {1..6}; do
  FILES="$FILES -F images=@assets/images/math8thgrade/potenssi.JPG"
done
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  $FILES \
  -F "category=mathematics" \
  -F "grade=8"
# Expected: HTTP 400, too many files

# Test 3: Missing student_id on staging
curl -X POST https://exam-generator-staging.vercel.app/api/mobile/exam-questions \
  -F "images=@assets/images/math8thgrade/potenssi.JPG" \
  -F "category=mathematics" \
  -F "grade=8"
# Expected: HTTP 400, user_id required

# Test 4: Invalid grade
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/math8thgrade/potenssi.JPG" \
  -F "category=mathematics" \
  -F "grade=99"
# Expected: HTTP 400, invalid grade
```

**Success Criteria**:
- [ ] All error scenarios return appropriate HTTP codes
- [ ] Error messages are clear and helpful
- [ ] No server crashes
- [ ] No leaked sensitive info in errors

---

### Task 4.7: Regression Testing

**Test Non-Math Categories Still Work**:

```bash
# Test 1: Core Academics
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/history.jpg" \
  -F "category=core_academics" \
  -F "grade=7"

# Test 2: Language Studies
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/spanish.jpg" \
  -F "category=language_studies" \
  -F "grade=6"

# Test 3: No category specified (defaults)
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@assets/images/biology.jpg" \
  -F "grade=5"
```

**Verify**:
- [ ] All return HTTP 200
- [ ] Exams created in database
- [ ] No errors in server logs
- [ ] Response format unchanged
- [ ] No math-related logs for non-math categories

---

### Task 4.8: Database Verification

**Check Math Exams in Database**:

```sql
-- View recent math exams
SELECT
  id,
  subject,
  grade,
  status,
  created_at,
  LENGTH(generation_prompt) as prompt_length,
  (SELECT COUNT(*) FROM examgenie_questions WHERE exam_id = examgenie_exams.id) as question_count
FROM examgenie_exams
WHERE subject LIKE '%Math%'
  OR generation_prompt LIKE '%FORBIDDEN ERROR%'
ORDER BY created_at DESC
LIMIT 10;

-- Check question content
SELECT
  question_number,
  LEFT(question_text, 100) as question_preview,
  LENGTH(question_text) as question_length,
  jsonb_array_length(options) as option_count,
  LENGTH(explanation) as explanation_length
FROM examgenie_questions
WHERE exam_id = 'your-math-exam-id'
ORDER BY question_number;
```

**Verify**:
- [ ] Math exams have `generation_prompt` stored
- [ ] Prompt contains "FORBIDDEN ERROR" (indicating math prompt)
- [ ] Exactly 15 questions per exam
- [ ] All questions have 4 options
- [ ] Question text contains `$` (LaTeX delimiters)
- [ ] No `audio_url` initially (math doesn't generate summaries)

---

## Phase 5: Deployment

**Estimated Time**: 30 minutes
**Risk Level**: Low (already tested on staging)
**Goal**: Deploy to production

### Task 5.1: Final Pre-Deployment Checks

**Before Deploying to Production**:

- [ ] All Phase 4 tests passed
- [ ] `npm run build` succeeds with no errors
- [ ] `npm run lint` passes
- [ ] Staging deployment working for 24+ hours
- [ ] No critical errors in staging logs
- [ ] Mobile app tested on staging (if available)
- [ ] Documentation updated (README.md)

---

### Task 5.2: Update Documentation

**File**: `README.md`

**Update "Current Status" Section** (line 336):

```markdown
## Current Status (October 2025)

✅ **Production Active:** https://exam-generator.vercel.app
✅ **Mathematics Integration:** LaTeX support + V1 prompt with validation
✅ **15 Questions Per Exam:** Configurable via `EXAM_CONFIG.DEFAULT_QUESTION_COUNT`
✅ **KaTeX Rendering:** LaTeX math notation renders beautifully in exams
✅ **Math Service:** Temperature retry (0→0.3→0.5) + 3-level validation
✅ **completed_at Fix:** Tracks exam completion status correctly
✅ **Mobile API Complete:** Full exam generation, retrieval, and statistics
✅ **AI Grading:** Automated grading with detailed feedback
✅ **Answer Shuffling:** Fisher-Yates randomization (even distribution)
✅ **Prompt Optimization:** Variant 4 (100% quality, 35% size reduction)
⚠️ **Legacy Code:** OCR endpoints exist but are unused
```

**Add to "Key Features" Section** (after line 203):

```markdown
### 6. Mathematics Exam Generation (NEW)
- **Specialized Service**: Math-specific prompt with validation
- **LaTeX Support**: Beautiful mathematical notation rendering with KaTeX
- **Quality Control**: 3-level validation (structural, quality, mathematical)
- **Temperature Retry**: Automatic retry on failures (0 → 0.3 → 0.5)
- **Question Distribution**: 6 computational, 4 formula, 3 word problems, 2 conceptual
- **Validation Threshold**: 90+ points required (out of 100)
- **Implementation**: `src/lib/services/math-exam-service.ts`
```

**Checklist**:
- [ ] Update "Current Status" section
- [ ] Add Mathematics feature to "Key Features"
- [ ] Commit documentation changes

---

### Task 5.3: Create Production Release PR

```bash
# Ensure on staging with all changes
git checkout staging
git pull origin staging

# Verify all changes committed
git status
# Should show "nothing to commit, working tree clean"

# Run final build
npm run build
# Must succeed

# Create PR to main
gh pr create \
  --base main \
  --head staging \
  --title "Release: Mathematics Exam Integration with LaTeX Support" \
  --body "## Summary

This release integrates mathematics exam generation with LaTeX rendering support.

### Features Added
- ✅ KaTeX support for LaTeX math notation rendering
- ✅ Math Exam Service with V1 prompt and validation
- ✅ Temperature retry logic (0 → 0.3 → 0.5)
- ✅ 3-level validation (structural, quality, mathematical)
- ✅ Routing for category=mathematics

### Changes
- Added KaTeX CDN to root layout (layout.tsx)
- Added KaTeX rendering to exam viewer (exam/[id]/page.tsx)
- Created Math Exam Service (math-exam-service.ts)
- Added math config constants (config.ts)
- Integrated math routing (mobile-api-service.ts)

### Testing
- ✅ Tested with 5+ math images (potenssi, algebra, geometry, jakolasku)
- ✅ LaTeX renders correctly on desktop and mobile
- ✅ Validation scores 90-100 on all test exams
- ✅ Backward compatible with non-math categories
- ✅ No performance regressions

### Database Changes
- None (uses existing schema)

### Breaking Changes
- None (backward compatible)

### Deployment Notes
- Automatic Vercel deployment after merge
- No environment variable changes needed
- Monitor logs for validation scores

Refs: MATH-INTEGRATION-TASK-LIST.md"
```

**Checklist**:
- [ ] PR created successfully
- [ ] All checks pass (build, lint, type-check)
- [ ] Review PR diff carefully
- [ ] No unexpected changes
- [ ] No secrets or credentials in code

---

### Task 5.4: Merge and Deploy

**After PR Review**:

```bash
# Merge PR (via GitHub UI or CLI)
gh pr merge --squash --delete-branch

# Wait for Vercel deployment (~2 minutes)
# Monitor: https://vercel.com/your-team/exam-generator/deployments
```

**Post-Deployment Verification**:

- [ ] Visit production: https://exam-generator.vercel.app
- [ ] Test math exam generation:
  ```bash
  curl -X POST https://exam-generator.vercel.app/api/mobile/exam-questions \
    -F "images=@assets/images/math8thgrade/potenssi.JPG" \
    -F "category=mathematics" \
    -F "grade=8" \
    -F "student_id=fc495b10-c771-4bd1-8bb4-b2c5003b9613"
  ```
- [ ] Open exam URL in browser
- [ ] Verify LaTeX renders
- [ ] Submit and grade
- [ ] Check Vercel logs for errors
- [ ] Test non-math categories still work

---

### Task 5.5: Monitor Production

**For Next 24 Hours**:

- [ ] Check Vercel logs every 2 hours
- [ ] Monitor error rates
- [ ] Check validation scores in logs
- [ ] Verify no user complaints
- [ ] Watch database for math exam creation

**Metrics to Track**:
```sql
-- Math exam generation rate
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as math_exams_generated
FROM examgenie_exams
WHERE subject LIKE '%Math%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Validation score distribution (from logs)
-- Search for: "[Math Service] Validation score:"
```

---

## Rollback Plan

**If Critical Issues Occur**:

### Option 1: Revert Git Commits

```bash
# Find commit before math integration
git log --oneline

# Revert to previous commit
git revert HEAD~3..HEAD
git push origin staging

# Vercel auto-deploys revert
```

### Option 2: Disable Math Routing

**Quick Fix** (edit on GitHub directly):

**File**: `src/lib/services/mobile-api-service.ts`

**Change**:
```typescript
if (category === 'mathematics') {
  // Temporarily disabled - routing to default
  console.log('Math routing temporarily disabled, using default')
  // return await this.processWithMathService(...)
}
```

**This**:
- Keeps math service code (no deletion)
- Routes math to existing system temporarily
- Can be re-enabled quickly

### Option 3: Remove KaTeX (if rendering breaks)

**File**: `src/app/layout.tsx`

**Remove**:
```tsx
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex..." />
```

**File**: `src/app/exam/[id]/page.tsx`

**Comment Out**:
```tsx
// <Script src="https://cdn.jsdelivr.net/npm/katex..." />
// useEffect for renderMathInElement
```

**Impact**: LaTeX shows as raw text, but functionality intact

---

## Timeline Estimate

| Phase | Time | Dependencies |
|-------|------|--------------|
| **Phase 1: KaTeX Support** | 1 hour | None |
| **Phase 2: Math Service** | 2-3 hours | Phase 1 |
| **Phase 3: Math Routing** | 1 hour | Phase 2 |
| **Phase 4: Testing** | 2 hours | Phase 3 |
| **Phase 5: Deployment** | 30 min | Phase 4 |
| **Total** | **6.5-7.5 hours** | Sequential |

**Recommended Schedule**:

**Day 1** (3-4 hours):
- Morning: Phase 1 (KaTeX) + Phase 2 (Math Service)
- Test Phase 1 and 2 independently

**Day 2** (3-4 hours):
- Morning: Phase 3 (Routing) + Phase 4 (Testing)
- Afternoon: Phase 5 (Deployment)
- Monitor for 24 hours

---

## Success Criteria

### Must Have ✅
- [ ] Math exams render LaTeX correctly
- [ ] Validation scores >= 90 on test images
- [ ] Backward compatible (non-math categories unchanged)
- [ ] No TypeScript build errors
- [ ] Response format unchanged (Flutter compatibility)
- [ ] Temperature retry works (can observe in logs)

### Nice to Have 🎯
- [ ] Validation scores 95+ consistently
- [ ] Temperature 0 success rate >70%
- [ ] Response time <8 seconds average
- [ ] Zero production errors in first 24 hours

---

## Questions & Support

**If Issues Arise**:
1. Check this task list for rollback procedures
2. Review `MATH-EXAM-GENERATION-README.md` for prompt details
3. Check Vercel logs: `vercel logs --follow`
4. Review validation errors in console output
5. Test locally first: `npm run dev`

**Key Files Modified**:
- `/src/app/layout.tsx` (KaTeX CSS)
- `/src/app/exam/[id]/page.tsx` (KaTeX rendering)
- `/src/lib/services/math-exam-service.ts` (NEW)
- `/src/lib/config.ts` (math constants)
- `/src/lib/services/mobile-api-service.ts` (routing)

**Key Files to Monitor**:
- Vercel deployment logs
- Browser console (for KaTeX errors)
- Server logs (for validation scores)
- Database (for math exam records)

---

**Created**: 2025-10-14
**Version**: 1.0
**Status**: Ready for Implementation

This task list will be marked as completed when Phase 5 is done and production is stable for 24 hours.
