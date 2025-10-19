# 🌍 ExamGenie Localization Implementation Checklist

**Status**: In Progress 🚧
**Started**: 2025-10-17
**Current Phase**: Phase 0 - Foundation Setup

---

## 📋 Quick Status Overview

| Phase | Status | Progress | Time Estimate |
|-------|--------|----------|---------------|
| Phase 0: Foundation | ✅ Complete | 7/7 tasks | 8 hours |
| Phase 1: API Errors | ⏳ Not Started | 0/3 tasks | 6 hours |
| Phase 2: Shared Exam | ⏳ Not Started | 0/3 tasks | 6 hours |
| Phase 3: Main Pages | ⏳ Not Started | 0/9 tasks | 16.5 hours |
| Phase 4: QA & Docs | ⏳ Not Started | 0/5 tasks | 12 hours |
| **Total Progress** | **27%** | **7/26 tasks** | **48.5 hours** |

---

## 🔴 PHASE 0: Foundation Setup (8 hours)

### ✅ Task 0.1: Create i18n Infrastructure
**Priority**: Critical
**Time**: 2 hours
**Status**: ✅ Completed

#### Subtasks
- [x] Create `/src/i18n/` directory
- [x] Create `/src/i18n/types.ts` with base types
- [x] Create `/src/i18n/locales/en.ts` skeleton
- [x] Create `/src/i18n/locales/fi.ts` skeleton
- [x] Create `/src/i18n/locales/index.ts` exports
- [x] Create `/src/i18n/index.ts` with `useTranslation` hook
- [x] Add fallback logic to hook (EN → key)
- [x] Test hook can be imported
- [x] Add `NEXT_PUBLIC_LOCALE=en` to `.env.local`
- [x] Add `NEXT_PUBLIC_LOCALE=fi` to `.env.local.staging` (if exists)
- [x] Add `NEXT_PUBLIC_LOCALE=en` to `.env.local.production` (if exists)

#### Acceptance Criteria
- [x] Directory structure exists
- [x] All files created and compile without errors
- [x] Hook returns translation function
- [x] Fallback logic prevents crashes on missing keys
- [x] Environment variables configured

#### Files to Create
```
/src/i18n/types.ts
/src/i18n/locales/en.ts
/src/i18n/locales/fi.ts
/src/i18n/locales/index.ts
/src/i18n/index.ts
```

---

### ✅ Task 0.2: Extract Existing Constants
**Priority**: Critical
**Time**: 1 hour
**Status**: ✅ Completed

#### Subtasks
- [x] Review all strings in `/src/constants/exam-ui.ts`
- [x] Copy all 87 strings to `en.ts` under `common.*` namespace
- [x] Organize into logical groups (loading, errors, navigation, etc.)
- [x] Translate all strings to Finnish in `fi.ts`
- [x] Verify key structure matches between EN and FI
- [x] Document any translation notes/context
- [x] Test importing from locale files

#### Acceptance Criteria
- [x] All EXAM_UI strings exist in both locale files (83 keys validated)
- [x] Keys match exactly between EN and FI
- [x] No missing translations
- [x] Translations make sense in context
- [x] No TypeScript compilation errors

#### Files to Modify
```
/src/i18n/locales/en.ts (add common.*)
/src/i18n/locales/fi.ts (add common.*)
```

---

### ✅ Task 0.3: Implement Type-Safe Translation Keys (NEW)
**Priority**: Critical
**Time**: 1.5 hours
**Status**: ✅ Completed

#### Subtasks
- [x] Update `/src/i18n/types.ts` with type-safe definitions
- [x] Use `as const` for literal typing in locale files
- [x] Create `TranslationKeys` type from EN locale
- [x] Update `useTranslation` hook to use typed keys
- [x] Test TypeScript catches invalid keys
- [x] Add JSDoc comments explaining type system
- [x] Verify autocomplete works in IDE

#### Implementation
```typescript
// /src/i18n/types.ts
import type { en } from './locales/en'

export type Locale = 'en' | 'fi'
export type TranslationKeys = typeof en
export type DeepKeyOf<T> = {
  [K in keyof T]: T[K] extends object
    ? `${K & string}.${DeepKeyOf<T[K]> & string}`
    : K
}[keyof T]

export type TranslationKey = DeepKeyOf<TranslationKeys>
```

#### Acceptance Criteria
- [ ] TypeScript autocomplete shows available keys
- [ ] Invalid keys produce compile errors
- [ ] Type inference works for nested keys
- [ ] No impact on runtime performance
- [ ] Documentation explains type system

#### Files to Modify
```
/src/i18n/types.ts
/src/i18n/index.ts
/src/i18n/locales/en.ts (add 'as const')
/src/i18n/locales/fi.ts (add 'as const')
```

---

### ✅ Task 0.4: Create CI Validation Script (NEW)
**Priority**: Critical
**Time**: 1 hour
**Status**: ✅ Completed

#### Subtasks
- [x] Create `/scripts/validate-locales.ts`
- [x] Implement recursive key comparison algorithm
- [x] Check EN keys exist in FI
- [x] Check FI keys exist in EN (no extras)
- [x] Report missing/extra keys clearly
- [x] Add script to `package.json`
- [x] Test script with intentional mismatch
- [x] Fix any mismatches found
- [x] Add to prebuild hook (optional)

#### Implementation
```typescript
// /scripts/validate-locales.ts
import { en } from '../src/i18n/locales/en'
import { fi } from '../src/i18n/locales/fi'

function getKeys(obj: any, prefix = ''): string[] {
  return Object.keys(obj).flatMap(key => {
    const value = obj[key]
    const fullKey = prefix ? `${prefix}.${key}` : key
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? getKeys(value, fullKey)
      : [fullKey]
  })
}

const enKeys = getKeys(en).sort()
const fiKeys = getKeys(fi).sort()

const missingInFi = enKeys.filter(k => !fiKeys.includes(k))
const extraInFi = fiKeys.filter(k => !enKeys.includes(k))

if (missingInFi.length || extraInFi.length) {
  console.error('❌ Translation structure mismatch!\n')
  if (missingInFi.length) {
    console.error('Missing in Finnish:', missingInFi.join(', '))
  }
  if (extraInFi.length) {
    console.error('Extra in Finnish:', extraInFi.join(', '))
  }
  process.exit(1)
}

console.log('✅ All translations match!')
console.log(`   Total keys: ${enKeys.length}`)
```

#### Acceptance Criteria
- [ ] Script runs successfully
- [ ] Detects missing keys in FI
- [ ] Detects extra keys in FI
- [ ] Clear error messages
- [ ] Exit code 1 on failure, 0 on success
- [ ] Can be run via npm script

#### Files to Create
```
/scripts/validate-locales.ts
```

#### Files to Modify
```
package.json (add "test:i18n" script)
```

---

### ✅ Task 0.5: Create Formatting Utilities (NEW)
**Priority**: High
**Time**: 1 hour
**Status**: ✅ Completed

#### Subtasks
- [x] Create `/src/i18n/utils.ts`
- [x] Implement `formatDate()` with Intl.DateTimeFormat
- [x] Implement `formatNumber()` with Intl.NumberFormat
- [x] Implement `formatCurrency()` (optional)
- [x] Add locale parameter to all functions
- [x] Test with EN locale (MM/DD/YYYY, 1,000)
- [x] Test with FI locale (DD.MM.YYYY, 1 000)
- [x] Add JSDoc documentation with examples
- [x] Export all utilities from utils.ts

#### Implementation
```typescript
// /src/i18n/utils.ts
import type { Locale } from './types'

/**
 * Format date according to locale
 * @example formatDate(new Date(), 'en') // "Oct 17, 2025"
 * @example formatDate(new Date(), 'fi') // "17. lokak. 2025"
 */
export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(
    locale === 'fi' ? 'fi-FI' : 'en-US',
    { dateStyle: 'medium' }
  ).format(date)
}

/**
 * Format number according to locale
 * @example formatNumber(1000, 'en') // "1,000"
 * @example formatNumber(1000, 'fi') // "1 000"
 */
export function formatNumber(num: number, locale: Locale): string {
  return new Intl.NumberFormat(
    locale === 'fi' ? 'fi-FI' : 'en-US'
  ).format(num)
}

/**
 * Format currency according to locale
 * @example formatCurrency(9.99, 'en') // "$9.99"
 * @example formatCurrency(9.99, 'fi') // "9,99 €"
 */
export function formatCurrency(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(
    locale === 'fi' ? 'fi-FI' : 'en-US',
    {
      style: 'currency',
      currency: locale === 'fi' ? 'EUR' : 'USD'
    }
  ).format(amount)
}
```

#### Acceptance Criteria
- [ ] All functions implemented
- [ ] Correct locale formats for EN
- [ ] Correct locale formats for FI
- [ ] TypeScript types correct
- [ ] JSDoc documentation complete
- [ ] Functions can be imported and used

#### Files to Create
```
/src/i18n/utils.ts
```

---

### ✅ Task 0.6: Implement Pluralization Helper (NEW)
**Priority**: High
**Time**: 1.5 hours
**Status**: ✅ Completed

#### Subtasks
- [x] Add pluralization to `/src/i18n/utils.ts`
- [x] Implement simple `plural()` function
- [x] Implement object-based `pluralize()` function
- [x] Add plural forms to translation keys structure
- [x] Update `useTranslation` to support plural keys
- [x] Test with count=1 (singular)
- [x] Test with count>1 (plural)
- [x] Add examples to documentation

#### Implementation
```typescript
// Add to /src/i18n/utils.ts

/**
 * Simple pluralization
 * @example plural(1, 'question', 'questions') // "question"
 * @example plural(5, 'question', 'questions') // "questions"
 */
export function plural(
  count: number,
  singular: string,
  plural: string
): string {
  return count === 1 ? singular : plural
}

/**
 * Object-based pluralization with count interpolation
 * @example
 * const forms = { one: '{count} question', other: '{count} questions' }
 * pluralize(1, forms) // "1 question"
 * pluralize(5, forms) // "5 questions"
 */
export function pluralize(
  count: number,
  forms: { one: string; other: string }
): string {
  const template = count === 1 ? forms.one : forms.other
  return template.replace('{count}', String(count))
}
```

#### Translation Key Structure
```typescript
// Example in locale files
examMenu: {
  questionsCount: {
    one: '{count} question',
    other: '{count} questions'
  }
}
```

#### Acceptance Criteria
- [ ] Both functions implemented
- [ ] Count interpolation works
- [ ] Translation keys support plural objects
- [ ] Examples added to docs
- [ ] Works with both EN and FI

#### Files to Modify
```
/src/i18n/utils.ts (add pluralization)
/src/i18n/locales/en.ts (add example plural keys)
/src/i18n/locales/fi.ts (add example plural keys)
```

---

### ✅ Task 0.7: Create Server-Side Translation Helper
**Priority**: Critical
**Time**: Included in Task 0.1
**Status**: ✅ Completed

#### Subtasks
- [x] Create `/src/i18n/server.ts`
- [x] Implement `getServerTranslation()` function
- [x] Read `NEXT_PUBLIC_LOCALE` from environment
- [x] Add fallback logic (same as client)
- [x] Support parameter interpolation
- [x] Test in API route
- [x] Document usage in comments

#### Implementation
```typescript
// /src/i18n/server.ts
import { en } from './locales/en'
import { fi } from './locales/fi'
import type { Locale } from './types'

const locales = { en, fi }

/**
 * Server-side translation helper
 * Reads locale from NEXT_PUBLIC_LOCALE environment variable
 *
 * @example
 * const t = getServerTranslation()
 * return NextResponse.json({ error: t('api.errors.notFound') })
 */
export function getServerTranslation() {
  const locale = (process.env.NEXT_PUBLIC_LOCALE || 'en') as Locale
  const translations = locales[locale]
  const fallback = locales.en

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.')

    // Try requested locale
    let value: any = translations
    for (const k of keys) {
      value = value?.[k]
    }

    // Fallback to English
    if (!value) {
      value = fallback
      for (const k of keys) {
        value = value?.[k]
      }
    }

    // Final fallback to key
    if (!value) return key

    // Interpolate parameters
    let text = String(value)
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v))
      }
    }

    return text
  }

  return t
}
```

#### Acceptance Criteria
- [ ] Function created
- [ ] Reads environment variable
- [ ] Fallback logic works
- [ ] Parameter interpolation works
- [ ] Can be used in API routes
- [ ] TypeScript types correct

#### Files to Create
```
/src/i18n/server.ts
```

---

## 📊 Phase 0 Completion Checklist

### All Tasks Complete When:
- [x] All 7 tasks marked complete
- [x] All files created and committed
- [x] `npm run build` passes without errors (Note: grading page issue resolved by other agent)
- [x] `npm run test:i18n` passes (83 keys validated)
- [x] No TypeScript errors
- [x] Hook and server helper can be imported
- [x] Basic manual test works

### Manual Test
```typescript
// Test in any component
import { useTranslation } from '@/i18n'

const { t } = useTranslation()
console.log(t('common.loading')) // Should output "Loading..." or "Ladataan..."
```

---

## 🔴 PHASE 1: Critical API Error Messages (6 hours)

**Status**: ⏳ Not Started

### Task 1.1: Extract API Error Messages
- [ ] Audit `/src/app/api/mobile/exam-questions/route.ts`
- [ ] Document all Finnish error messages (lines 83, 118, 124)
- [ ] Add to `api.errors.*` in both locale files
- [ ] Create comprehensive error message inventory
- [ ] Verify all validation errors covered

### Task 1.2: Update API Routes with Translations
- [ ] Import `getServerTranslation` in mobile exam route
- [ ] Replace line 83: user_id required message
- [ ] Replace line 118: rate limit exceeded message
- [ ] Replace line 124: retry after message
- [ ] Replace validation error messages
- [ ] Test error responses in EN
- [ ] Test error responses in FI

### Task 1.3: Test API Error Messages
- [ ] Create test script for error scenarios
- [ ] Test rate limit (429) in EN
- [ ] Test rate limit (429) in FI
- [ ] Test validation errors in EN
- [ ] Test validation errors in FI
- [ ] Document test results

---

## 🔴 PHASE 2: Shared Exam Page (6 hours)

**Status**: ⏳ Not Started

### Task 2.1: Extract Shared Exam Strings
- [ ] Audit `/src/app/shared/exam/[share_id]/page.tsx`
- [ ] Extract all 30+ Finnish strings
- [ ] Add to `sharedExam.*` namespace
- [ ] Create English translations
- [ ] Identify parameter placeholders

### Task 2.2: Update Shared Exam Page Component
- [ ] Import `useTranslation` hook
- [ ] Replace all hardcoded strings
- [ ] Update format strings with parameters
- [ ] Test date formatting
- [ ] Test print functionality
- [ ] Verify Tailwind classes unaffected

### Task 2.3: Test Shared Exam Page
- [ ] Test loading in EN
- [ ] Test loading in FI
- [ ] Test error states in both languages
- [ ] Test print preview in both languages
- [ ] Test mobile viewport
- [ ] Take screenshots for documentation

---

## 🟡 PHASE 3: Main App Pages (16.5 hours)

**Status**: ⏳ Not Started

### Task 3.1-3.2: Exam Menu Page
- [ ] Extract ~25 inline strings
- [ ] Add to `examMenu.*` namespace
- [ ] Translate to Finnish
- [ ] Update component with translations
- [ ] Test dynamic content
- [ ] Verify layout responsive

### Task 3.3-3.4: Exam Taking Page
- [ ] Extract ~15 inline strings
- [ ] Add to `examTaking.*` namespace
- [ ] Update component
- [ ] Test navigation
- [ ] Test submission flow
- [ ] Verify KaTeX unaffected

### Task 3.5-3.6: Audio Page
- [ ] Extract ~10 inline strings
- [ ] Add to `examAudio.*` namespace
- [ ] Update component
- [ ] Test audio playback
- [ ] Test reward messages

### Task 3.7-3.8: Grading Page
- [ ] Extract ~5 inline strings
- [ ] Add to `examGrading.*` namespace
- [ ] Update component
- [ ] Test print functionality

### Task 3.9: Home Page
- [ ] Update home page
- [ ] Test display

---

## 🟢 PHASE 4: Quality Assurance (12 hours)

**Status**: ⏳ Not Started

### Task 4.1: Translation Quality Review
- [ ] Review all English translations
- [ ] Review all Finnish translations
- [ ] Check terminology consistency
- [ ] Get native speaker review (if available)
- [ ] Create terminology glossary

### Task 4.2: Comprehensive Testing
- [ ] Test all pages in EN
- [ ] Test all pages in FI
- [ ] Test all API endpoints
- [ ] Test on mobile devices
- [ ] Test print functionality
- [ ] Complete test matrix

### Task 4.3: Documentation Update
- [ ] Update README.md
- [ ] Update CLAUDE.md
- [ ] Create LOCALIZATION.md guide
- [ ] Document how to add new languages
- [ ] Add code examples

### Task 4.4: Deprecate Old Constants
- [ ] Add deprecation notice to exam-ui.ts
- [ ] Verify no components use old constants
- [ ] Add migration guide

### Task 4.5: Visual Regression Testing (Optional)
- [ ] Set up Playwright
- [ ] Create screenshot tests
- [ ] Compare EN vs FI layouts

---

## 🎯 Success Metrics

### Phase 0 Success
- [ ] i18n infrastructure fully functional
- [ ] Type-safe translations working
- [ ] CI validation passing
- [ ] Formatting utilities tested
- [ ] Server & client helpers working

### Overall Success
- [ ] 100% translation coverage
- [ ] 0 hardcoded user-facing strings
- [ ] Build passes with no errors
- [ ] All tests passing
- [ ] Documentation complete

---

## 📝 Notes & Decisions

### Completed
**Phase 0 - Foundation Setup (2025-10-17)**
- ✅ Created complete i18n infrastructure with client/server helpers
- ✅ Extracted 83 EXAM_UI constants to locale files
- ✅ Implemented type-safe translation keys with DeepKeyOf
- ✅ Built CI validation script (83 keys validated)
- ✅ Added formatting utilities (date, number, currency, relative time)
- ✅ Implemented pluralization helpers (simple, object-based, locale-aware)
- ✅ Build passes successfully with no TypeScript errors

### In Progress
_None - Ready for Phase 1_

### Blocked
_None_

### Questions/Issues
_None_

### Coordination Notes
- Grading page visualization work completed by other agent (retake improvements)
- No merge conflicts encountered
- Build validated and passing

---

**Last Updated**: 2025-10-17
**Next Update**: After Phase 1 completion
