# 🌍 ExamGenie Localization Implementation Plan

**Status**: Phase 0 Complete ✅ | Phase 1 Ready to Start
**Created**: 2025-10-17
**Phase 0 Completed**: 2025-10-20
**Target Languages**: English (en), Finnish (fi)
**Approach**: Phase 1 - Environment Variable, Phase 2 - User-Selectable

---

## 📋 Table of Contents

1. [Progress Log](#progress-log)
2. [Overview](#overview)
3. [Architecture Decisions](#architecture-decisions)
4. [Task Breakdown](#task-breakdown)
5. [Testing Strategy](#testing-strategy)
6. [Timeline & Estimates](#timeline--estimates)
7. [Success Criteria](#success-criteria)

---

## 🔄 Progress Log

### ✅ Phase 0: Foundation Setup [COMPLETED - Oct 20, 2025]

**Total Time**: 3 hours (as estimated)

#### What Was Built

**i18n Infrastructure** (6 files, 870+ lines of code):

1. **`/src/i18n/types.ts`** (171 lines)
   - TypeScript type definitions
   - `Locale` type: `'en' | 'fi'`
   - Complete `Translations` interface with all namespaces
   - `NestedTranslationKey` type for autocomplete support

2. **`/src/i18n/locales/en.ts`** (281 lines)
   - Complete English translations
   - Extracted from `/src/constants/exam-ui.ts`
   - Extracted from `/src/constants/help-content.ts`
   - Includes: common, examMenu, examTaking, examAudio, examGrading, sharedExam, help, api sections

3. **`/src/i18n/locales/fi.ts`** (284 lines)
   - Complete Finnish translations
   - Professional translations for all English strings
   - Preserves existing Finnish from API routes and shared exam page
   - Same structure as English for type safety

4. **`/src/i18n/locales/index.ts`** (16 lines)
   - Central export point
   - `locales: Record<Locale, Translations>`

5. **`/src/i18n/index.ts`** (107 lines)
   - Client-side `useTranslation()` hook
   - Parameter interpolation support: `{grade}`, `{count}`, etc.
   - Reads `NEXT_PUBLIC_LOCALE` environment variable
   - Nested key access: `t('examMenu.title')`
   - Fallback to key if translation missing

6. **`/src/i18n/server.ts`** (96 lines)
   - Server-side translation helpers for API routes
   - `getServerTranslation(locale?)` - returns translation function
   - `getServerTranslations(locale?)` - returns translations object
   - `translateServer(key, params?, locale?)` - one-off translation helper

**Environment Configuration**:
- `.env.local`: `NEXT_PUBLIC_LOCALE=en` (already existed)
- `.env.local.staging`: `NEXT_PUBLIC_LOCALE=fi` (added manually, not committed)
- `.env.local.production`: `NEXT_PUBLIC_LOCALE=en` (added manually, not committed)

**Git Commits**:
- Commit 23e5da3: "feat: Implement Phase 0 i18n infrastructure"
- Commit 4095ec9: "docs: Mark Phase 0 i18n as complete"

#### Verification Completed

✅ **Build Test**: `npm run build` passed with no TypeScript errors
✅ **Type Safety**: Full autocomplete support for all translation keys
✅ **Linting**: Only pre-existing warnings, no new issues
✅ **Structure**: All 6 files created with correct exports

#### What's Ready to Use

**Client-side (React components)**:
```typescript
import { useTranslation } from '@/i18n'

export function MyComponent() {
  const { t, locale } = useTranslation()

  return (
    <div>
      <h1>{t('examMenu.title')}</h1>
      <p>{t('examMenu.gradeInfo', { grade: 5, count: 15 })}</p>
    </div>
  )
}
```

**Server-side (API routes)**:
```typescript
import { getServerTranslation } from '@/i18n/server'

export async function POST(request: Request) {
  const t = getServerTranslation() // Reads NEXT_PUBLIC_LOCALE

  return Response.json({
    error: t('api.errors.userIdRequired')
  })
}
```

#### What's NOT Done Yet

❌ **No components migrated** - All UI still uses hardcoded strings
❌ **No API routes migrated** - Still using hardcoded Finnish error messages
❌ **No testing** - Infrastructure untested in actual components
❌ **No documentation** - README/CLAUDE.md not updated yet

#### Next Steps

**NEXT: Phase 1 - Critical API Error Messages** (6 hours estimated)
1. Task 1.1: Extract API error messages (2 hours)
2. Task 1.2: Update API routes with translations (3 hours)
3. Task 1.3: Test API error messages (1 hour)

**Key files to update**:
- `/src/app/api/mobile/exam-questions/route.ts` (lines 83, 118, 124, 154, 162, 170)
- `/src/app/api/exam/[id]/submit/route.ts`
- Other API routes with user-facing errors

---

## Overview

### Current State
- **Mixed languages**: Finnish and English scattered across codebase
- **Partial organization**: ~80% of UI text already in `/src/constants/exam-ui.ts`
- **Critical issues**:
  - API error messages hardcoded in Finnish
  - Shared exam page 100% in Finnish
  - Component inline text not centralized

### Goals
- **Phase 1**: Environment variable-based language switching (EN/FI)
- **Phase 2**: User-selectable language with persistence
- **Maintain**: Full backward compatibility during migration
- **Support**: Easy addition of new languages in future

### Affected Files (15 total)
- 6 page components
- 3 API routes (error messages)
- 2 constant files
- 4 new i18n files (to be created)

---

## Architecture Decisions

### ✅ Approved Approach

#### Translation File Structure
```
src/i18n/
├── index.ts                    # Main export, useTranslation hook
├── locales/
│   ├── en.ts                   # English translations
│   ├── fi.ts                   # Finnish translations
│   └── index.ts                # Locale exports
└── types.ts                    # TypeScript types
```

#### Translation Key Naming Convention
```typescript
// Nested structure by feature/page
{
  common: {},          // Shared across app (loading, errors, buttons)
  examMenu: {},        // /exam/[id] page
  examTaking: {},      // /exam/[id]/take page
  examAudio: {},       // /exam/[id]/audio page
  examGrading: {},     // /grading/[id] page
  sharedExam: {},      // /shared/exam/[share_id] page
  api: {}              // API error messages
}
```

#### Usage Pattern
```typescript
// Before
<h1>ExamGenie</h1>

// After
const { t } = useTranslation()
<h1>{t('examMenu.title')}</h1>

// With parameters
{t('examTaking.gradeInfo', { grade: 5, count: 15 })}
// Output: "Grade 5 • 15 questions"
```

### Environment Variable (Phase 1)
```bash
# .env.local
NEXT_PUBLIC_LOCALE=en  # or 'fi'
```

### User Preference (Phase 2)
- Store in localStorage: `examgenie_locale`
- Context provider: `LocaleProvider`
- Language selector component in header

---

## Task Breakdown

---

## ✅ **PHASE 0: Foundation Setup** [COMPLETED]

### Task 0.1: Create i18n Infrastructure ✅
**Priority**: Critical
**Estimated Time**: 2 hours
**Dependencies**: None

#### Subtasks
- [x] Create `/src/i18n/` directory structure
- [x] Create `/src/i18n/types.ts` with TypeScript types
- [x] Create `/src/i18n/locales/en.ts` (with full translations)
- [x] Create `/src/i18n/locales/fi.ts` (with full translations)
- [x] Create `/src/i18n/locales/index.ts` (exports)
- [x] Create `/src/i18n/index.ts` with `useTranslation` hook
- [x] Add `NEXT_PUBLIC_LOCALE=en` to `.env.local`
- [x] Add `NEXT_PUBLIC_LOCALE=fi` to `.env.local.staging`
- [x] Add `NEXT_PUBLIC_LOCALE=en` to `.env.local.production`

#### Acceptance Criteria
- [x] Directory structure exists
- [x] TypeScript types compile without errors
- [x] `useTranslation()` hook can be imported
- [x] Environment variables configured for all environments
- [x] Build verification completed successfully

#### Files Created
- `/src/i18n/types.ts`
- `/src/i18n/locales/en.ts`
- `/src/i18n/locales/fi.ts`
- `/src/i18n/locales/index.ts`
- `/src/i18n/index.ts`

---

### Task 0.2: Extract Existing Constants ✅
**Priority**: Critical
**Estimated Time**: 1 hour
**Dependencies**: Task 0.1

#### Subtasks
- [x] Copy all strings from `/src/constants/exam-ui.ts` to `en.ts`
- [x] Copy all strings from `/src/constants/help-content.ts` to `en.ts`
- [x] Translate all strings to Finnish in `fi.ts`
- [x] Maintain exact key structure for compatibility
- [x] Document any translation notes/context

#### Acceptance Criteria
- [x] All 87+ strings from `EXAM_UI` and `HELP_CONTENT` exist in both locale files
- [x] Keys match exactly between EN and FI
- [x] No missing translations
- [x] Translation quality reviewed

#### Files Modified
- `/src/i18n/locales/en.ts` (281 lines, comprehensive translations)
- `/src/i18n/locales/fi.ts` (284 lines, comprehensive translations)

---

## 🔴 **PHASE 1: Critical API Error Messages**

### Task 1.1: Extract API Error Messages
**Priority**: Critical (P1)
**Estimated Time**: 2 hours
**Dependencies**: Task 0.2

#### Subtasks
- [ ] Audit all API routes for user-facing error messages
- [ ] Document current Finnish errors in `/src/app/api/mobile/exam-questions/route.ts`:
  - Line 83: `'user_id tai student_id vaaditaan'`
  - Line 118: `'Päivittäinen koeraja saavutettu'`
  - Line 124: `'Voit luoda uuden kokeen...'`
- [ ] Add error messages to `en.ts` under `api.errors.*`
- [ ] Add error messages to `fi.ts` under `api.errors.*`
- [ ] Create helper function for API error translation

#### Error Message Inventory
```typescript
// From /src/app/api/mobile/exam-questions/route.ts
api: {
  errors: {
    userIdRequired: {
      en: "user_id or student_id required",
      fi: "user_id tai student_id vaaditaan"
    },
    rateLimitExceeded: {
      en: "Daily exam limit reached",
      fi: "Päivittäinen koeraja saavutettu"
    },
    rateLimitRetryAfter: {
      en: "You can create a new exam in {minutes} minutes.",
      fi: "Voit luoda uuden kokeen {minutes} minuutin kuluttua."
    },
    invalidCategory: {
      en: "Invalid category. Must be one of: mathematics, core_academics, language_studies",
      fi: "Virheellinen kategoria. Sallitut: mathematics, core_academics, language_studies"
    },
    invalidSubject: {
      en: "Invalid subject. Must be one of the supported Finnish subjects.",
      fi: "Virheellinen oppiaine. Käytä tuettuja suomalaisia oppiaineita."
    },
    invalidGrade: {
      en: "Invalid grade. Must be between 1 and 9.",
      fi: "Virheellinen luokka-aste. Tulee olla välillä 1-9."
    }
  }
}
```

#### Acceptance Criteria
- [ ] All API error messages identified and documented
- [ ] Both EN and FI translations added to locale files
- [ ] Helper function created for server-side translation
- [ ] No hardcoded error strings remain in API routes

#### Files Modified
- `/src/i18n/locales/en.ts`
- `/src/i18n/locales/fi.ts`
- `/src/i18n/server.ts` (new - server-side translation helper)

---

### Task 1.2: Update API Routes with Translations
**Priority**: Critical (P1)
**Estimated Time**: 3 hours
**Dependencies**: Task 1.1

#### Subtasks
- [ ] Update `/src/app/api/mobile/exam-questions/route.ts`
  - Replace line 83 error message
  - Replace line 118 error message
  - Replace line 124 error message
  - Replace validation error messages (lines 154, 162, 170)
- [ ] Update `/src/app/api/exam/[id]/submit/route.ts` (if has user-facing errors)
- [ ] Update `/src/app/api/exam/[id]/grade/route.ts` (if has user-facing errors)
- [ ] Update other API routes with user-facing messages
- [ ] Test error responses return correct language

#### Implementation Pattern
```typescript
// Before
return ApiResponseBuilder.validationError(
  'user_id tai student_id vaaditaan',
  'Rate limiting requires user identification',
  { requestId: processingId }
)

// After
import { getServerTranslation } from '@/i18n/server'

const t = getServerTranslation() // Reads NEXT_PUBLIC_LOCALE
return ApiResponseBuilder.validationError(
  t('api.errors.userIdRequired'),
  'Rate limiting requires user identification',
  { requestId: processingId }
)
```

#### Acceptance Criteria
- [ ] All API error messages use translation function
- [ ] Error messages display in correct language based on `NEXT_PUBLIC_LOCALE`
- [ ] No hardcoded Finnish/English strings in API routes
- [ ] Manual testing with both `en` and `fi` environment variables
- [ ] API response format unchanged (backward compatible)

#### Files Modified
- `/src/app/api/mobile/exam-questions/route.ts`
- `/src/app/api/exam/[id]/submit/route.ts`
- `/src/app/api/exam/[id]/grade/route.ts`
- `/src/app/api/mobile/exams/route.ts`
- `/src/app/api/students/route.ts`

---

### Task 1.3: Test API Error Messages
**Priority**: Critical (P1)
**Estimated Time**: 1 hour
**Dependencies**: Task 1.2

#### Subtasks
- [ ] Create test script for API error scenarios
- [ ] Test rate limit exceeded (429) in EN
- [ ] Test rate limit exceeded (429) in FI
- [ ] Test validation errors in EN
- [ ] Test validation errors in FI
- [ ] Verify error format unchanged
- [ ] Document test results

#### Test Scenarios
```bash
# Test with EN
NEXT_PUBLIC_LOCALE=en npm run dev
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@test.jpg"  # Missing student_id

# Expected: "user_id or student_id required"

# Test with FI
NEXT_PUBLIC_LOCALE=fi npm run dev
curl -X POST http://localhost:3001/api/mobile/exam-questions \
  -F "images=@test.jpg"  # Missing student_id

# Expected: "user_id tai student_id vaaditaan"
```

#### Acceptance Criteria
- [ ] All error messages display in correct language
- [ ] Rate limit errors tested in both languages
- [ ] Validation errors tested in both languages
- [ ] Mobile app compatibility verified (if accessible)
- [ ] Test results documented in `/LOCALIZATION_TEST_RESULTS.md`

---

## 🔴 **PHASE 2: Shared Exam Page (100% Finnish)**

### Task 2.1: Extract Shared Exam Strings
**Priority**: High (P2)
**Estimated Time**: 2 hours
**Dependencies**: Task 0.2

#### Subtasks
- [ ] Audit `/src/app/shared/exam/[share_id]/page.tsx`
- [ ] Extract all 30+ Finnish strings
- [ ] Organize into `sharedExam.*` namespace
- [ ] Keep existing Finnish as FI translations
- [ ] Create English translations
- [ ] Handle print-specific strings

#### String Inventory (30+ strings)
```typescript
sharedExam: {
  // Loading states
  loading: "Loading exam..." / "Ladataan koetta...",
  notFound: "Exam not found" / "Koetta ei löytynyt",
  notFoundDetails: "Check the link or contact..." / "Tarkista että linkki...",

  // Page header
  title: "Shared exam" / "Jaettu koe",
  publicView: "Public view" / "Julkinen näkymä",
  print: "Print" / "Tulosta",

  // Exam metadata
  studentName: "Student's name:" / "Oppilaan nimi:",
  created: "Created:" / "Luotu:",
  questions: "Questions:" / "Kysymyksiä:",
  totalPoints: "Total points:" / "Pisteitä yhteensä:",
  examId: "Exam ID:" / "Koe-ID:",

  // Instructions
  instructions: "Instructions" / "Ohjeet",
  instruction1: "Read each question carefully" / "Lue jokainen kysymys huolellisesti",
  instruction2: "Answer all questions" / "Vastaa kaikkiin kysymyksiin",
  instruction3: "For multiple choice..." / "Monivalintakysymyksissä valitse...",
  instruction4: "Write answers clearly" / "Kirjoita vastaukset selkeästi",

  // Questions
  answerPlaceholder: "Write your answer here..." / "Kirjoita vastauksesi tähän...",
  points: "{points} p",

  // Footer
  createdWith: "Created with" / "Luotu",
  appName: "ExamGenie",
  application: "application" / "sovelluksella",

  // Print header
  printHeader: "ExamGenie",
  printSubheader: "Automatically generated exam" / "Automaattisesti luotu koe"
}
```

#### Acceptance Criteria
- [ ] All strings extracted from shared exam page
- [ ] English translations completed
- [ ] Finnish translations preserved
- [ ] String keys follow naming convention
- [ ] Parameter placeholders identified (e.g., `{grade}`, `{points}`)

#### Files Modified
- `/src/i18n/locales/en.ts`
- `/src/i18n/locales/fi.ts`

---

### Task 2.2: Update Shared Exam Page Component
**Priority**: High (P2)
**Estimated Time**: 3 hours
**Dependencies**: Task 2.1

#### Subtasks
- [ ] Import `useTranslation` hook
- [ ] Replace all hardcoded strings with `t()` calls
- [ ] Update format strings with parameters
- [ ] Test date formatting (locale-aware)
- [ ] Verify print functionality works
- [ ] Test Tailwind classes not affected

#### Implementation Examples
```typescript
// Before
<p className="text-gray-600">Ladataan koetta...</p>

// After
const { t } = useTranslation()
<p className="text-gray-600">{t('sharedExam.loading')}</p>

// Before
<h2 className="text-xl font-semibold">
  {exam.subject} - {exam.grade}. luokka
</h2>

// After
<h2 className="text-xl font-semibold">
  {exam.subject} - {t('sharedExam.gradeLabel', { grade: exam.grade })}
</h2>
```

#### Acceptance Criteria
- [ ] No hardcoded Finnish strings remain
- [ ] All text renders correctly in EN
- [ ] All text renders correctly in FI
- [ ] Print functionality works in both languages
- [ ] Date formatting respects locale
- [ ] Manual testing completed in both languages

#### Files Modified
- `/src/app/shared/exam/[share_id]/page.tsx`

---

### Task 2.3: Test Shared Exam Page
**Priority**: High (P2)
**Estimated Time**: 1 hour
**Dependencies**: Task 2.2

#### Subtasks
- [ ] Test shared exam loading in EN
- [ ] Test shared exam loading in FI
- [ ] Test error states in both languages
- [ ] Test print preview in both languages
- [ ] Test on mobile viewport
- [ ] Verify no layout breaks
- [ ] Screenshot comparison EN vs FI

#### Test Scenarios
1. Load valid shared exam URL with EN locale
2. Load valid shared exam URL with FI locale
3. Load invalid shared exam URL in EN
4. Load invalid shared exam URL in FI
5. Print preview in EN
6. Print preview in FI
7. Mobile responsive in both languages

#### Acceptance Criteria
- [ ] All scenarios pass
- [ ] No console errors
- [ ] Layouts identical between languages
- [ ] Print output readable in both languages
- [ ] Screenshots documented

---

## 🟡 **PHASE 3: Main App Pages**

### Task 3.1: Extract Exam Menu Page Strings
**Priority**: Medium (P3)
**Estimated Time**: 2 hours
**Dependencies**: Task 0.2

#### Subtasks
- [ ] Audit `/src/app/exam/[id]/page.tsx`
- [ ] Extract ~25 inline strings
- [ ] Add to `examMenu.*` namespace
- [ ] Translate to Finnish
- [ ] Handle dynamic content (grade, question count)
- [ ] Handle reward badges and status labels

#### String Inventory
```typescript
examMenu: {
  title: "ExamGenie",
  genieDollars: "Genie Dollars",

  // Cards
  audio: "Audio",
  exam: "Exam",
  results: "Results",
  retake: "Retake",
  mistakes: "Mistakes",
  ranking: "Ranking",

  // Status badges
  na: "N/A",
  pending: "Pending",
  view: "View",
  perfect: "Perfect!",
  soon: "Soon",
  checkmark: "✓",

  // Metadata
  gradeInfo: "Grade {grade} • {count} questions",
  questionsCount: "{count} Q",
  rewardAmount: "+{amount}",

  // Loading/errors
  loadFailed: "Failed to load exam",
  // ... (reuse common strings)
}
```

#### Acceptance Criteria
- [ ] All inline strings extracted
- [ ] Finnish translations added
- [ ] Dynamic parameters identified
- [ ] Reward badge labels translated

#### Files Modified
- `/src/i18n/locales/en.ts`
- `/src/i18n/locales/fi.ts`

---

### Task 3.2: Update Exam Menu Page Component
**Priority**: Medium (P3)
**Estimated Time**: 3 hours
**Dependencies**: Task 3.1

#### Subtasks
- [ ] Import `useTranslation` hook
- [ ] Replace header strings (title, Genie Dollars)
- [ ] Replace card labels (Audio, Exam, Results, etc.)
- [ ] Replace status badges (Pending, View, Perfect!, etc.)
- [ ] Replace metadata strings (Grade X • Y questions)
- [ ] Test dynamic content rendering
- [ ] Verify layout responsive to text length

#### Acceptance Criteria
- [ ] All hardcoded strings replaced
- [ ] Dynamic content renders correctly
- [ ] Layout adapts to longer translations
- [ ] Grid layout not broken
- [ ] Manual testing in both languages

#### Files Modified
- `/src/app/exam/[id]/page.tsx`

---

### Task 3.3: Extract Exam Taking Page Strings
**Priority**: Medium (P3)
**Estimated Time**: 2 hours
**Dependencies**: Task 0.2

#### Subtasks
- [ ] Audit `/src/app/exam/[id]/take/page.tsx`
- [ ] Extract ~15 inline strings
- [ ] Add to `examTaking.*` namespace
- [ ] Translate to Finnish
- [ ] Handle KaTeX math content (keep untranslated)

#### String Inventory
```typescript
examTaking: {
  title: "Take exam",
  gradeInfo: "Grade {grade} • {count} questions",
  questionNumber: "{current} / {total}",
  backToMenu: "Back to menu",

  // Buttons (can reuse common)
  previous: "Previous",
  next: "Next",
  submit: "Submit",
  cancel: "Cancel",

  // Confirmation
  confirmSubmit: "Confirm submit?",
  submitWarning: "Submit answers? Cannot undo.",
  sending: "Sending...",

  // Review mode
  noResults: "No results",
  notGradedDesc: "This exam has not been graded yet.",
  start: "Start",

  // Answer labels
  yourAnswer: "Your answer...",
  true: "True",
  false: "False"
}
```

#### Acceptance Criteria
- [ ] All inline strings extracted
- [ ] Finnish translations added
- [ ] Math content exclusions noted
- [ ] Navigation labels translated

#### Files Modified
- `/src/i18n/locales/en.ts`
- `/src/i18n/locales/fi.ts`

---

### Task 3.4: Update Exam Taking Page Component
**Priority**: Medium (P3)
**Estimated Time**: 3 hours
**Dependencies**: Task 3.3

#### Subtasks
- [ ] Import `useTranslation` hook
- [ ] Replace page title
- [ ] Replace navigation buttons
- [ ] Replace confirmation dialog text
- [ ] Replace form labels
- [ ] Test question navigation
- [ ] Test answer submission flow
- [ ] Verify KaTeX rendering unaffected

#### Acceptance Criteria
- [ ] All hardcoded strings replaced
- [ ] Navigation works in both languages
- [ ] Confirmation dialog displays correctly
- [ ] LaTeX math renders correctly (unchanged)
- [ ] Manual testing of full exam flow

#### Files Modified
- `/src/app/exam/[id]/take/page.tsx`

---

### Task 3.5: Extract Audio Page Strings
**Priority**: Medium (P3)
**Estimated Time**: 1.5 hours
**Dependencies**: Task 0.2

#### Subtasks
- [ ] Audit `/src/app/exam/[id]/audio/page.tsx`
- [ ] Extract ~10 inline strings
- [ ] Add to `examAudio.*` namespace
- [ ] Translate to Finnish
- [ ] Handle time formatting

#### String Inventory
```typescript
examAudio: {
  title: "Audio Summary",
  gradeInfo: "Grade {grade} • Audio overview",
  backToMenu: "Back to Menu",
  summaryText: "Summary Text",

  // Player controls
  play: "Play",
  pause: "Pause",

  // Metadata
  duration: "Duration:",
  words: "{count} words",
  language: "{language}",

  // Rewards
  earnedReward: "🎉 You earned {amount} Genie Dollars! 💵",
  listenThreshold: "⏰ Listen to at least {percent}% to earn Genie Dollars",

  // Errors
  audioNotAvailable: "Audio summary not available for this exam"
}
```

#### Acceptance Criteria
- [ ] All inline strings extracted
- [ ] Finnish translations added
- [ ] Time format considerations noted
- [ ] Reward messages translated

#### Files Modified
- `/src/i18n/locales/en.ts`
- `/src/i18n/locales/fi.ts`

---

### Task 3.6: Update Audio Page Component
**Priority**: Medium (P3)
**Estimated Time**: 2 hours
**Dependencies**: Task 3.5

#### Subtasks
- [ ] Import `useTranslation` hook
- [ ] Replace page title and header
- [ ] Replace player control labels
- [ ] Replace metadata labels
- [ ] Replace reward messages
- [ ] Test audio playback
- [ ] Test reward calculation
- [ ] Verify celebration message timing

#### Acceptance Criteria
- [ ] All hardcoded strings replaced
- [ ] Audio playback works
- [ ] Reward messages display correctly
- [ ] Time formatting consistent
- [ ] Manual testing in both languages

#### Files Modified
- `/src/app/exam/[id]/audio/page.tsx`

---

### Task 3.7: Extract Grading Page Strings
**Priority**: Medium (P3)
**Estimated Time**: 1.5 hours
**Dependencies**: Task 0.2

#### Subtasks
- [ ] Audit `/src/app/grading/[id]/page.tsx`
- [ ] Extract ~5 inline strings
- [ ] Add to `examGrading.*` namespace
- [ ] Translate to Finnish
- [ ] Reuse common strings where possible

#### String Inventory
```typescript
examGrading: {
  title: "ExamGenie",
  backToMenu: "Back to Menu",
  printResults: "Print",
  newExam: "New exam",

  // Results display (mostly uses EXAM_UI constants)
  // These may already be covered in common
}
```

#### Acceptance Criteria
- [ ] All inline strings extracted
- [ ] Finnish translations added
- [ ] Common string reuse maximized
- [ ] Print functionality considered

#### Files Modified
- `/src/i18n/locales/en.ts`
- `/src/i18n/locales/fi.ts`

---

### Task 3.8: Update Grading Page Component
**Priority**: Medium (P3)
**Estimated Time**: 2 hours
**Dependencies**: Task 3.7

#### Subtasks
- [ ] Import `useTranslation` hook
- [ ] Replace page header
- [ ] Replace action button labels
- [ ] Test print functionality
- [ ] Verify grade display formatting
- [ ] Test question breakdown display

#### Acceptance Criteria
- [ ] All hardcoded strings replaced
- [ ] Print output correct in both languages
- [ ] Grade calculations unaffected
- [ ] Manual testing completed

#### Files Modified
- `/src/app/grading/[id]/page.tsx`

---

### Task 3.9: Update Home Page
**Priority**: Low (P3)
**Estimated Time**: 30 minutes
**Dependencies**: Task 0.2

#### Subtasks
- [ ] Audit `/src/app/page.tsx`
- [ ] Replace "ExamGenie" with translated version (if needed)
- [ ] Test home page display

#### Acceptance Criteria
- [ ] Home page displays correctly
- [ ] Logo/branding consistent

#### Files Modified
- `/src/app/page.tsx`

---

## 🟢 **PHASE 4: Quality Assurance**

### Task 4.1: Translation Quality Review
**Priority**: Medium
**Estimated Time**: 3 hours
**Dependencies**: All previous tasks

#### Subtasks
- [ ] Review all English translations for clarity
- [ ] Review all Finnish translations for accuracy
- [ ] Check for consistency in terminology
- [ ] Verify context-appropriate translations
- [ ] Fix any awkward phrasings
- [ ] Ensure professional tone throughout
- [ ] Get native speaker review (if available)

#### Review Checklist
- [ ] Technical terms consistent (e.g., "exam" vs "test")
- [ ] Formal vs informal tone appropriate
- [ ] Button labels concise (fit in UI)
- [ ] Error messages clear and actionable
- [ ] Educational context appropriate
- [ ] No machine translation artifacts

#### Acceptance Criteria
- [ ] All translations reviewed
- [ ] Issues documented and fixed
- [ ] Native speaker approval (if possible)
- [ ] Terminology glossary created

---

### Task 4.2: Comprehensive Testing
**Priority**: High
**Estimated Time**: 4 hours
**Dependencies**: All translation tasks

#### Subtasks
- [ ] Create test matrix (all pages × both languages)
- [ ] Test all pages in English
- [ ] Test all pages in Finnish
- [ ] Test all API endpoints in English
- [ ] Test all API endpoints in Finnish
- [ ] Test error scenarios in both languages
- [ ] Test on mobile devices
- [ ] Test print functionality
- [ ] Test with long text (UI overflow)
- [ ] Test with screen readers (accessibility)

#### Test Matrix
| Page/Feature | EN | FI | Mobile EN | Mobile FI | Print EN | Print FI |
|--------------|----|----|-----------|-----------|----------|----------|
| Home         | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Exam Menu    | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Take Exam    | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Audio        | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Grading      | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| Shared Exam  | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| API Errors   | [ ] | [ ] | [ ] | [ ] | N/A | N/A |

#### Acceptance Criteria
- [ ] All test matrix cells passed
- [ ] No visual bugs
- [ ] No console errors
- [ ] Performance unchanged
- [ ] Accessibility maintained

---

### Task 4.3: Documentation Update
**Priority**: Medium
**Estimated Time**: 2 hours
**Dependencies**: Task 4.2

#### Subtasks
- [ ] Update README.md with localization info
- [ ] Update CLAUDE.md with translation guidelines
- [ ] Create `/docs/LOCALIZATION.md` guide
- [ ] Document how to add new languages
- [ ] Document translation file structure
- [ ] Add examples for developers
- [ ] Update environment variable documentation

#### Documentation Sections
```markdown
# LOCALIZATION.md

1. Overview
2. Supported Languages
3. Changing Language (Environment Variable)
4. Adding New Language
5. Translation Key Conventions
6. Using useTranslation Hook
7. Server-Side Translation
8. Testing Translations
9. Common Issues & Solutions
```

#### Acceptance Criteria
- [ ] All documentation updated
- [ ] Examples clear and tested
- [ ] New developer can add language easily
- [ ] CLAUDE.md reflects new architecture

#### Files Modified
- `/README.md`
- `/CLAUDE.md`
- `/docs/LOCALIZATION.md` (new)

---

### Task 4.4: Deprecate Old Constants
**Priority**: Low
**Estimated Time**: 1 hour
**Dependencies**: All previous tasks

#### Subtasks
- [ ] Add deprecation notice to `/src/constants/exam-ui.ts`
- [ ] Ensure no components still use `EXAM_UI` directly
- [ ] Add migration guide in code comments
- [ ] Plan for eventual removal (not in Phase 1)

#### Implementation
```typescript
// /src/constants/exam-ui.ts
/**
 * @deprecated This file is deprecated in favor of the new i18n system.
 * Use `useTranslation()` hook instead.
 *
 * Migration guide:
 * - Old: EXAM_UI.LOADING
 * - New: t('common.loading')
 *
 * This file will be removed in a future version.
 */
export const EXAM_UI = {
  // ... existing constants
}
```

#### Acceptance Criteria
- [ ] Deprecation notice added
- [ ] No components use old constants
- [ ] Migration guide clear
- [ ] Backward compatibility maintained

---

## 🚀 **PHASE 5: User-Selectable Language (Future)**

### Task 5.1: Create Language Context Provider
**Priority**: Future Enhancement
**Estimated Time**: 3 hours
**Dependencies**: Phase 1-4 complete

#### Subtasks
- [ ] Create `/src/contexts/LocaleContext.tsx`
- [ ] Implement localStorage persistence
- [ ] Update `useTranslation` to use context
- [ ] Add language change handler
- [ ] Test context propagation

#### Implementation
```typescript
// /src/contexts/LocaleContext.tsx
export const LocaleProvider = ({ children }) => {
  const [locale, setLocale] = useState<Locale>('en')

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('examgenie_locale')
    if (saved) setLocale(saved as Locale)
  }, [])

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale)
    localStorage.setItem('examgenie_locale', newLocale)
  }

  return (
    <LocaleContext.Provider value={{ locale, changeLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}
```

#### Acceptance Criteria
- [ ] Context provider created
- [ ] localStorage integration works
- [ ] Language persists across sessions
- [ ] No performance issues

---

### Task 5.2: Create Language Selector Component
**Priority**: Future Enhancement
**Estimated Time**: 2 hours
**Dependencies**: Task 5.1

#### Subtasks
- [ ] Create `/src/components/LanguageSelector.tsx`
- [ ] Design dropdown/toggle UI
- [ ] Add flag/language name display
- [ ] Test language switching
- [ ] Add to exam menu header

#### Design Options
- Dropdown in header
- Flag icons
- Current: EN | Switch to: FI
- Accessible keyboard navigation

#### Acceptance Criteria
- [ ] Component created
- [ ] UI matches design tokens
- [ ] Language switches instantly
- [ ] No page reload required
- [ ] Accessible

---

### Task 5.3: Database Integration (Optional)
**Priority**: Future Enhancement
**Estimated Time**: 4 hours
**Dependencies**: Task 5.2

#### Subtasks
- [ ] Add `locale` column to `students` table
- [ ] Update student profile API
- [ ] Sync localStorage with database
- [ ] Handle mobile app language preference
- [ ] Migration script for existing users

#### Database Schema
```sql
ALTER TABLE students
ADD COLUMN locale VARCHAR(5) DEFAULT 'en';

CREATE INDEX idx_students_locale ON students(locale);
```

#### Acceptance Criteria
- [ ] Database schema updated
- [ ] API returns user locale
- [ ] Mobile app can set locale
- [ ] Existing users default to 'en'

---

## Testing Strategy

### Unit Tests
- [ ] `useTranslation` hook returns correct strings
- [ ] Parameter interpolation works (`{grade}`, `{count}`)
- [ ] Fallback to key if translation missing
- [ ] Server-side translation function works

### Integration Tests
- [ ] API error messages in correct language
- [ ] Page components render in correct language
- [ ] Language switching updates all text
- [ ] Print output in correct language

### E2E Tests
- [ ] Full exam flow in English
- [ ] Full exam flow in Finnish
- [ ] Language persistence across sessions
- [ ] Mobile app integration (if accessible)

### Manual Testing
- [ ] Visual regression testing (screenshots)
- [ ] Mobile device testing (iOS, Android)
- [ ] Print preview testing
- [ ] Screen reader testing
- [ ] Long text overflow testing

### Test Environments
- [ ] Localhost (development)
- [ ] Staging (exam-generator-staging.vercel.app)
- [ ] Production (examgenie.app)

---

## Timeline & Estimates

### Phase 0: Foundation Setup
**Total Time**: 3 hours
- Task 0.1: 2 hours
- Task 0.2: 1 hour

### Phase 1: Critical API Errors
**Total Time**: 6 hours
- Task 1.1: 2 hours
- Task 1.2: 3 hours
- Task 1.3: 1 hour

### Phase 2: Shared Exam Page
**Total Time**: 6 hours
- Task 2.1: 2 hours
- Task 2.2: 3 hours
- Task 2.3: 1 hour

### Phase 3: Main App Pages
**Total Time**: 16.5 hours
- Task 3.1: 2 hours
- Task 3.2: 3 hours
- Task 3.3: 2 hours
- Task 3.4: 3 hours
- Task 3.5: 1.5 hours
- Task 3.6: 2 hours
- Task 3.7: 1.5 hours
- Task 3.8: 2 hours
- Task 3.9: 0.5 hours

### Phase 4: Quality Assurance
**Total Time**: 10 hours
- Task 4.1: 3 hours
- Task 4.2: 4 hours
- Task 4.3: 2 hours
- Task 4.4: 1 hour

### Phase 5: User-Selectable Language (Future)
**Total Time**: 9 hours
- Task 5.1: 3 hours
- Task 5.2: 2 hours
- Task 5.3: 4 hours

### **TOTAL PHASE 1-4**: ~41.5 hours
### **TOTAL WITH PHASE 5**: ~50.5 hours

### Recommended Schedule
- **Week 1**: Phase 0 + Phase 1 (API errors) - 9 hours
- **Week 2**: Phase 2 (Shared exam) + Start Phase 3 - 10 hours
- **Week 3**: Complete Phase 3 (Main pages) - 10.5 hours
- **Week 4**: Phase 4 (QA & Documentation) - 10 hours
- **Week 5+**: Phase 5 (User-selectable, optional) - 9 hours

---

## Success Criteria

### Phase 1-4 Complete When:
- [ ] All user-facing text extracted to translation files
- [ ] Both English and Finnish translations complete
- [ ] All pages render correctly in both languages
- [ ] All API errors return correct language
- [ ] No hardcoded strings remain
- [ ] Environment variable controls language
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Staging deployment tested
- [ ] Production deployment successful

### Quality Metrics
- [ ] 100% translation coverage (no missing keys)
- [ ] 0 hardcoded user-facing strings
- [ ] Build passes with no TypeScript errors
- [ ] No console errors in production
- [ ] Performance unchanged (Lighthouse scores)
- [ ] Mobile app compatibility maintained
- [ ] Accessibility scores maintained (WCAG AA)

### Phase 5 Complete When:
- [ ] User can select language in UI
- [ ] Language preference persists
- [ ] Optional: Language saved to database
- [ ] Optional: Mobile app can set language

---

## Risk Mitigation

### Risk 1: Translation Quality
**Mitigation**: Get native Finnish speaker to review before production

### Risk 2: Layout Breaking
**Mitigation**: Test with longest translations early, add CSS `overflow-wrap`

### Risk 3: Mobile App Compatibility
**Mitigation**: Maintain API response format, add language header

### Risk 4: Performance Impact
**Mitigation**: Translation object is static, no runtime overhead

### Risk 5: Incomplete Migration
**Mitigation**: Comprehensive audit, grep for remaining hardcoded strings

---

## Notes & Considerations

### Translation Guidelines
1. Keep button labels short (max 15 chars)
2. Error messages should be actionable
3. Use formal tone for Finnish (not casual)
4. Maintain consistency in terminology
5. Test with longest expected text

### Technical Decisions
- Use nested key structure (e.g., `examMenu.audio`)
- Server-side translation for API responses
- Client-side translation for React components
- TypeScript for type safety
- No external translation libraries (keep simple)

### Future Enhancements (Beyond Phase 5)
- Swedish language support (common in Finland)
- German language support
- Automatic language detection from browser
- Per-question language (multilingual exams)
- Right-to-left language support (Arabic, Hebrew)
- Pluralization rules (e.g., "1 question" vs "2 questions")
- Date/time localization (fi-FI, en-US formats)
- Number formatting (1,000 vs 1 000)

### Maintenance
- Add new strings to EN first, then translate
- Document context for translators
- Review translations quarterly
- Update documentation when adding languages

---

## Questions for Review

1. **Scope**: Should we include Phase 5 (user-selectable) in initial implementation?
2. **Priority**: Do you agree with P1 (API) → P2 (Shared) → P3 (Main) priority order?
3. **Translation**: Do you have access to a native Finnish speaker for review?
4. **Testing**: Should we add automated E2E tests or manual testing sufficient?
5. **Timeline**: Is ~4 weeks for Phase 1-4 acceptable?
6. **Rollout**: Phased rollout (staging first) or all at once?
7. **Backward Compatibility**: Keep old `EXAM_UI` constants or remove immediately?
8. **Mobile App**: Does mobile app need to be updated simultaneously?

---

## Approval Checklist

- [ ] Task breakdown reviewed and approved
- [ ] Timeline acceptable
- [ ] Priority order confirmed
- [ ] Architecture approved
- [ ] Questions answered
- [ ] Ready to begin implementation

---

**Document Version**: 1.0
**Last Updated**: 2025-10-17
**Status**: Awaiting Review
