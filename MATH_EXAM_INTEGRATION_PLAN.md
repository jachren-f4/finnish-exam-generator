# Math Exam Integration Plan
**ExamGenie - Mathematics Support Implementation**

**Document Version:** 1.0
**Date:** 2025-10-04
**Status:** 📋 Planning Phase
**Implementation Target:** Week 1-3

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Cost Analysis](#2-cost-analysis)
3. [Current System Analysis](#3-current-system-analysis)
4. [Integration Architecture](#4-integration-architecture)
5. [Database Schema Changes](#5-database-schema-changes)
6. [Mobile Client Considerations](#6-mobile-client-considerations)
7. [Implementation Phases](#7-implementation-phases)
8. [Detailed Task List](#8-detailed-task-list)
9. [File Structure](#9-file-structure)
10. [API Contract Changes](#10-api-contract-changes)
11. [Testing Strategy](#11-testing-strategy)
12. [Risk Mitigation](#12-risk-mitigation)
13. [Appendix A: Production-Ready Math Exam Prompt](#13-appendix-a-production-ready-math-exam-prompt)

---

## 1. Executive Summary

### Objective
Integrate mathematical exam generation and grading capabilities into the existing ExamGenie system while maintaining full backward compatibility with the Flutter mobile client and general exam functionality.

### Key Principles
- ✅ **Reuse existing infrastructure** - Same endpoints, same URL system, same database tables
- ✅ **Mobile client compatibility** - Minimal or zero changes to Flutter app
- ✅ **Type discrimination** - Use `exam_type` and `answer_type` fields to route logic
- ✅ **Phased rollout** - Generation first, grading second, web rendering third
- ✅ **Backward compatibility** - All existing exams continue to work

### Success Criteria
- [ ] Mobile client can generate math exams without code changes
- [ ] Math exams appear in same exam list as general exams
- [ ] Math questions display as readable text on mobile (Unicode symbols)
- [ ] Same exam URL system works for math and general exams
- [ ] Database supports 9 mathematical answer types
- [ ] Gemini generates valid math exam JSON (88%+ quality score)

---

## 2. Cost Analysis

### 2.1 Database Storage Costs

**Current `examgenie_questions` row size:**
```
Existing fields:
- id (UUID): 16 bytes
- exam_id (UUID): 16 bytes
- question_number (INT): 4 bytes
- question_text (TEXT): ~200 bytes avg
- question_type (TEXT): ~20 bytes
- options (JSONB): ~150 bytes
- correct_answer (TEXT): ~50 bytes
- explanation (TEXT): ~300 bytes
- max_points (INT): 4 bytes
- is_selected (BOOL): 1 byte
- created_at (TIMESTAMP): 8 bytes

Total per question: ~769 bytes
```

**Proposed new math fields:**
```
New fields:
- answer_type (TEXT): ~20 bytes
- answer_format (JSONB): ~100 bytes
- grading_rules (JSONB): ~80 bytes
- question_latex (TEXT): ~150 bytes avg
- explanation_latex (TEXT): ~120 bytes avg
- difficulty (TEXT): ~10 bytes
- curriculum_topic (TEXT): ~30 bytes
- estimated_time_seconds (INT): 4 bytes
- question_display_mode (TEXT): ~10 bytes

Additional per math question: ~524 bytes
New total per math question: ~1,293 bytes
```

**Storage Impact:**

| Scenario | Questions | Storage Size | Monthly Cost (Supabase Free) |
|----------|-----------|--------------|------------------------------|
| **Current (General exams)** | 10,000 | 7.69 MB | $0.00 (within 500 MB free tier) |
| **With Math Fields** | 10,000 math | 12.93 MB | $0.00 (within 500 MB free tier) |
| **Mixed (50/50)** | 5k general + 5k math | 10.31 MB | $0.00 (within 500 MB free tier) |
| **Scale: 100k questions** | 50k general + 50k math | 103.1 MB | $0.00 (within 500 MB free tier) |
| **Scale: 1M questions** | 500k general + 500k math | 1.03 GB | ~$0.03/month (Pro plan: $0.125/GB) |

**Supabase Pricing:**
- **Free tier:** Up to 500 MB database (covers 48,000+ math questions)
- **Pro tier ($25/mo):** 8 GB included, then $0.125/GB

**Conclusion:** ✅ **Negligible cost impact.** Even at 1M questions, additional storage cost is <$0.03/month. The NULL fields for non-math exams add zero storage cost in PostgreSQL (NULL values don't consume storage).

---

### 2.2 Gemini API Prompt Costs

**Current General Exam Prompt:**
```
Length: ~1,200 characters = ~300 tokens
```

**Proposed Math Exam Prompt (with topic detection):**
```
Length: ~4,800 characters = ~1,200 tokens

Breakdown:
- Role & context: 200 tokens
- Content difficulty analysis: 200 tokens
- Topic identification: 100 tokens
- Task description: 100 tokens
- Important requirements: 200 tokens
- Output format example: 300 tokens
- Validation rules: 100 tokens
```

**Cost Comparison:**

| Prompt Type | Input Tokens | Cost per Request | Cost per 1,000 Exams |
|-------------|--------------|------------------|----------------------|
| **General Exam** | 300 | $0.0000019* | $0.0019 |
| **Math Exam** | 1,200 | $0.0000075* | $0.0075 |
| **Difference** | +900 | +$0.0000056 | +$0.0056 |

*Gemini 2.5 Flash pricing: $0.00000625 per 1K input tokens

**Image Processing Cost (unchanged for both):**
- Cost: ~$0.00038 per image (based on Gemini Flash image pricing)
- Average: 2 images per exam = $0.00076

**Total Cost per Math Exam:**
```
Prompt input: $0.0000075
Images (2 avg): $0.00076
Output tokens (~3,000): $0.000019
Total: ~$0.00079 per math exam

vs General Exam: ~$0.00078
Difference: +$0.00001 per exam (+1.3%)
```

**Monthly Cost Projections:**

| Usage Level | Math Exams/Month | Total Cost | Increase vs General |
|-------------|------------------|------------|---------------------|
| **Small** | 1,000 | $0.79 | +$0.01 |
| **Medium** | 10,000 | $7.90 | +$0.10 |
| **Large** | 100,000 | $79.00 | +$1.00 |

**Conclusion:** ✅ **Minimal cost increase.** Math prompts add only ~1.3% to generation costs due to longer prompt. At 10,000 math exams/month, total cost is **$7.90** (vs $7.80 for general exams).

**Key Takeaway:** The primary cost driver is **image processing** (~96% of cost), not prompt length. Math-specific prompting adds negligible cost.

---

### 2.3 Total Cost Summary

**For a typical deployment (10,000 math exams/month):**

| Cost Component | Monthly Cost | % of Total |
|----------------|--------------|------------|
| Gemini API (generation) | $7.90 | 99.9% |
| Database storage | $0.00 | 0.0% |
| Additional math fields | $0.00 | 0.0% |
| **Total** | **$7.90** | **100%** |

**Comparison to general exams:** +$0.10/month (+1.3%)

---

## 3. Current System Analysis

### 3.1 Existing Architecture

**Mobile Client Flow:**
```
Flutter App → POST /api/mobile/exam-questions
            ↓ (category: 'mathematics', grade: 8, images: [...])
  MobileApiService.generateExam()
            ↓
  QuestionGeneratorService (calls Gemini)
            ↓
  ExamCreator.createFromGeminiResponse()
            ↓
  Returns { examUrl, examId, gradingUrl }
```

**Database Schema (Current):**

**examgenie_exams:**
- ✅ `id` (UUID, primary key)
- ✅ `user_id` (UUID, FK to auth.users)
- ✅ `subject` (TEXT) - e.g., "matematiikka"
- ✅ `grade` (TEXT) - e.g., "8"
- ✅ `status` (TEXT) - 'DRAFT', 'PROCESSING', 'READY', 'FAILED'
- ✅ `final_questions` (JSONB) - Flexible storage
- ✅ `share_id` (TEXT) - For exam URLs
- ❌ `exam_type` - **MISSING** (needs to be added)
- ❌ `category` - **MISSING** (needs to be added)

**examgenie_questions:**
- ✅ `id` (UUID, primary key)
- ✅ `exam_id` (UUID, FK to examgenie_exams)
- ✅ `question_number` (INTEGER)
- ✅ `question_text` (TEXT)
- ✅ `question_type` (TEXT, default 'multiple_choice')
- ✅ `options` (JSONB)
- ✅ `correct_answer` (TEXT)
- ✅ `explanation` (TEXT)
- ✅ `max_points` (INTEGER, default 2)
- ❌ `answer_type` - **MISSING** (rename from question_type)
- ❌ `answer_format` (JSONB) - **MISSING**
- ❌ `grading_rules` (JSONB) - **MISSING**
- ❌ `question_latex` (TEXT) - **MISSING**
- ❌ `explanation_latex` (TEXT) - **MISSING**
- ❌ `difficulty` (TEXT) - **MISSING**
- ❌ `curriculum_topic` (TEXT) - **MISSING**

### 3.2 Existing Services

| Service | File Path | Current Responsibility | Math Changes Needed |
|---------|-----------|----------------------|---------------------|
| `MobileApiService` | `src/lib/services/mobile-api-service.ts` | Handles mobile exam requests | ✅ Add math detection logic |
| `QuestionGeneratorService` | `src/lib/services/question-generator-service.ts` | Calls Gemini API | ✅ Accept math prompts |
| `ExamCreator` | `src/lib/services/exam-creator.ts` | Creates exam records | 🆕 Create `MathExamCreator` subclass |
| `ExamRepository` | `src/lib/services/exam-repository.ts` | Fetches exams | ✅ No changes (JSONB flexible) |
| `ExamGradingService` | `src/lib/services/exam-grading-service.ts` | Grades submissions | 🆕 Add math grading logic (Phase 2) |

### 3.3 Existing API Endpoints (Reusable)

| Endpoint | Method | Purpose | Math Support |
|----------|--------|---------|--------------|
| `/api/exams/create` | POST | Create exam (unified endpoint) | ✅ Exam type determined by subject/grade fields |
| `/api/exams/[id]/process` | POST | Start question generation | ✅ Routes to math or general prompt logic |
| `/api/exams/[id]/progress` | GET | Poll generation status | ✅ Works with all exam types |
| `/api/exams` | GET | List all user exams | ✅ Returns metadata for math exams |
| `/api/exams/[id]` | GET | Fetch exam for taking | ✅ Returns JSONB questions (all types) |
| `/api/exam/[id]/submit` | POST | Submit answers for grading | 🆕 Needs math grading (Phase 2) |

**Unified Endpoint Strategy:**
- **General Exams**: `subject` + `grade` provided → Use grade/subject-specific prompt
- **Math Exams**: `subject` + `grade` omitted/null → Use math prompt with topic auto-detection
- **Question Count**: Optional parameter (range: 8-15, default: 15) - same for both exam types

---

## 4. Integration Architecture

### 3.1 Unified Table Strategy (Recommended)

**Design Decision:** Use existing tables with type discrimination fields.

**Rationale:**
- ✅ Mobile client uses same endpoint
- ✅ Unified exam listing (no need to query multiple tables)
- ✅ Same URL system (`/exam/{id}`, `/grading/{id}`)
- ✅ Simpler migration path
- ⚠️ Some NULL fields for non-math exams (acceptable trade-off)

**Alternative Rejected:** Separate `math_exams` and `math_questions` tables
- ❌ Requires mobile client updates
- ❌ Complicates exam listing
- ❌ Duplicates infrastructure

### 3.2 Type Discrimination Flow

```
Mobile Client Request
  ↓
category = 'mathematics'?
  ↓ YES
Use MathPromptService
  ↓
Call Gemini with math prompt
  ↓
MathExamCreator.create()
  ↓
Validate math schema
  ↓
Store with exam_type = 'math'
  ↓
Store questions with answer_type = 'numeric'/'algebraic'/etc.
  ↓
Return standard { examUrl, examId, gradingUrl }
```

### 3.3 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Mobile Client (Flutter)                 │
│  - Sends: images, category='mathematics', grade=8           │
│  - Receives: examUrl, examId, gradingUrl                    │
└─────────────────────────────────────────────────────────────┘
                           ↓ POST /api/mobile/exam-questions
┌─────────────────────────────────────────────────────────────┐
│              MobileApiService (Request Handler)              │
│  ✅ Extract category from FormData                          │
│  ✅ Detect if category === 'mathematics'                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
              ┌────────────┴────────────┐
              ↓                         ↓
    ┌──────────────────┐      ┌──────────────────┐
    │ MathPromptService│      │ Default Prompts  │
    │ (NEW)            │      │ (Existing)       │
    └──────────────────┘      └──────────────────┘
              ↓                         ↓
┌─────────────────────────────────────────────────────────────┐
│         QuestionGeneratorService (Gemini API Call)          │
│  ✅ Accepts custom prompt (math or general)                 │
│  ✅ Returns raw JSON response                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
              ┌────────────┴────────────┐
              ↓                         ↓
    ┌──────────────────┐      ┌──────────────────┐
    │ MathExamCreator  │      │ ExamCreator      │
    │ (NEW)            │      │ (Existing)       │
    │ - Validate schema│      │ - Basic storage  │
    │ - Convert LaTeX  │      │                  │
    │ - Store math flds│      │                  │
    └──────────────────┘      └──────────────────┘
              ↓                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Supabase (examgenie_exams table)               │
│  ✅ exam_type = 'math' or 'general'                         │
│  ✅ category = 'mathematics' (for analytics)                │
└─────────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│            Supabase (examgenie_questions table)             │
│  ✅ answer_type = 'numeric'/'algebraic'/etc.                │
│  ✅ answer_format = { tolerance, units, ... }               │
│  ✅ grading_rules = { match_type, ... }                     │
│  ✅ question_text_plain (converted from LaTeX)              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Database Schema Changes

### 4.1 Migration SQL

**File:** `supabase/migrations/20251004120000_add_math_exam_support.sql`

```sql
-- ============================================
-- PART 1: ADD EXAM TYPE DISCRIMINATION
-- ============================================

-- Add exam_type to examgenie_exams
ALTER TABLE examgenie_exams
  ADD COLUMN IF NOT EXISTS exam_type TEXT DEFAULT 'general'
  CHECK (exam_type IN ('general', 'math'));

-- Add category to examgenie_exams
ALTER TABLE examgenie_exams
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Update existing records
UPDATE examgenie_exams
SET exam_type = 'general'
WHERE exam_type IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exams_exam_type ON examgenie_exams(exam_type);
CREATE INDEX IF NOT EXISTS idx_exams_category ON examgenie_exams(category);

-- ============================================
-- PART 2: ADD MATH-SPECIFIC QUESTION FIELDS
-- ============================================

-- Add answer_type (replaces question_type semantically)
ALTER TABLE examgenie_questions
  ADD COLUMN IF NOT EXISTS answer_type TEXT DEFAULT 'multiple_choice'
  CHECK (answer_type IN (
    'multiple_choice',   -- A, B, C, D selection
    'numeric',           -- Decimal/integer with tolerance
    'algebraic',         -- Symbolic expressions (e.g., 2x + 3)
    'solution_set',      -- {1, 2, 3} or {x | x > 5}
    'angle_set',         -- {45°, 135°, 225°}
    'ordered_pair',      -- (3, 4) or (x, y)
    'inequality',        -- x < 5 or 2 ≤ x < 7
    'ratio_proportion',  -- 2:3 or 5/8
    'unit_conversion'    -- 5 km = 5000 m
  ));

-- Add answer_format (JSONB for flexibility)
ALTER TABLE examgenie_questions
  ADD COLUMN IF NOT EXISTS answer_format JSONB;
  -- Example structures:
  -- Numeric: {"type": "decimal", "tolerance": 0.5, "units": "cm²", "decimals": 2}
  -- Algebraic: {"type": "expression", "variables": ["x", "y"], "allow_equivalent_forms": true}
  -- Solution Set: {"type": "set", "element_type": "integer", "min_elements": 1, "max_elements": 5}

-- Add grading_rules (JSONB for grading logic)
ALTER TABLE examgenie_questions
  ADD COLUMN IF NOT EXISTS grading_rules JSONB;
  -- Example: {"match_type": "numeric_tolerance", "tolerance": 0.5, "partial_credit": 0.5}

-- Add LaTeX fields for formula display
ALTER TABLE examgenie_questions
  ADD COLUMN IF NOT EXISTS question_latex TEXT;
  -- Stores: "Kaava: $A = \frac{\alpha}{360°} \times \pi r^2$"

ALTER TABLE examgenie_questions
  ADD COLUMN IF NOT EXISTS explanation_latex TEXT;
  -- Stores: "$A = \frac{56°}{360°} \times \pi (5.3)^2 \approx 12.9$ cm²"

-- Add difficulty and curriculum tracking
ALTER TABLE examgenie_questions
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium'
  CHECK (difficulty IN ('basic', 'medium', 'advanced'));

ALTER TABLE examgenie_questions
  ADD COLUMN IF NOT EXISTS curriculum_topic TEXT;
  -- Examples: 'circle_sectors', 'linear_equations', 'pythagorean_theorem'

ALTER TABLE examgenie_questions
  ADD COLUMN IF NOT EXISTS estimated_time_seconds INTEGER DEFAULT 180;

-- Add display mode for question rendering
ALTER TABLE examgenie_questions
  ADD COLUMN IF NOT EXISTS question_display_mode TEXT DEFAULT 'inline'
  CHECK (question_display_mode IN ('inline', 'block'));

-- ============================================
-- PART 3: CREATE PERFORMANCE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_questions_answer_type
  ON examgenie_questions(answer_type);

CREATE INDEX IF NOT EXISTS idx_questions_curriculum_topic
  ON examgenie_questions(curriculum_topic);

CREATE INDEX IF NOT EXISTS idx_questions_difficulty
  ON examgenie_questions(difficulty);

-- ============================================
-- PART 4: ADD DOCUMENTATION COMMENTS
-- ============================================

COMMENT ON COLUMN examgenie_exams.exam_type IS
  'Type of exam: general (text-based) or math (mathematical with formulas)';

COMMENT ON COLUMN examgenie_exams.category IS
  'Subject category: mathematics, core_academics, language_studies';

COMMENT ON COLUMN examgenie_questions.answer_type IS
  'Type of answer expected: multiple_choice, numeric, algebraic, solution_set, angle_set, ordered_pair, inequality, ratio_proportion, unit_conversion';

COMMENT ON COLUMN examgenie_questions.answer_format IS
  'JSON structure defining answer format requirements (tolerance, units, decimals, etc.)';

COMMENT ON COLUMN examgenie_questions.grading_rules IS
  'JSON structure defining grading logic (match_type, tolerance, partial_credit rules)';

COMMENT ON COLUMN examgenie_questions.question_latex IS
  'LaTeX formula for separate display (e.g., Kaava: $A = ...$)';

COMMENT ON COLUMN examgenie_questions.question_display_mode IS
  'How to display question: inline (within text) or block (separate formula box)';

-- ============================================
-- PART 5: DATA INTEGRITY
-- ============================================

-- Ensure all existing questions have answer_type
UPDATE examgenie_questions
SET answer_type = COALESCE(question_type, 'multiple_choice')
WHERE answer_type IS NULL;
```

### 4.2 Schema Comparison

| Field | Before | After | Purpose |
|-------|--------|-------|---------|
| **examgenie_exams** | | | |
| `exam_type` | ❌ Missing | ✅ 'general' \| 'math' | Route exam creation logic |
| `category` | ❌ Missing | ✅ 'mathematics' \| ... | Analytics and filtering |
| **examgenie_questions** | | | |
| `question_type` | ✅ 'multiple_choice' | ⚠️ Deprecated (keep for compatibility) | Old field |
| `answer_type` | ❌ Missing | ✅ 9 types | Determines grading logic |
| `answer_format` | ❌ Missing | ✅ JSONB | Stores tolerance, units, decimals |
| `grading_rules` | ❌ Missing | ✅ JSONB | Stores match_type, partial credit |
| `question_latex` | ❌ Missing | ✅ TEXT | Formula display (separate) |
| `explanation_latex` | ❌ Missing | ✅ TEXT | Explanation formulas |
| `difficulty` | ❌ Missing | ✅ 'basic'/'medium'/'advanced' | Content difficulty |
| `curriculum_topic` | ❌ Missing | ✅ TEXT | Topic tracking |
| `estimated_time_seconds` | ❌ Missing | ✅ INTEGER | Time per question |
| `question_display_mode` | ❌ Missing | ✅ 'inline'/'block' | Rendering hint |

---

## 6. Mobile Client Considerations

### 5.1 LaTeX to Plain Text Conversion

**Problem:** Mobile client displays text only, cannot render LaTeX formulas.

**Solution:** Convert LaTeX to Unicode plain text for mobile display.

#### 5.1.1 Common Conversions

| LaTeX Notation | Unicode Output | Example |
|----------------|----------------|---------|
| `$\alpha$` | `α` | "kun α = 56°" |
| `$\pi$` | `π` | "A = π × r²" |
| `$\theta$` | `θ` | "cos(θ)" |
| `$\Delta$` | `Δ` | "Δx = 5" |
| `$\frac{a}{b}$` | `(a/b)` | "A = (α/360°) × π × r²" |
| `$x^2$` | `x²` | "x² + 2x + 1" (using Unicode superscripts) |
| `$\sqrt{x}$` | `√x` | "√16 = 4" |
| `$r = 5.3$` | `r = 5.3` | (remove $ delimiters) |

#### 5.1.2 Conversion Implementation

**Utility Function:** `src/lib/utils/latex-to-text.ts`

```typescript
export function convertLatexToPlainText(text: string): string {
  let result = text;

  // Greek letters
  result = result.replace(/\\alpha/g, 'α');
  result = result.replace(/\\beta/g, 'β');
  result = result.replace(/\\gamma/g, 'γ');
  result = result.replace(/\\delta/g, 'δ');
  result = result.replace(/\\theta/g, 'θ');
  result = result.replace(/\\pi/g, 'π');
  result = result.replace(/\\Delta/g, 'Δ');

  // Mathematical operators
  result = result.replace(/\\times/g, '×');
  result = result.replace(/\\div/g, '÷');
  result = result.replace(/\\pm/g, '±');
  result = result.replace(/\\leq/g, '≤');
  result = result.replace(/\\geq/g, '≥');
  result = result.replace(/\\neq/g, '≠');
  result = result.replace(/\\approx/g, '≈');

  // Fractions (convert to division)
  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');

  // Square roots
  result = result.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');

  // Superscripts (limited Unicode support)
  result = result.replace(/\^2/g, '²');
  result = result.replace(/\^3/g, '³');

  // Remove $ delimiters
  result = result.replace(/\$/g, '');

  // Clean up extra spaces
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}
```

#### 5.1.3 Example Transformations

**Input (from Gemini):**
```
"Laske ympyräsektorin pinta-ala, kun säde on $r = 5.3$ cm ja keskuskulma on $\alpha = 56°$."
```

**Output (for mobile):**
```
"Laske ympyräsektorin pinta-ala, kun säde on r = 5.3 cm ja keskuskulma on α = 56°."
```

**Input (with formula):**
```
question_text: "Laske sektorin pinta-ala."
question_latex: "Kaava: $A = \frac{\alpha}{360°} \times \pi r^2$"
```

**Output (for mobile):**
```
"Laske sektorin pinta-ala. Kaava: A = (α/360°) × π × r²"
```

### 5.2 Mobile API Response Enhancement

**Current Response:**
```json
{
  "exam_id": "uuid-xxx",
  "questions": [
    {
      "id": "q_001",
      "question_text": "Laske ympyräsektorin pinta-ala...",
      "question_type": "multiple_choice",
      "options": ["A", "B", "C", "D"],
      "max_points": 2
    }
  ]
}
```

**Enhanced Response (Math Exam):**
```json
{
  "exam_id": "uuid-xxx",
  "exam_type": "math",
  "category": "mathematics",
  "questions": [
    {
      "id": "q_001",
      "question_number": 1,
      "question_text": "Laske ympyräsektorin pinta-ala, kun säde on $r = 5.3$ cm...",
      "question_text_plain": "Laske ympyräsektorin pinta-ala, kun säde on r = 5.3 cm ja keskuskulma on α = 56°.",
      "answer_type": "numeric",
      "answer_format": {
        "type": "decimal",
        "tolerance": 0.5,
        "units": "cm²",
        "decimals": 1
      },
      "max_points": 2,
      "estimated_time_seconds": 180
    }
  ]
}
```

### 5.3 Mobile Client Changes Required

**Minimal Changes:**

1. **Display plain text version:**
```dart
// Before:
Text(question.questionText)

// After:
Text(question.questionTextPlain ?? question.questionText)
```

2. **Show input hint:**
```dart
if (question.answerFormat != null) {
  Text("Anna vastaus muodossa: numero ${question.answerFormat['units']}")
}
```

3. **No other changes needed** - All other logic remains the same.

---

## 7. Implementation Phases

### Phase 1: Math Exam Generation (Week 1) - PRIORITY

**Goal:** Enable math exam creation from textbook images.

**Deliverables:**
- ✅ Database migration applied
- ✅ Math prompts implemented
- ✅ Math exam creator with schema validation
- ✅ LaTeX to plain text converter
- ✅ Mobile API integration
- ✅ Gemini generates valid math JSON

**What Works After Phase 1:**
- Mobile client can generate math exams
- Math exams appear in exam list
- Questions display as readable text
- **Grading:** Answers stored but not graded (treat as text input)

**What Doesn't Work Yet:**
- Math-specific grading (numeric tolerance, symbolic equivalence)
- LaTeX rendering on web (shows plain text)

---

### Phase 2: Math Grading Engine (Week 2-3)

**Goal:** Implement intelligent math answer grading.

**Deliverables:**
- ✅ MathGradingEngine service
- ✅ Numeric answer grading (tolerance-based)
- ✅ Algebraic answer grading (symbolic equivalence with mathjs)
- ✅ Solution set grading
- ✅ Multiple choice grading (reuse existing)
- ✅ Integration with ExamGradingService

**What Works After Phase 2:**
- Full math exam lifecycle (generation + grading)
- Accurate scoring with tolerance
- Symbolic equivalence checking

---

### Phase 3: Web LaTeX Rendering (Week 4) - OPTIONAL

**Goal:** Beautiful formula display on web exam pages.

**Deliverables:**
- ✅ KaTeX integration in exam display component
- ✅ Formula box component for `question_latex`
- ✅ Inline LaTeX rendering
- ✅ Cross-browser testing

**What Works After Phase 3:**
- Beautiful formula rendering on web
- Mobile still shows plain text (as designed)

---

## 8. Detailed Task List

### 7.1 Phase 1: Math Exam Generation

#### 7.1.1 Database Setup
- [ ] **Task 1.1:** Create migration file `20251004120000_add_math_exam_support.sql`
  - [ ] Add `exam_type` column to `examgenie_exams`
  - [ ] Add `category` column to `examgenie_exams`
  - [ ] Add 10 math-specific columns to `examgenie_questions`
  - [ ] Create indexes for performance
  - [ ] Add column comments for documentation
  - [ ] Test migration on local Supabase
  - **Files:** `supabase/migrations/20251004120000_add_math_exam_support.sql`
  - **Dependencies:** None
  - **Time Estimate:** 2 hours

- [ ] **Task 1.2:** Apply migration to Supabase instance
  - [ ] Run migration locally: `supabase db push`
  - [ ] Verify schema changes in Supabase dashboard
  - [ ] Update schema documentation file
  - **Files:** N/A (database operation)
  - **Dependencies:** Task 1.1
  - **Time Estimate:** 30 minutes

#### 7.1.2 TypeScript Types and Interfaces
- [ ] **Task 1.3:** Create math exam type definitions
  - [ ] Define `MathExamMetadata` interface
  - [ ] Define `MathQuestion` interface (9 answer types)
  - [ ] Define `AnswerFormat` interfaces for each type
  - [ ] Define `GradingRules` interface
  - [ ] Export all types from index
  - **Files:** `src/lib/types/math-exam.ts`
  - **Dependencies:** None
  - **Time Estimate:** 2 hours

#### 7.1.3 Math Prompt Templates
- [ ] **Task 1.4:** Create math prompt service
  - [ ] Extract math prompts from `MATH_EXAM_FINAL_IMPLEMENTATION_PLAN.md` Section 4
  - [ ] Create prompt templates for grades 1-9
  - [ ] Add topic-specific prompts (circle geometry, algebra, etc.)
  - [ ] Add Finnish language prompt templates
  - [ ] Implement prompt selection logic based on grade/topic
  - **Files:** `src/lib/prompts/math-exam-prompts.ts`
  - **Dependencies:** None
  - **Time Estimate:** 3 hours

- [ ] **Task 1.5:** Implement MathPromptService
  - [ ] Create `MathPromptService` class
  - [ ] Implement `generateMathPrompt(grade, topic?, language)` method
  - [ ] Add prompt validation
  - [ ] Add unit tests for prompt generation
  - **Files:** `src/lib/services/math-prompt-service.ts`
  - **Dependencies:** Task 1.4
  - **Time Estimate:** 2 hours

#### 7.1.4 Schema Validation
- [ ] **Task 1.6:** Create math schema validator
  - [ ] Implement `validateMathExamSchema(examData)` function
  - [ ] Validate exam metadata structure
  - [ ] Validate question structure (9 answer types)
  - [ ] Validate LaTeX syntax (basic check)
  - [ ] Validate answer_format structure per type
  - [ ] Validate grading_rules structure
  - [ ] Return detailed validation errors
  - **Files:** `src/lib/services/math-schema-validator.ts`
  - **Dependencies:** Task 1.3
  - **Time Estimate:** 4 hours

#### 7.1.5 LaTeX Conversion
- [ ] **Task 1.7:** Implement LaTeX to plain text converter
  - [ ] Create `convertLatexToPlainText(text)` function
  - [ ] Handle Greek letters (α, β, π, θ, Δ)
  - [ ] Handle fractions (\frac{a}{b} → (a/b))
  - [ ] Handle superscripts (x^2 → x²)
  - [ ] Handle mathematical operators (×, ÷, ≤, ≥)
  - [ ] Add unit tests with examples
  - **Files:** `src/lib/utils/latex-to-text.ts`
  - **Dependencies:** None
  - **Time Estimate:** 3 hours

#### 7.1.6 Math Exam Creator
- [ ] **Task 1.8:** Create MathExamCreator service
  - [ ] Implement `MathExamCreator` class
  - [ ] Implement `createFromGeminiResponse(response, options)` method
  - [ ] Parse Gemini JSON response
  - [ ] Apply LaTeX escape fix (from Section 4.7.1 of implementation plan)
  - [ ] Validate schema using MathSchemaValidator
  - [ ] Convert LaTeX to plain text for all questions
  - [ ] Store exam in `examgenie_exams` with `exam_type = 'math'`
  - [ ] Store questions in `examgenie_questions` with all math fields
  - [ ] Return standard `{ examId, examUrl, gradingUrl }` format
  - [ ] Add error handling and logging
  - **Files:** `src/lib/services/math-exam-creator.ts`
  - **Dependencies:** Tasks 1.6, 1.7
  - **Time Estimate:** 5 hours

#### 7.1.7 Mobile API Integration
- [ ] **Task 1.9:** Update MobileApiService for math detection
  - [ ] Add math exam detection: `category === 'mathematics'`
  - [ ] Call `MathPromptService` when math exam detected
  - [ ] Call `MathExamCreator` when math exam detected
  - [ ] Maintain backward compatibility for general exams
  - [ ] Add logging for math exam requests
  - [ ] Update error messages
  - **Files:** `src/lib/services/mobile-api-service.ts`
  - **Dependencies:** Tasks 1.5, 1.8
  - **Time Estimate:** 2 hours

#### 7.1.8 Testing and Validation
- [ ] **Task 1.10:** End-to-end testing of math exam generation
  - [ ] Test with real textbook image (IMG_6248.JPG - circle geometry)
  - [ ] Verify Gemini generates valid JSON
  - [ ] Verify schema validation passes
  - [ ] Verify exam stored correctly in database
  - [ ] Verify questions have plain text versions
  - [ ] Verify mobile API returns correct format
  - [ ] Test quality score ≥88% (from implementation plan)
  - **Files:** Manual testing / Test scripts
  - **Dependencies:** All Phase 1 tasks
  - **Time Estimate:** 3 hours

- [ ] **Task 1.11:** Create test script for math exam generation
  - [ ] Create Node.js script similar to `generate_geometry_exam.js`
  - [ ] Test with multiple grade levels
  - [ ] Test with different math topics
  - [ ] Generate quality report
  - [ ] Save sample outputs for documentation
  - **Files:** `test-math-exam-generation.js`
  - **Dependencies:** All Phase 1 tasks
  - **Time Estimate:** 2 hours

#### 7.1.9 Documentation
- [ ] **Task 1.12:** Update API documentation
  - [ ] Document new exam_type field in response
  - [ ] Document question_text_plain field
  - [ ] Document answer_type enum values
  - [ ] Document answer_format structures
  - [ ] Add example requests and responses
  - **Files:** `API_DOCUMENTATION.md`
  - **Dependencies:** Phase 1 complete
  - **Time Estimate:** 2 hours

**Phase 1 Total Estimate:** ~30 hours (~1 week)

---

### 7.2 Phase 2: Math Grading Engine

#### 7.2.1 Grading Infrastructure
- [ ] **Task 2.1:** Install mathjs library
  - [ ] Add mathjs to package.json
  - [ ] Test basic symbolic operations
  - [ ] Test equivalence checking
  - **Files:** `package.json`
  - **Dependencies:** None
  - **Time Estimate:** 30 minutes

#### 7.2.2 Input Sanitization
- [ ] **Task 2.2:** Create input sanitizer
  - [ ] Remove invisible Unicode characters
  - [ ] Replace smart quotes with standard quotes
  - [ ] Replace non-breaking spaces
  - [ ] Normalize whitespace
  - [ ] Add unit tests
  - **Files:** `src/lib/services/grading/input-sanitizer.ts`
  - **Dependencies:** None
  - **Time Estimate:** 2 hours

#### 7.2.3 Grading Modules by Answer Type
- [ ] **Task 2.3:** Implement numeric grader
  - [ ] Parse student answer as number
  - [ ] Compare with tolerance
  - [ ] Validate units match
  - [ ] Handle decimal precision
  - [ ] Return grading result with feedback
  - [ ] Add unit tests
  - **Files:** `src/lib/services/grading/numeric-grader.ts`
  - **Dependencies:** Task 2.2
  - **Time Estimate:** 3 hours

- [ ] **Task 2.4:** Implement algebraic grader
  - [ ] Sanitize input
  - [ ] Parse expressions with mathjs
  - [ ] Simplify both student and correct answers
  - [ ] Check symbolic equivalence
  - [ ] Fallback to numerical testing at multiple points
  - [ ] Handle parse errors gracefully
  - [ ] Add unit tests with complex expressions
  - **Files:** `src/lib/services/grading/algebraic-grader.ts`
  - **Dependencies:** Tasks 2.1, 2.2
  - **Time Estimate:** 5 hours

- [ ] **Task 2.5:** Implement solution set grader
  - [ ] Parse set notation: {1, 2, 3}
  - [ ] Compare sets (order-independent)
  - [ ] Handle interval notation: {x | x > 5}
  - [ ] Add unit tests
  - **Files:** `src/lib/services/grading/solution-set-grader.ts`
  - **Dependencies:** Task 2.2
  - **Time Estimate:** 3 hours

- [ ] **Task 2.6:** Implement angle set grader
  - [ ] Parse angle notation: 45°, 135°
  - [ ] Normalize to 0-360° range
  - [ ] Compare with tolerance
  - [ ] Add unit tests
  - **Files:** `src/lib/services/grading/angle-set-grader.ts`
  - **Dependencies:** Task 2.2
  - **Time Estimate:** 2 hours

- [ ] **Task 2.7:** Implement ordered pair grader
  - [ ] Parse (x, y) notation
  - [ ] Compare coordinates with tolerance
  - [ ] Add unit tests
  - **Files:** `src/lib/services/grading/ordered-pair-grader.ts`
  - **Dependencies:** Task 2.2
  - **Time Estimate:** 2 hours

- [ ] **Task 2.8:** Implement inequality grader
  - [ ] Parse inequality notation: x < 5, 2 ≤ x < 7
  - [ ] Compare symbolic inequalities
  - [ ] Add unit tests
  - **Files:** `src/lib/services/grading/inequality-grader.ts`
  - **Dependencies:** Tasks 2.1, 2.2
  - **Time Estimate:** 3 hours

- [ ] **Task 2.9:** Reuse multiple choice grader
  - [ ] Extract existing MC grading logic
  - [ ] Adapt to new interface
  - [ ] Add unit tests
  - **Files:** `src/lib/services/grading/multiple-choice-grader.ts`
  - **Dependencies:** None
  - **Time Estimate:** 1 hour

#### 7.2.4 Main Grading Engine
- [ ] **Task 2.10:** Create MathGradingEngine service
  - [ ] Implement `gradeAnswer(studentAnswer, correctAnswer, gradingRules, answerType)` method
  - [ ] Route to correct grader based on answer_type
  - [ ] Handle errors and edge cases
  - [ ] Log grading decisions
  - [ ] Return standardized grading result
  - **Files:** `src/lib/services/math-grading-engine.ts`
  - **Dependencies:** Tasks 2.3-2.9
  - **Time Estimate:** 3 hours

- [ ] **Task 2.11:** Integrate with ExamGradingService
  - [ ] Detect exam_type in grading flow
  - [ ] Call MathGradingEngine for math exams
  - [ ] Maintain backward compatibility for general exams
  - [ ] Calculate total score
  - [ ] Store grading results
  - **Files:** `src/lib/services/exam-grading-service.ts`
  - **Dependencies:** Task 2.10
  - **Time Estimate:** 2 hours

#### 7.2.5 Testing
- [ ] **Task 2.12:** Create comprehensive grading tests
  - [ ] Test each answer type with valid answers
  - [ ] Test each answer type with invalid answers
  - [ ] Test tolerance edge cases
  - [ ] Test symbolic equivalence edge cases
  - [ ] Test partial credit calculation
  - [ ] Create test suite with 50+ cases
  - **Files:** `src/lib/services/grading/__tests__/`
  - **Dependencies:** All Phase 2 grading tasks
  - **Time Estimate:** 4 hours

- [ ] **Task 2.13:** End-to-end grading test
  - [ ] Generate math exam
  - [ ] Submit correct answers → verify 100% score
  - [ ] Submit incorrect answers → verify 0% score
  - [ ] Submit partially correct answers → verify partial credit
  - [ ] Test tolerance boundaries
  - **Files:** Manual testing
  - **Dependencies:** Phase 2 complete
  - **Time Estimate:** 2 hours

**Phase 2 Total Estimate:** ~32 hours (~1.5 weeks)

---

### 7.3 Phase 3: Web LaTeX Rendering (Optional)

#### 7.3.1 KaTeX Integration
- [ ] **Task 3.1:** Install KaTeX
  - [ ] Add katex to package.json
  - [ ] Add KaTeX CSS to global styles
  - [ ] Test basic rendering
  - **Files:** `package.json`, `app/globals.css`
  - **Dependencies:** None
  - **Time Estimate:** 30 minutes

#### 7.3.2 Components
- [ ] **Task 3.2:** Create FormulaBox component
  - [ ] Implement LaTeX rendering with KaTeX
  - [ ] Add error handling for invalid LaTeX
  - [ ] Style with Tailwind CSS
  - [ ] Add TypeScript props
  - **Files:** `src/components/FormulaBox.tsx`
  - **Dependencies:** Task 3.1
  - **Time Estimate:** 2 hours

- [ ] **Task 3.3:** Update exam display component
  - [ ] Detect question_latex field
  - [ ] Render inline LaTeX in question_text
  - [ ] Render formula box for question_latex
  - [ ] Render explanation_latex after grading
  - **Files:** `src/components/ExamDisplay.tsx`
  - **Dependencies:** Task 3.2
  - **Time Estimate:** 2 hours

#### 7.3.3 Testing
- [ ] **Task 3.4:** Cross-browser testing
  - [ ] Test on Chrome
  - [ ] Test on Safari
  - [ ] Test on Firefox
  - [ ] Test on mobile Safari (iOS)
  - [ ] Verify formulas render correctly
  - **Files:** Manual testing
  - **Dependencies:** Tasks 3.2, 3.3
  - **Time Estimate:** 2 hours

**Phase 3 Total Estimate:** ~7 hours (~1 day)

---

## 9. File Structure

### 8.1 New Files to Create

```
gemini-ocr/
├── supabase/
│   └── migrations/
│       └── 20251004120000_add_math_exam_support.sql    ← Database migration
│
├── src/
│   ├── lib/
│   │   ├── types/
│   │   │   └── math-exam.ts                            ← TypeScript interfaces
│   │   │
│   │   ├── prompts/
│   │   │   └── math-exam-prompts.ts                    ← Math prompt templates
│   │   │
│   │   ├── services/
│   │   │   ├── math-prompt-service.ts                  ← Prompt generation
│   │   │   ├── math-exam-creator.ts                    ← Exam creation with validation
│   │   │   ├── math-schema-validator.ts                ← JSON schema validation
│   │   │   ├── math-grading-engine.ts                  ← Main grading orchestrator
│   │   │   │
│   │   │   └── grading/                                ← Grading modules
│   │   │       ├── input-sanitizer.ts                  ← Unicode normalization
│   │   │       ├── numeric-grader.ts                   ← Numeric with tolerance
│   │   │       ├── algebraic-grader.ts                 ← Symbolic equivalence
│   │   │       ├── solution-set-grader.ts              ← Set notation
│   │   │       ├── angle-set-grader.ts                 ← Angle sets
│   │   │       ├── ordered-pair-grader.ts              ← Coordinate pairs
│   │   │       ├── inequality-grader.ts                ← Inequality notation
│   │   │       ├── multiple-choice-grader.ts           ← MC (reuse existing)
│   │   │       └── __tests__/                          ← Unit tests
│   │   │           ├── numeric-grader.test.ts
│   │   │           ├── algebraic-grader.test.ts
│   │   │           └── ...
│   │   │
│   │   └── utils/
│   │       └── latex-to-text.ts                        ← LaTeX → Unicode converter
│   │
│   └── components/                                      ← Phase 3 (optional)
│       └── FormulaBox.tsx                              ← KaTeX rendering
│
└── test-math-exam-generation.js                        ← Test script
```

### 8.2 Files to Modify

```
src/lib/services/mobile-api-service.ts                  ← Add math detection
src/lib/services/exam-grading-service.ts                ← Add math grading integration
src/components/ExamDisplay.tsx                          ← Add LaTeX rendering (Phase 3)
package.json                                             ← Add mathjs, katex
```

### 8.3 Reference Files (No Changes)

```
src/lib/services/question-generator-service.ts          ← Already accepts custom prompts
src/lib/services/exam-creator.ts                        ← Fallback for general exams
src/lib/services/exam-repository.ts                     ← JSONB flexible, no changes
src/app/api/mobile/exam-questions/route.ts              ← Already supports category param
src/app/api/exam/[id]/route.ts                          ← Already returns JSONB questions
src/app/api/exam/[id]/submit/route.ts                   ← Routes to grading service
```

---

## 10. API Contract Changes

### 9.1 Request Format (Unchanged)

**POST /api/mobile/exam-questions**

```typescript
FormData {
  images: File[]           // Textbook images
  category: 'mathematics'  // EXISTING FIELD - triggers math mode
  grade: 8                 // EXISTING FIELD - used for prompt selection
  user_id: 'uuid-xxx'      // EXISTING FIELD - for exam ownership
  language: 'fi'           // EXISTING FIELD - defaults to 'fi'
}
```

**No mobile client changes required.**

### 9.2 Response Format (Enhanced)

**POST /api/mobile/exam-questions** - Response:

```typescript
{
  success: true,
  data: {
    metadata: {
      processingTime: 15234,
      geminiProcessingTime: 12000,
      imageCount: 2,
      promptUsed: 'custom',
      processingMode: 'mathematics'  // NEW: indicates math exam
    }
  },
  examUrl: 'https://exam-generator.vercel.app/exam/uuid-xxx',
  examId: 'uuid-xxx',
  gradingUrl: 'https://exam-generator.vercel.app/grading/uuid-xxx'
}
```

### 9.3 Exam Fetch Format (Enhanced)

**GET /api/exam/[id]** - Response:

```typescript
{
  exam_id: 'uuid-xxx',
  subject: 'matematiikka',
  grade: '8',
  status: 'READY',
  exam_type: 'math',        // NEW: helps clients detect math exam
  category: 'mathematics',  // NEW: for analytics
  questions: [
    {
      id: 'q_001',
      question_number: 1,
      question_text: 'Laske ympyräsektorin pinta-ala, kun säde on $r = 5.3$ cm ja keskuskulma on $\\alpha = 56°$.',
      question_text_plain: 'Laske ympyräsektorin pinta-ala, kun säde on r = 5.3 cm ja keskuskulma on α = 56°.',  // NEW
      answer_type: 'numeric',                    // NEW: was 'question_type'
      answer_format: {                           // NEW
        type: 'decimal',
        tolerance: 0.5,
        units: 'cm²',
        decimals: 1
      },
      question_latex: 'Kaava: $A = \\frac{\\alpha}{360°} \\times \\pi r^2$',  // NEW (optional)
      difficulty: 'medium',                      // NEW
      estimated_time_seconds: 180,               // NEW
      max_points: 2                              // EXISTING
    }
  ]
}
```

**Mobile client should use `question_text_plain` for display.**

### 9.4 Submission Format (Unchanged)

**POST /api/exam/[id]/submit**

```typescript
{
  answers: [
    {
      question_id: 'q_001',
      answer_text: '12.9'  // Student's answer (as string)
    }
  ]
}
```

**No changes to submission format.**

### 9.5 Grading Response (Enhanced)

**POST /api/exam/[id]/submit** - Response:

```typescript
{
  success: true,
  message: 'Vastaukset lähetetty ja arvosteltu onnistuneesti',
  exam_id: 'uuid-xxx',
  status: 'graded',
  final_grade: 8.5,        // Out of 10
  total_points: 17,        // Points earned
  max_total_points: 20,    // Total possible
  grading_url: 'https://exam-generator.vercel.app/grading/uuid-xxx',
  grading_breakdown: [     // NEW: detailed feedback
    {
      question_id: 'q_001',
      student_answer: '12.9',
      correct_answer: '12.9',
      points_earned: 2,
      points_possible: 2,
      is_correct: true,
      feedback: ''  // Optional feedback message
    }
  ]
}
```

---

## 11. Testing Strategy

### 10.1 Unit Tests

**Coverage Target:** 80%+

| Module | Test Cases | Priority |
|--------|-----------|----------|
| `latex-to-text.ts` | 20+ LaTeX → Unicode conversions | High |
| `math-schema-validator.ts` | Valid/invalid exam schemas | High |
| `numeric-grader.ts` | Tolerance edge cases | High |
| `algebraic-grader.ts` | Symbolic equivalence | High |
| `solution-set-grader.ts` | Set comparison | Medium |
| `math-prompt-service.ts` | Prompt selection logic | Medium |

### 10.2 Integration Tests

**Test Scenarios:**

1. **Math Exam Generation Flow**
   - Upload textbook image → Gemini generates JSON → Exam created
   - Verify: exam_type = 'math', questions have plain text versions

2. **Math Exam Grading Flow**
   - Submit correct answers → Verify 100% score
   - Submit incorrect answers → Verify 0% score
   - Submit near-correct answers → Verify tolerance handling

3. **Mixed Exam List**
   - Create 3 math exams + 2 general exams
   - GET /api/mobile/exams → Verify all 5 returned
   - Verify exam_type field differentiates them

### 10.3 End-to-End Tests

**Test Case 1: Circle Geometry Exam (Grade 8)**
- Input: `IMG_6248.JPG` (circle sectors textbook page)
- Expected: 8 questions, answer_type = 'numeric', quality score ≥88%
- Verify: LaTeX converted to Unicode, formulas in question_latex

**Test Case 2: Linear Algebra Exam (Grade 7)**
- Input: Algebra textbook page
- Expected: Questions with answer_type = 'algebraic'
- Verify: Symbolic grading works for 2x + 3 = 11

**Test Case 3: Grading Accuracy**
- Submit answer "12.9" to question expecting "12.9 cm²"
- Expected: 100% score (tolerance 0.5)
- Submit answer "15.0"
- Expected: 0% score (outside tolerance)

### 10.4 Quality Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Gemini Generation Quality** | 88%+ | Use quality scoring from generate_geometry_exam.js |
| **LaTeX Conversion Accuracy** | 95%+ | Manual review of 50 questions |
| **Grading Accuracy** | 98%+ | Test suite with known correct/incorrect answers |
| **Mobile Display Readability** | 90%+ user approval | User testing with teachers |
| **API Response Time** | <5s for generation | Performance monitoring |

---

## 12. Risk Mitigation

### 11.1 Identified Risks from Expert Review

**Reference:** MathExamRisks.md (Educational Technology Specialist Review)

| Risk ID | Description | Mitigation | Status |
|---------|-------------|------------|--------|
| **R1** | Serverless timeout (Gemini API >10s) | Implement in Phase 2 - async job queue | Deferred |
| **R2** | LaTeX validation performance | Cache validated formulas, async workers | Phase 1 |
| **R3** | Model drift (Gemini changes) | Schema versioning, prompt version tracking | Phase 1 |
| **R4** | JSONB query performance | Create indexes, summary tables | Included |
| **R5** | XSS via LaTeX | Use `trust: false` in KaTeX | Phase 3 |
| **R6** | mathjs edge cases | Extensive test suite, numerical fallback | Phase 2 |
| **R8** | Mobile input parsing | Unicode normalization | Phase 1 |

### 11.2 Implementation-Specific Risks

#### Risk: Gemini JSON Parsing Failure

**Problem:** Gemini may generate invalid JSON due to LaTeX escape sequences.

**Example:**
```json
"question_text": "kun $\alpha = 56°$"  // ❌ Invalid - \a is not a valid escape
```

**Mitigation (from Section 4.7.1 of implementation plan):**
```typescript
try {
  examData = JSON.parse(jsonText);
} catch (parseError) {
  // Escape all backslashes for JSON parsing
  let fixedJson = jsonText.replace(/\\/g, '\\\\');
  examData = JSON.parse(fixedJson);
}
```

**Status:** ✅ Included in MathExamCreator implementation

---

#### Risk: Database Migration Conflicts

**Problem:** Migration may fail if columns already exist.

**Mitigation:**
```sql
ALTER TABLE examgenie_questions
  ADD COLUMN IF NOT EXISTS answer_type TEXT;
```

**Status:** ✅ All migration statements use `IF NOT EXISTS`

---

#### Risk: Mobile Client Shows Raw LaTeX

**Problem:** If `question_text_plain` is missing, mobile shows `$\alpha$` instead of `α`.

**Mitigation:**
- Always generate `question_text_plain` in MathExamCreator
- Mobile client falls back: `question.questionTextPlain ?? question.questionText`
- Add validation that plain text exists before marking exam as READY

**Status:** ✅ Included in task list

---

#### Risk: Grading Engine Crashes on Invalid Input

**Problem:** Student enters `"abc"` for numeric question → mathjs parse error.

**Mitigation:**
```typescript
try {
  const parsed = mathjs.parse(studentAnswer);
  // ... grading logic
} catch (error) {
  return { correct: false, points: 0, feedback: 'Vastaus ei ole kelvollinen luku' };
}
```

**Status:** ✅ All graders include try-catch blocks in task descriptions

---

### 11.3 Rollback Plan

**If Phase 1 deployment fails:**

1. **Database Rollback:**
```sql
-- Drop added columns
ALTER TABLE examgenie_exams DROP COLUMN IF EXISTS exam_type;
ALTER TABLE examgenie_exams DROP COLUMN IF EXISTS category;
-- (Repeat for all new columns)

-- Drop indexes
DROP INDEX IF EXISTS idx_exams_exam_type;
-- (Repeat for all new indexes)
```

2. **Code Rollback:**
- Revert commits from math integration branch
- Mobile API continues to work with general exams
- No data loss (existing exams unaffected)

**If Phase 2 grading fails:**
- Math exams still generate correctly (Phase 1 works)
- Grading temporarily disabled for math exams
- Store answers but don't calculate scores
- Fix grading engine offline, redeploy

---

## 12. Success Criteria

### Phase 1 Success Criteria
- [ ] Migration applied without errors
- [ ] Gemini generates valid math exam JSON (quality score ≥88%)
- [ ] Math exam appears in mobile exam list
- [ ] Questions display as readable text (Unicode symbols)
- [ ] `question_text_plain` field populated for all questions
- [ ] No regressions in general exam generation
- [ ] Mobile client works without code changes

### Phase 2 Success Criteria
- [ ] Numeric grading works with tolerance
- [ ] Algebraic grading handles symbolic equivalence
- [ ] Grading accuracy ≥98% on test suite
- [ ] No regressions in multiple choice grading
- [ ] Students can submit math exam answers
- [ ] Grading results show correct scores

### Phase 3 Success Criteria (Optional)
- [ ] LaTeX renders correctly on web
- [ ] Formula box component works cross-browser
- [ ] Mobile continues to show plain text (no changes)

---

## 13. Next Steps

### Immediate Actions (This Week)

1. **Review this document** with team
2. **Approve database migration** SQL
3. **Set up development branch** `feature/math-exam-integration`
4. **Begin Phase 1 Task 1.1** - Create migration file
5. **Extract math prompts** from MATH_EXAM_FINAL_IMPLEMENTATION_PLAN.md

### Week 1 Goals

- [ ] Complete Phase 1 Tasks 1.1 - 1.9
- [ ] Generate first math exam with Gemini
- [ ] Verify quality score ≥88%

### Week 2-3 Goals

- [ ] Complete Phase 2 (grading engine)
- [ ] Achieve 98%+ grading accuracy

### Week 4+ (Optional)

- [ ] Complete Phase 3 (web rendering)
- [ ] User testing with Finnish teachers

---

## 14. References

**Related Documents:**
- `MATH_EXAM_FINAL_IMPLEMENTATION_PLAN.md` - Complete math exam specification
- `MathExamRisks.md` - Risk analysis from education specialist
- `schema_examgenie_exams.md` - Current database schema
- `generate_geometry_exam.js` - Working Gemini integration example

**Key Implementation Sections:**
- Section 4.7.1: LaTeX Escape Handling
- Section 4.7.2: Preventing Duplicate Text
- Section 13: Risk Mitigation & Operational Concerns

---

**Document Status:** ✅ Ready for Development
**Approval Required:** Database migration, architecture approach
**Owner:** ExamGenie Development Team
**Last Updated:** 2025-10-04

---

## 13. Appendix A: Production-Ready Math Exam Prompt

### 13.1 Complete Prompt with Topic Auto-Detection

**CRITICAL UPDATE:** This prompt removes all grade-based assumptions and implements dynamic difficulty analysis and topic detection. The LLM analyzes the actual content shown in textbook images rather than making assumptions based on grade level or geographic location.

```
ROLE: You are an expert mathematics teacher creating exam questions for students studying from their textbook.

CONTEXT: You are analyzing textbook images containing mathematical content. The images may show:
- Worked examples with solutions
- Formula definitions and explanations
- Practice problems
- Diagrams and geometric figures
- Real-world applications

CRITICAL - CONTENT DIFFICULTY ANALYSIS:
Before generating questions, analyze the ACTUAL difficulty level of the material shown in the images:

Step 1: IDENTIFY SPECIFIC CONCEPTS
- Look at the formulas shown (e.g., "circle sector area: A = (α/360°) × π × r²")
- Look at the notation used (basic numbers, fractions, Greek letters like α, π, θ)
- Look at the examples solved (simple substitution vs. multi-step derivation)

Step 2: ASSESS COMPLEXITY LEVEL
- Basic: Simple arithmetic, whole numbers, one-step problems
- Intermediate: Fractions, decimals, basic formulas, two-step problems  
- Advanced: Multiple formulas, symbolic manipulation, Greek letters, multi-step derivation

Step 3: DETECT MATHEMATICAL TOPICS
- Identify 1-3 main mathematical topics shown in the images
- Be specific: "circle sector area calculations with π" not just "geometry"
- Examples of topics: circle_sectors, pythagorean_theorem, linear_equations, quadratic_formula, trigonometry, probability, etc.

Step 4: MATCH DIFFICULTY EXACTLY
- If images show π and formulas → Generate questions with π and formulas
- If images show only basic arithmetic → Generate only basic arithmetic questions
- DO NOT assume difficulty based on grade level, age, or country
- DO NOT make questions simpler or harder than the material shown

TASK: Generate 8-15 exam questions that MATCH THE EXACT DIFFICULTY LEVEL of the content shown in these textbook images.

IMPORTANT REQUIREMENTS:
1. Questions MUST be in Finnish language
2. Difficulty MUST MATCH the actual complexity shown in images (analyze first!)
3. Cover different aspects of the specific topics detected
4. Mix of question types: 60% numeric calculations, 30% word problems, 10% multiple choice
5. No references to "kuva" or "kuvassa" - create standalone questions that make sense without the images
6. All mathematical expressions MUST use valid LaTeX syntax
7. Use the SAME formulas, notation, and problem-solving approach shown in the images

MATHEMATICAL NOTATION (LaTeX Requirements):
- All math expressions MUST be in LaTeX format
- Use proper LaTeX syntax: \\frac{\\alpha}{360°}, \\pi, r^2, \\theta
- Put inline LaTeX directly in question_text: "kun säde on $r = 5.3$ cm"
- Use question_latex ONLY for displaying formulas separately: "Kaava: $A = \\frac{\\alpha}{360°} \\times \\pi r^2$"
- Do NOT duplicate the entire question text in question_latex
- Ensure LaTeX is valid and renderable with KaTeX
- Remember: In JSON, backslashes must be escaped (\\alpha not \alpha)

ANSWER TYPES - Choose appropriate type based on question:
1. "numeric" - Decimal or integer with tolerance (e.g., 12.9 cm²)
2. "algebraic" - Symbolic expression (e.g., 2x + 3)
3. "solution_set" - Set notation (e.g., {1, 2, 3} or {x | x > 5})
4. "multiple_choice" - Four options A, B, C, D
5. "angle_set" - Angle measurements (e.g., {45°, 135°})
6. "ordered_pair" - Coordinate pair (e.g., (3, 4))
7. "inequality" - Inequality expression (e.g., x < 5)
8. "ratio_proportion" - Ratio notation (e.g., 2:3)
9. "unit_conversion" - Unit conversion (e.g., 5 km = 5000 m)

OUTPUT FORMAT - You MUST respond with valid JSON:

{
  "exam_metadata": {
    "topic": "Detected topic in Finnish (e.g., 'Ympyräsektorit ja kaaret')",
    "detected_concepts": ["circle_sectors", "arc_length", "central_angles"],
    "difficulty": "basic | intermediate | advanced (based on image analysis)",
    "estimated_time_minutes": 30
  },
  "questions": [
    {
      "question_id": "q_001",
      "question_text": "Laske ympyräsektorin pinta-ala, kun säde on $r = 5.3$ cm ja keskuskulma on $\\alpha = 56°$.",
      "question_latex": "Kaava: $A = \\frac{\\alpha}{360°} \\times \\pi r^2$",
      "question_display_mode": "block",
      
      "answer_type": "numeric",
      "answer_format": {
        "type": "decimal",
        "tolerance": 0.5,
        "units": "cm²",
        "decimals": 1
      },
      
      "correct_answer": {
        "value": 12.9,
        "display": "12.9 cm²"
      },
      
      "grading_rules": {
        "match_type": "numeric_tolerance",
        "tolerance": 0.5
      },
      
      "explanation": "Sektorin pinta-ala lasketaan kaavalla $A = \\frac{\\alpha}{360°} \\times \\pi r^2$. Sijoita arvot: $A = \\frac{56°}{360°} \\times \\pi (5.3)^2 \\approx 12.9$ cm².",
      "explanation_latex": "$A = \\frac{56°}{360°} \\times \\pi (5.3)^2 \\approx 12.9$ cm²",
      
      "difficulty": "intermediate",
      "curriculum_topic": "circle_sectors",
      "estimated_time_seconds": 180
    }
  ]
}

VALIDATION RULES - Every question MUST follow these rules:
1. Every question MUST have a valid answer_type from the 9 types listed above
2. Numeric answers MUST include tolerance, units, and decimals in answer_format
3. All LaTeX MUST be valid KaTeX syntax (escape backslashes properly in JSON: \\alpha not \alpha)
4. Multiple choice questions MUST have exactly 4 options (A, B, C, D)
5. Solutions MUST be mathematically correct - verify by solving
6. Explanations MUST be clear and educational in Finnish
7. For multiple choice: do NOT use lettered sub-parts (a, b, c) in question text
8. The detected_concepts array MUST contain 1-3 specific topic identifiers

QUALITY CHECKLIST - Verify before responding:
☐ Questions match the difficulty level shown in images (not too easy, not too hard)
☐ detected_concepts accurately reflects the topics shown in the images
☐ difficulty field matches the actual complexity (basic/intermediate/advanced)
☐ Mix of question types (numeric, word problems, multiple choice)
☐ All LaTeX notation is correct and properly escaped for JSON
☐ Answers are mathematically verified by solving the problems
☐ No references to "kuvassa" or "the image" in question text
☐ All questions are standalone and make sense without seeing the images

SELF-VALIDATION BEFORE RESPONDING:
1. Analyze the images first - what formulas are shown? What notation is used?
2. Set difficulty based on what you see, not assumptions about grade level
3. Solve each question yourself to verify the correct answer
4. Check that LaTeX syntax is valid (no unescaped backslashes in JSON)
5. Ensure detected_concepts match the actual content shown

Generate 8-15 questions now in valid JSON format.
```

### 13.2 Key Changes from Original Plan

| Aspect | Original Plan | Updated Approach |
|--------|---------------|------------------|
| **Prompt Strategy** | Grade-based templates (1-9) | Dynamic difficulty analysis |
| **Topic Detection** | Not specified | LLM auto-detects from images |
| **Geographic Scope** | Finland-focused | Global (any country's textbooks) |
| **Difficulty Basis** | Grade level assumptions | Actual content analysis |
| **Number of Prompts** | 9 templates (one per grade) | 1 adaptive prompt |

### 13.3 Prompt Usage in Code

```typescript
// src/lib/services/math-prompt-service.ts

export class MathPromptService {
  /**
   * Generate math exam prompt (no grade-based templates)
   * 
   * @param language - User's language for exam generation (default: 'fi')
   * @returns Complete prompt for Gemini API
   */
  static generateMathPrompt(language: string = 'fi'): string {
    // Return the single adaptive prompt
    // Language can be parameterized if needed in future
    return MATH_EXAM_PROMPT;  // From appendix above
  }
}
```

**No grade-based logic needed** - Gemini analyzes difficulty from images.

---

**Document Status:** ✅ Updated with Cost Analysis & New Prompt Strategy
**Version:** 1.1
**Last Updated:** 2025-10-04
