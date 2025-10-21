# Key Concepts Integration Plan

**Feature:** Gamified Key Concepts Learning Cards
**Version:** 1.3 (IMPLEMENTATION COMPLETE)
**Date:** October 21, 2025
**Status:** ✅ **FULLY IMPLEMENTED & DEPLOYED**

---

## 📋 Overview

Add an interactive "Key Concepts" section to ExamGenie that helps students master essential ideas from their textbook before taking exams. Concepts are generated automatically during exam creation, displayed in a minimalist card stack interface, and reward students with 5 Genie Dollars upon completion.

**Visual Style:** Card Stack Layout (Variant 2)
**Reward:** 5 Genie Dollars (completing all concepts)

---

## ⚠️ Plan Adaptability Notice

**This plan is subject to modification based on test results.**

Before implementing key concepts in production, all three prompts (`getCategoryAwarePrompt`, `getHistoryPrompt`, `getMathPrompt`) must be tested with real textbook images. If testing reveals:

- **Prompt conflicts:** Key concepts generation interferes with existing functionality
- **Output quality issues:** Concepts are too generic, repetitive, or not grounded
- **Token limit problems:** Combined output exceeds Gemini limits (especially with 10+ images)
- **Format inconsistencies:** Different prompts produce incompatible structures
- **Performance degradation:** Response times increase significantly

**Then this plan will be updated accordingly** with:
- Adjusted prompt strategies (e.g., separate API calls for concepts)
- Modified concept count formulas (e.g., `images × 2` instead of `× 3`)
- Alternative implementation approaches (e.g., post-processing, client-side generation)
- Revised database schemas or API structures
- Updated timelines and milestones

**Testing phase (Phase 1) is critical.** Do not proceed to database migration (Phase 2) or frontend development (Phase 3+) until all three prompt tests pass validation criteria outlined in the "Prompt-Specific Test Cases" section below.

---

## ✅ IMPLEMENTATION COMPLETE (October 21, 2025)

**Implementation Time:** ~4 hours
**Status:** All phases complete, database migration applied to staging and production

### Phase 1: Backend ✅
- ✅ Updated `getCategoryAwarePrompt()` with key concepts (config.ts:137)
- ✅ Updated `getHistoryPrompt()` with strict grounding (config.ts:572)
- ✅ Implemented two-stage math service (math-exam-service.ts:47-376)
- ✅ Updated mobile-api-service to pass imageCount and save concepts

### Phase 2: Database ✅
- ✅ Created migration file (20251021000000_add_key_concepts.sql)
- ✅ Applied migration to staging database
- ✅ Applied migration to production database
- ✅ Verified JSONB columns with GIN indexes

### Phase 3: API Routes ✅
- ✅ Updated ExamData interface with key_concepts and gamification fields
- ✅ Updated exam-repository.ts to return concepts
- ✅ API endpoint automatically returns concepts via existing GET /api/exam/[id]

### Phase 4: Frontend ✅
- ✅ Created KeyConceptsCard component (components/exam/KeyConceptsCard.tsx)
- ✅ Integrated into exam menu page (app/exam/[id]/page.tsx)
- ✅ Progress tracking with localStorage
- ✅ Gamification completion flow with boss questions
- ✅ Swipeable card interface with difficulty indicators

### Files Modified:
1. `/src/lib/config.ts` - Prompts updated
2. `/src/lib/services/math-exam-service.ts` - Two-stage implementation
3. `/src/lib/services/mobile-api-service.ts` - ImageCount + saving
4. `/src/lib/services/exam-repository.ts` - Return key_concepts
5. `/src/lib/supabase.ts` - New interfaces
6. `/src/components/exam/KeyConceptsCard.tsx` - New component
7. `/src/app/exam/[id]/page.tsx` - Integration
8. `/src/app/dev/reset/page.tsx` - Build fix (Link components)
9. `/supabase/migrations/20251021000000_add_key_concepts.sql` - Database schema

### Migration Files:
- `/MIGRATION_GUIDE.md` - Manual migration instructions
- `/run-migration.ts` - Migration runner script

---

## ✅ TESTING COMPLETE (October 21, 2025)

**Test Results:** See `/KEY_CONCEPTS_TEST_RESULTS.md` for full validation report.

**Summary:** All three prompts tested and validated. All blockers resolved.

### ✅ RESOLVED: Math Prompt Token Overflow

**Status:** ✅ **SOLVED with Two-Stage Architecture**

**Solution Implemented:**
- Stage 1: Generate math exam (questions + audio summary) - 2,555 tokens
- Stage 2: Extract key concepts from questions - 1,797 tokens
- Total: 4,352 tokens (93% reduction from overflow)
- Cost: $0.001489 (92% cheaper than single-call overflow)
- Time: 14.9s (88% faster)

**Test Results:**
- ✅ Math test completes without truncation
- ✅ Valid JSON output
- ✅ 9/9 key concepts generated (100% formula accuracy)
- ✅ Audio summary uses spoken notation
- ✅ Concept definitions use spoken notation
- ✅ All questions grounded in visible textbook

**Implementation Note:**
- Math service requires two separate API calls
- Cannot use single-call approach like physics/history
- Reference implementation: `test-gamified-concepts-math-v2.ts`

---

### ✅ RESOLVED: History Grounding Standards

**Status:** ✅ **DECISION MADE - Option B Implemented**

**Decision:** Enforce 100% grounding for key concepts (stricter than questions)

**Rationale:**
- Students expect key concepts to be study aids from their textbook
- Higher trust when concepts are verifiable in source material
- Educational integrity prioritized over speed

**Implementation:**
Added strict grounding rules to history prompt:
```
🔴 STRICT GROUNDING REQUIREMENT FOR KEY CONCEPTS:
- ALL concepts must be 100% grounded in VISIBLE textbook content
- Do NOT include specific names unless they appear in the textbook
- Use general descriptions if specific names are not visible
- Higher grounding standard than questions: NO outside knowledge allowed
```

**Test Results After Fix:**
- Concept count: 29/30 (97% vs original 28/30)
- Grounding rate: 97-100% (vs original 93%)
- Fabrications removed: 2 → 0 confirmed
  - ✅ Franklin D. Roosevelt → REMOVED
  - ✅ Al Capone → REMOVED
- Category diversity: 7 categories (Conflict, Economy, Government, People, Foreign Policy, Society, Outcomes)

**Effort Spent:** 2 hours (prompt engineering + testing)

---

### ✅ SUCCESS: Physics Prompt Ready

**Status:** ✅ **NO BLOCKERS**

**Test Results:**
- 9/9 concepts generated (100% formula accuracy)
- 78% directly verifiable from textbook, 22% standard physics definitions
- All questions answerable from visible pages
- Natural Finnish language
- Category distribution matches chapter topics
- Cost: $0.002225 (acceptable)

**Action:** getCategoryAwarePrompt ready for integration - no changes needed.

---

## 🔄 Implementation Timeline

**Testing Phase:** ✅ COMPLETE (5 hours total)
- Physics testing: 1 hour
- Math testing + two-stage solution: 3 hours
- History grounding fix: 2 hours

**Implementation Estimate:** 6 phases, ~2-3 weeks

**Implementation Phases:**

| Phase | Status | Estimated Time | Dependencies |
|-------|--------|----------------|--------------|
| **Phase 1** | ⏳ READY TO START | 4-6 hours | Testing complete |
| **Phase 2** | 🔜 PENDING | 2-3 hours | Phase 1 complete |
| **Phase 3** | 🔜 PENDING | 4-6 hours | Phase 2 complete |
| **Phase 4** | 🔜 PENDING | 6-8 hours | Phase 3 complete |
| **Phase 5** | 🔜 PENDING | 2-3 hours | Phase 4 complete |
| **Phase 6** | 🔜 PENDING | 3-4 hours | Phase 5 complete |

**Total Estimated Time:** 21-30 hours (~3-4 weeks at 1-2 hours/day)

**Current Status:** ✅ Ready to begin Phase 1 (Prompt Engineering)

---

## 🎯 User Flow

### 1. Exam Generation (Backend)
When a user generates an exam from textbook images:
- Gemini receives **combined prompt** (questions + summary + key concepts)
- Returns JSON with 3 sections:
  - `questions` array (15 exam questions)
  - `summary` object (4-section educational summary for audio)
  - `key_concepts` array (images × 3 concepts)
  - `gamification` object (completion message, boss questions, reward)
- All data stored in database simultaneously

### 2. Exam Menu Display (Frontend)
User lands on `/exam/[id]` menu page:
- **Key Concepts card** appears alongside Audio and Exam cards
- Card shows:
  - Title: "Key Concepts"
  - Subtitle: "Master X essential ideas" (X = concept count)
  - Status: "0/X completed" or "Completed ✓"
  - Icon: 🎓 or 📚
- Card is always visible (not conditional like audio)

### 3. Key Concepts Page (`/exam/[id]/concepts`)
User clicks Key Concepts card → navigates to dedicated page:
- **Header:** Title + purpose statement
- **Progress bar:** Visual progress (0-100%)
- **Card stack:** Numbered cards (1, 2, 3...)
- Each card shows:
  - Concept name (2-5 words)
  - Category tag (e.g., "Conflict", "Government")
  - Difficulty badge (foundational/intermediate/advanced)
  - Badge title (gamified name)
  - Question count ("Asked in X questions")
  - "Show Details" button
- **Expanded view** (on click):
  - Definition (1 sentence, grounded in textbook)
  - Mini-game hint (riddle/clue)
  - Card marked as "mastered" (green border)
  - Progress updates

### 4. Completion & Reward
When user clicks all concept cards:
- **Completion banner:** "🎉 All concepts mastered!"
- **Reward:** +5 Genie Dollars added to localStorage
- **Boss Question Modal** (optional): Show final synthesis question
- **Return to menu:** Button to go back to exam menu

---

## 🗄️ Database Schema Changes

### Table: `examgenie_exams`

**Add new columns:**

```sql
-- Key concepts JSON array
key_concepts JSONB DEFAULT NULL,

-- Gamification data JSON object
gamification_data JSONB DEFAULT NULL,

-- Completion tracking
key_concepts_completed_at TIMESTAMP DEFAULT NULL,

-- Individual concept completion tracking (array of concept IDs user has clicked)
key_concepts_progress JSONB DEFAULT '[]'::jsonb
```

**Example `key_concepts` structure:**
```json
[
  {
    "concept_name": "Sisällissodan osapuolet",
    "definition": "Sisällissodan osapuolet olivat punaiset ja valkoiset...",
    "difficulty": "foundational",
    "category": "Conflict",
    "related_question_ids": [1, 3, 4, 9],
    "badge_title": "Faction Finder",
    "mini_game_hint": "Kaksi ryhmää, jotka taistelivat toisiaan vastaan..."
  }
]
```

**Example `gamification_data` structure:**
```json
{
  "completion_message": "Olet suorittanut kaikki keskeiset käsitteet!",
  "boss_question_open": "Selitä, miten...",
  "boss_question_multiple_choice": {
    "question": "Mikä seuraavista...",
    "options": ["A", "B", "C", "D"],
    "correct_answer": "B"
  },
  "reward_text": "Historia Mestari -merkki ansaittu!"
}
```

**Example `key_concepts_progress` structure:**
```json
[0, 2, 5, 8]  // Indices of concepts user has clicked/mastered
```

---

## 🔧 Implementation Steps

### Phase 1: Prompt Integration (Backend)

**Files to modify:**
- `/src/lib/config.ts` - Update prompts
- `/src/lib/services/mobile-api-service.ts` - Handle key concepts response

**Tasks:**

1. **Update `getCategoryAwarePrompt()`** in `config.ts`:
   - Add Task 3: Key Concepts Generation
   - Specify: `images × 3` concepts
   - Add required fields (concept_name, definition, difficulty, category, etc.)
   - Add gamification object structure
   - Include purpose statement in prompt

2. **Update `getHistoryPrompt()`** in `config.ts`:
   - Add same key concepts generation task
   - Maintain history-specific grounding rules
   - Add JSON output requirement for key_concepts array

3. **Update `getMathPrompt()`** in `config.ts`:
   - Add key concepts task
   - Ensure spoken notation in definitions (no LaTeX)
   - Add category examples relevant to math (e.g., "Algebra", "Geometry")

4. **Modify `mobile-api-service.ts`**:
   - Parse `key_concepts` array from Gemini response
   - Parse `gamification` object from response
   - Validate structure (required fields present)
   - Store in database alongside questions and summary
   - Log any parsing errors

**Validation rules:**
- Concept count = `images × 3` (±1 acceptable)
- All required fields present
- No duplicate concept names
- All question IDs referenced at least once

---

### Phase 2: Database Migration

**Create migration file:** `/supabase/migrations/YYYYMMDD_add_key_concepts.sql`

**Migration tasks:**

1. **Add columns to `examgenie_exams`:**
   ```sql
   ALTER TABLE examgenie_exams
   ADD COLUMN key_concepts JSONB DEFAULT NULL,
   ADD COLUMN gamification_data JSONB DEFAULT NULL,
   ADD COLUMN key_concepts_completed_at TIMESTAMP DEFAULT NULL,
   ADD COLUMN key_concepts_progress JSONB DEFAULT '[]'::jsonb;
   ```

2. **Add indexes for performance:**
   ```sql
   CREATE INDEX idx_exams_key_concepts ON examgenie_exams
   USING GIN (key_concepts);

   CREATE INDEX idx_exams_concepts_completed ON examgenie_exams
   (key_concepts_completed_at) WHERE key_concepts_completed_at IS NOT NULL;
   ```

3. **Create rollback script:**
   ```sql
   -- Remove columns if needed
   ALTER TABLE examgenie_exams
   DROP COLUMN IF EXISTS key_concepts,
   DROP COLUMN IF EXISTS gamification_data,
   DROP COLUMN IF EXISTS key_concepts_completed_at,
   DROP COLUMN IF EXISTS key_concepts_progress;
   ```

---

### Phase 3: API Endpoints

**Create new API routes:**

#### 1. GET `/api/exam/[id]/concepts`
**Purpose:** Fetch key concepts for an exam
**Response:**
```json
{
  "concepts": [...],
  "gamification": {...},
  "progress": [0, 2, 5],
  "completed": false,
  "total_concepts": 9
}
```

#### 2. POST `/api/exam/[id]/concepts/progress`
**Purpose:** Update user's concept progress
**Body:**
```json
{
  "concept_index": 3,  // Which concept was clicked
  "student_id": "uuid"  // For tracking (optional)
}
```
**Response:**
```json
{
  "progress": [0, 2, 3, 5],
  "completed": false,
  "concepts_remaining": 5
}
```

#### 3. POST `/api/exam/[id]/concepts/complete`
**Purpose:** Mark all concepts complete, award Genie Dollars
**Body:**
```json
{
  "student_id": "uuid",  // Optional
  "completed_at": "2025-10-20T15:30:00Z"
}
```
**Response:**
```json
{
  "success": true,
  "reward_earned": 5,
  "completion_message": "Olet suorittanut kaikki käsitteet!"
}
```

**Files to create:**
- `/src/app/api/exam/[id]/concepts/route.ts`
- `/src/app/api/exam/[id]/concepts/progress/route.ts`
- `/src/app/api/exam/[id]/concepts/complete/route.ts`

---

### Phase 4: Frontend Components

**New page:** `/src/app/exam/[id]/concepts/page.tsx`

**Component structure:**
```
ConceptsPage (page.tsx)
├── ConceptsHeader
│   ├── Title
│   ├── Purpose statement
│   └── Back button
├── ProgressBar
│   ├── Progress text ("X/Y concepts learned")
│   └── Visual progress track
├── ConceptsList
│   ├── ConceptCard (repeated)
│   │   ├── Card number
│   │   ├── Card content
│   │   │   ├── Concept name
│   │   │   ├── Category tag
│   │   │   ├── Difficulty badge
│   │   │   ├── Badge title
│   │   │   ├── Question count
│   │   │   ├── Toggle button
│   │   │   └── Details (hidden by default)
│   │   │       ├── Definition
│   │   │       └── Mini-game hint
└── CompletionBanner (hidden until 100%)
    ├── Celebration message
    ├── Reward earned (+5 Genie Dollars)
    └── Return to menu button
```

**State management:**
```typescript
interface ConceptsState {
  concepts: KeyConcept[];
  progress: number[];  // Indices of clicked concepts
  completed: boolean;
  loading: boolean;
}
```

**User interactions:**
1. Click "Show Details" → Expand card, mark as mastered
2. Click expanded card → Collapse (toggle behavior)
3. Complete all → Show banner, award Genie Dollars
4. Return to menu → Navigate back to `/exam/[id]`

---

### Phase 5: Exam Menu Integration

**File:** `/src/app/exam/[id]/page.tsx`

**Add Key Concepts card:**

```typescript
// After Audio card, before Exam card
{exam.key_concepts && (
  <Card
    icon="🎓"
    title="Key Concepts"
    subtitle={`Master ${exam.key_concepts.length} essential ideas`}
    status={exam.key_concepts_completed_at
      ? "Completed ✓"
      : `0/${exam.key_concepts.length} completed`}
    href={`/exam/${examId}/concepts`}
    disabled={false}  // Always accessible
  />
)}
```

**Card order:**
1. Audio Summary (if audio_url exists)
2. **Key Concepts** (if key_concepts exists) ← NEW
3. Take Exam
4. Results (if completed_at exists)

**Visual style:**
- Match existing card style (white background, grey text)
- Use design tokens from `/src/constants/design-tokens.ts`
- Progress indicator (e.g., "3/9 completed" or "Completed ✓")

---

### Phase 6: Genie Dollars Integration

**File:** `/src/lib/utils/genie-dollars.ts`

**Add new reward type:**

```typescript
export const REWARDS = {
  AUDIO_COMPLETION: 5,
  EXAM_COMPLETION: 10,
  KEY_CONCEPTS_COMPLETION: 5,  // NEW
  // ... existing rewards
}
```

**Add reward function:**

```typescript
export function awardKeyConceptsReward(examId: string): void {
  // Check if already awarded
  const key = `genie_dollars_concepts_${examId}`;
  if (localStorage.getItem(key)) {
    return; // Already claimed
  }

  // Award 5 Genie Dollars
  const currentBalance = getGenieBalance();
  const newBalance = currentBalance + REWARDS.KEY_CONCEPTS_COMPLETION;
  localStorage.setItem('genie_dollars', newBalance.toString());

  // Mark as claimed
  localStorage.setItem(key, 'true');

  // Show notification (optional)
  console.log('🎉 +5 Genie Dollars earned!');
}
```

**Call this function:**
- When user completes all concepts
- Only once per exam (localStorage check)
- Display reward notification in completion banner

---

## 🎨 Design Specifications

### Visual Style: Card Stack (Variant 2)

**Colors:**
- Background: `#fafafa`
- Card background: `#ffffff`
- Primary text: `#1a1a1a`
- Secondary text: `#666`
- Tertiary text: `#999`
- Border: `#e0e0e0`
- Completed border: `#4CAF50`
- Button background: `#f5f5f5`
- Button hover: `#e8e8e8`

**Typography:**
- Font family: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif`
- H1 (page title): `2.5rem`, weight `700`
- H3 (concept name): `1.25rem`, weight `600`
- Body text: `0.95rem`, weight `400`
- Small text: `0.85rem`

**Spacing:**
- Card gap: `1.5rem`
- Card padding: `1.5rem`
- Section margin: `2rem`
- Button padding: `0.75rem`

**Animations:**
- Card hover: `translateY(-2px)` (subtle)
- Transition: `all 0.2s ease`
- Progress bar: `width 0.3s ease`
- Completion banner: `fadeIn 0.5s ease`

---

## 📊 Analytics & Tracking (Optional Future Enhancement)

**Potential metrics to track:**
- % of users who click Key Concepts card
- Average concepts viewed per session
- Time spent on concepts page
- Completion rate (% who master all concepts)
- Concepts viewed before vs after exam
- Correlation: concepts → exam score

**Database table (future):** `user_concept_interactions`
```sql
CREATE TABLE user_concept_interactions (
  id UUID PRIMARY KEY,
  exam_id UUID REFERENCES examgenie_exams(id),
  user_id UUID REFERENCES auth.users(id),
  concept_index INT,
  viewed_at TIMESTAMP,
  session_id TEXT
);
```

---

## 🧪 Prompt-Specific Test Cases

Before integration, test each prompt with real textbook images to validate key concepts generation.

### Test 1: getCategoryAwarePrompt (Core Academics - Physics)

**Test script:** `test-gamified-concepts.ts` (update to use physics images)

**Images:**
- Directory: `assets/images/physics/`
- Files: `kpl11a compr.jpeg`, `kpl12a compr.jpeg`, `kpl13a compr.jpeg`
- Count: 3 images
- Subject: Finnish physics textbook (motion, forces, energy)

**Expected output:**
- Questions: 15 (multiple choice)
- Summary: ~1000 words (4 sections: introduction, key_concepts, examples_and_applications, summary_conclusion)
- Key concepts: 9 (3 images × 3)
- Language: Finnish (auto-detected)
- Categories: "Motion", "Forces", "Energy", etc.

**Validation checklist:**
- [ ] 9 key concepts generated (±1 acceptable)
- [ ] All concepts have 2-5 word names
- [ ] Categories diverse (not all "Physics")
- [ ] Definitions in Finnish, grounded in textbook
- [ ] Badge titles in Finnish (e.g., "Voiman Mestari")
- [ ] All 15 questions referenced at least once
- [ ] Gamification object present with boss questions
- [ ] No visual references in concepts

**Test command:**
```bash
npx tsx test-gamified-concepts.ts
# Uses physics images, generates output/key-concepts-*.html
```

---

### Test 2: getHistoryPrompt (History)

**Test script:** `test-gamified-concepts-history.ts` (already created)

**Images:**
- Directory: `assets/images/history_8th_compr/`
- Files: First 3 images (`sivu12-min.jpeg`, `sivu14-min.jpeg`, `sivu16-min.jpeg`)
- Count: 3 images (test), then scale to 10 images
- Subject: Finnish history textbook (Civil War, WWI aftermath)

**Expected output:**
- Questions: 15 (2 terminology, 6 events, 4 causes, 3 people)
- Options format: Object with `{id: "A", text: "..."}` (history format)
- Summary: ~600-800 words (compressed due to 4000 token limit)
- Key concepts: 9 (3 images × 3) or 30 (10 images × 3)
- Language: Finnish (auto-detected)
- Categories: "Conflict", "Causes", "Outcomes", "Government", etc.

**Validation checklist:**
- [ ] 9 or 30 key concepts generated (images × 3)
- [ ] All concepts grounded in visible textbook content only
- [ ] No outside historical knowledge used
- [ ] Language-aware grounding rule enforced (Finnish uses all text)
- [ ] Categories historically relevant
- [ ] Badge titles in Finnish (e.g., "Sisällissodan Tuntija")
- [ ] Options format: `{id, text}` objects
- [ ] Output under 4000 tokens

**Test command:**
```bash
# 3 images test
npx tsx test-gamified-concepts-history.ts
# Output: prompttests/test-history-key-concepts-*.json

# 10 images test (update IMAGE_COUNT to 10)
# Expected: 30 key concepts
```

**Special considerations:**
- History prompt already tested successfully (Oct 20, 2025)
- 10-image test generated 28/30 concepts (acceptable)
- JSON fix already in place for option format errors
- Boss question validation may fail (answer must match exactly)

---

### Test 3: getMathPrompt (Mathematics)

**Test script:** `test-gamified-concepts-math.ts` (create new)

**Images:**
- Directory: `assets/images/math_8th_grade/`
- Files: `algebra.jpg`, `geometry.JPG`, `potenssi.JPG`
- Count: 3 images
- Subject: Finnish mathematics (algebra, geometry, exponents)

**Expected output:**
- Questions: 15 (6 computational, 4 formula/simplification, 3 word problems, 2 conceptual)
- Summary format: **`audio_summary`** object (NOT `summary`)
- Audio summary: Spoken notation only (no LaTeX: $ symbols, \frac, etc.)
- Key concepts: 9 (3 images × 3)
- Language: Finnish (auto-detected)
- Categories: "Algebra", "Geometry", "Exponents", "Calculations", etc.

**Validation checklist:**
- [ ] 9 key concepts generated
- [ ] **CRITICAL:** Definitions use spoken notation only
  - ✅ Good: "x toiseen" (x squared)
  - ❌ Bad: "$x^2$" (LaTeX)
- [ ] Categories math-specific (not generic "Mathematics")
- [ ] Badge titles in Finnish (e.g., "Algebran Asiantuntija")
- [ ] Mini-game hints use spoken math
- [ ] `audio_summary` object present (separate from `summary`)
- [ ] Audio summary sections: overview, key_ideas, applications, common_mistakes, guided_reflections
- [ ] All mathematical notation converted to speech

**Test script to create:**

```typescript
// test-gamified-concepts-math.ts
// Copy from test-gamified-concepts.ts, modify:
// - Change images directory to math_8th_grade
// - Update validation to check for spoken notation
// - Verify audio_summary format (not summary)
// - Category validation for math terms
```

**Test command:**
```bash
npx tsx test-gamified-concepts-math.ts
# Output: prompttests/test-math-key-concepts-*.json
```

**Special validation for math:**
```typescript
// Check definitions don't contain LaTeX
concepts.forEach(concept => {
  if (concept.definition.includes('$') ||
      concept.definition.includes('\\frac') ||
      concept.definition.includes('^')) {
    console.error('❌ LaTeX found in definition:', concept.definition);
  }
});
```

---

### Test Summary Matrix

| Test | Prompt Function | Images | Concepts | Language | Special Rules |
|------|----------------|--------|----------|----------|---------------|
| 1 | `getCategoryAwarePrompt()` | Physics (3) | 9 | Finnish | Standard summary format |
| 2 | `getHistoryPrompt()` | History (3-10) | 9-30 | Finnish | Grounding only, `{id,text}` options |
| 3 | `getMathPrompt()` | Math (3) | 9 | Finnish | Spoken notation, `audio_summary` |

---

### Pre-Integration Test Workflow

1. **Create `test-gamified-concepts-math.ts`** (copy from existing, modify for math)
2. **Update `test-gamified-concepts.ts`** to use physics images (currently uses history)
3. **Run all three tests:**
   ```bash
   npx tsx test-gamified-concepts.ts          # Physics/Core academics
   npx tsx test-gamified-concepts-history.ts  # History
   npx tsx test-gamified-concepts-math.ts     # Math
   ```
4. **Claude Code validation (CRITICAL STEP):**
   - Claude Code reads the same textbook images used in each test
   - Examines Gemini's generated output (questions, concepts, definitions)
   - Validates content quality by comparing against actual textbook material:
     - **Questions:** Are questions answerable from visible content?
     - **Answers:** Do correct answers match what textbook actually says?
     - **Concepts:** Are definitions grounded in textbook (not fabricated)?
     - **Categories:** Do category labels make sense for the content?
     - **Language:** Is language consistent and natural?
     - **Grounding (History):** Are facts only from visible pages, no outside knowledge?
     - **Notation (Math):** Are definitions using spoken notation, not LaTeX?
   - Document validation findings in detailed report
5. **Review outputs:**
   - Check JSON files in `prompttests/`
   - Open HTML prototypes in `output/`
   - Verify concept quality, language, categories
   - Compare against Claude Code's validation report
6. **Document any issues:**
   - Concept count variations
   - Single-word concept names
   - Category repetition
   - Language/format errors
   - **Content quality issues** (grounding, accuracy, fabrication)
   - Mismatches between textbook and generated content
7. **Evaluate results and update plan:**
   - If all tests pass Claude Code validation → Proceed to Phase 2 (Database Migration)
   - If issues found → **Update this plan** with revised approach
   - Document findings in `KEY_CONCEPTS_TEST_RESULTS.md`
   - Modify prompts/expectations as needed
   - Re-test until validation criteria met

**CRITICAL:** Do not proceed to implementation phases until:
1. Testing shows consistent, high-quality key concepts generation across all three prompt types
2. **Claude Code validation confirms content accuracy and grounding in all test outputs**

---

## ✅ Testing Checklist

### Backend Testing

- [ ] **Test 1 (Physics):** Core academics prompt generates concepts correctly
- [ ] **Test 2 (History):** History prompt maintains grounding rules with concepts
- [ ] **Test 3 (Math):** Math prompt uses spoken notation in definitions
- [ ] Concept count matches `images × 3` (±1) for all prompts
- [ ] All required fields present in each concept
- [ ] Gamification object includes boss questions
- [ ] **Claude Code validation:** All three test outputs verified against textbook images
  - [ ] Physics: Questions/concepts match visible content
  - [ ] History: No outside knowledge, grounding verified
  - [ ] Math: Spoken notation confirmed, no LaTeX in concepts
  - [ ] All correct answers verified accurate per textbook
  - [ ] No fabricated facts or hallucinations detected
- [ ] Database columns accept JSONB data
- [ ] Migration runs without errors
- [ ] Rollback migration works

### API Testing

- [ ] GET `/api/exam/[id]/concepts` returns concepts
- [ ] POST `/api/exam/[id]/concepts/progress` updates progress
- [ ] POST `/api/exam/[id]/concepts/complete` awards Genie Dollars
- [ ] Progress persists across page reloads
- [ ] Cannot claim reward twice for same exam
- [ ] Handles missing/invalid exam IDs

### Frontend Testing

- [ ] Concepts page renders with correct data
- [ ] Cards expand/collapse on click
- [ ] Progress bar updates in real-time
- [ ] Completion banner appears after mastering all
- [ ] Genie Dollars awarded on completion
- [ ] Navigation back to menu works
- [ ] Responsive design (mobile + desktop)
- [ ] Works with Finnish/Swedish/English/German content

### Integration Testing

- [ ] Menu shows Key Concepts card when concepts exist
- [ ] Card shows correct progress (0/9, 3/9, Completed)
- [ ] Clicking card navigates to concepts page
- [ ] Completing concepts updates menu status
- [ ] Reward system integrates with existing Genie Dollars
- [ ] No conflicts with audio/exam completion rewards

### Edge Cases

- [ ] Exam with 0 concepts (shouldn't happen, but handle gracefully)
- [ ] Exam with 50+ concepts (test performance)
- [ ] Very long concept names/definitions (text overflow)
- [ ] User closes page mid-progress (persistence)
- [ ] Multiple users on same exam (separate progress)
- [ ] Concepts in different languages display correctly

---

## 🚀 Deployment Plan

### Phase 1: Development (Week 1)
- Implement backend prompt changes
- Create database migration
- Test Gemini response with 3-10 images

### Phase 2: API Development (Week 2)
- Build API endpoints
- Test with Postman/Insomnia
- Implement progress tracking

### Phase 3: Frontend Development (Week 3)
- Build concepts page component
- Integrate with menu
- Add Genie Dollars reward

### Phase 4: Testing & Polish (Week 4)
- End-to-end testing
- Mobile responsiveness
- Performance optimization
- Bug fixes

### Phase 5: Staging Deployment
- Deploy to staging environment
- Test with real textbook images
- Gather internal feedback

### Phase 6: Production Deployment
- Deploy to production
- Monitor error logs
- Collect user feedback
- Iterate based on usage

---

## 📝 Documentation Updates

**Update these files:**

1. **README.md**
   - Add "Key Concepts" to features list
   - Update user flow diagram
   - Add screenshots of concepts page

2. **CLAUDE.md**
   - Document key concepts generation rules
   - Add database schema changes
   - Update API routes list
   - Add troubleshooting section

3. **PROJECT_OVERVIEW.md** (if exists)
   - Update architecture diagrams
   - Document key concepts workflow
   - Add reward system integration

---

## 🐛 Known Considerations & Potential Issues

### Prompt Length
- Combined prompt (questions + summary + concepts) is longer
- May approach token limits with 12+ images
- Monitor Gemini response times
- Consider compression strategies if needed
- **If token limits hit:** May need to generate concepts in separate API call

### Gemini Consistency
- Concept count may vary (±1-2 from target)
- Some concepts may have single-word names (validate 2-5 words)
- Category labels may repeat (acceptable, but track diversity)
- Boss question correct_answer must match options exactly
- **If quality degrades:** Adjust prompt instructions or reduce concept count

### Prompt-Specific Challenges

**getCategoryAwarePrompt (Physics/Core Academics):**
- Risk: Generic categories ("Science", "Physics" for everything)
- Mitigation: Prompt emphasizes diverse categories
- **If issue persists:** Update plan to specify minimum category diversity

**getHistoryPrompt:**
- Risk: Outside knowledge contamination (facts not in textbook)
- Mitigation: Grounding rules already in place
- Risk: Token overflow with 10+ images
- **If issues found:** Reduce concept count or summary length

**getMathPrompt:**
- Risk: LaTeX notation in concept definitions (breaks TTS)
- Mitigation: Prompt requires spoken notation
- Risk: Math concepts too abstract vs textbook content
- **If issues found:** Add validation layer to strip LaTeX post-generation

### User Experience
- Should concepts be accessible before taking exam? **Yes** (educational value)
- Should progress persist for guest users? **Yes** (localStorage)
- Should reward be claimable multiple times? **No** (one per exam)

### Performance
- JSONB queries can be slow on large datasets
- Index key_concepts column for faster lookups
- Consider caching frequently accessed exams

### Testing May Reveal
- Prompts need significant restructuring
- Concept formula needs adjustment (e.g., `images × 2` not `× 3`)
- Different prompts need different concept counts
- Boss questions not feasible for all subjects
- **Response:** Update plan sections accordingly, document in test results

---

## 💡 Future Enhancements (V2+)

### Spaced Repetition
- Track concept mastery over time
- Resurface difficult concepts after X days
- Algorithm: Review on Day 1, 3, 7, 14, 30

### Boss Question Challenge
- After completing all concepts, show boss question
- Award bonus Genie Dollars for correct answer
- Multiple choice or open-ended (future: AI grading)

### Concept Quiz Mode
- Mini-quiz: Match concepts to definitions
- Drag-and-drop category sorting
- Timed challenge mode

### Social Features
- Share completed concepts with friends
- Leaderboard: Most concepts mastered
- Study groups: Collaborative concept learning

### AI Tutor Integration
- Click concept → Ask AI for more explanation
- "Explain like I'm 5" button
- Related concepts suggestions

---

## 📞 Support & Rollback

### If Issues Arise in Production

**Rollback database:**
```sql
-- Run rollback migration
-- Revert to previous code version
-- Key concepts cards hidden automatically if column NULL
```

**Feature flag:**
```typescript
// Add to config
export const FEATURES = {
  KEY_CONCEPTS_ENABLED: process.env.NEXT_PUBLIC_KEY_CONCEPTS === 'true'
}

// Use in code
{FEATURES.KEY_CONCEPTS_ENABLED && exam.key_concepts && (
  <KeyConceptsCard />
)}
```

**Monitoring:**
- Track error rates in key concepts API endpoints
- Monitor Gemini prompt success rates
- Watch database query performance
- Collect user feedback via in-app survey

---

## ✨ Success Metrics

### Engagement
- Target: 60%+ of users click Key Concepts card
- Target: 40%+ complete all concepts
- Target: Average 5+ concepts viewed per session

### Educational Impact
- Measure: Correlation between concepts viewed and exam score
- Hypothesis: Students who view concepts score 10-15% higher
- Track: Time spent on concepts vs time on exam

### Retention
- Measure: Return rate after using concepts
- Track: Concepts completion → exam retakes
- Hypothesis: Concept mastery improves retention

---

## 🎯 Conclusion

The Key Concepts feature enhances ExamGenie by providing students with a structured, gamified way to master essential ideas before exams. The Card Stack layout offers a clean, minimalist experience that complements the existing exam flow while adding educational value and engagement through rewards.

**This plan is flexible and will evolve based on testing outcomes.** The three-prompt test suite (Physics, History, Math) will validate whether key concepts can be reliably generated alongside exams. If tests reveal issues, the plan will be modified before proceeding to implementation phases.

**Next Steps:**
1. Review and approve this plan
2. **Run all three prompt tests** (Physics, History, Math)
3. **Evaluate test results** and update plan if needed
4. Document findings in `KEY_CONCEPTS_TEST_RESULTS.md`
5. Create tickets/issues for each phase (only after tests pass)
6. Assign development resources
7. Begin Phase 1 implementation
8. Set timeline and milestones

**Success depends on testing.** Do not commit to timelines or resource allocation until prompt tests confirm feasibility and quality.

---

**Version History:**
- v1.0 (Oct 2025): Initial plan created based on test results with 3-10 textbook images
- v1.1 (Oct 2025): Added adaptability notice, comprehensive prompt testing requirements, and plan modification guidelines
