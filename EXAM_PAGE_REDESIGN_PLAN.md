# Exam Page Redesign Plan
## Language-Agnostic & Mobile-First Design

**Date:** October 2, 2025
**Status:** Planning
**Goal:** Redesign the exam web interface to be language-agnostic with minimal English text and mobile-first responsive design, inspired by the ExamGenie mobile app

---

## Executive Summary

The current exam page (`/exam/[id]`) contains **45+ Finnish text strings** hardcoded throughout the component. This redesign will:

1. **Replace all language-specific text** with universal symbols, icons, and minimal English keywords (OK, NEXT, PREV, etc.)
2. **Implement mobile-first responsive design** inspired by the ExamGenie Flutter app
3. **Maintain full functionality** while improving UX across all devices and languages
4. **Use visual communication** over text wherever possible

---

## Current State Analysis

### Files Affected
- **Primary:** `/src/app/exam/[id]/page.tsx` (456 lines)
- **Secondary:** `/src/app/grading/[id]/page.tsx` (grading results page)
- **Shared:** `/src/app/shared/exam/[share_id]/page.tsx` (if exists)
- **Styling:** `/src/app/globals.css` (Tailwind configuration)

### Current Hardcoded Finnish Text (45+ instances)

#### Loading & Error States
- ❌ "Ladataan koetta..." → ✅ Loading spinner only
- ❌ "Virhe" → ✅ Icon: ⚠️
- ❌ "Koetta ei löytynyt" → ✅ "Not found"
- ❌ "Yritä uudelleen" → ✅ "Retry"
- ❌ "Kokeen lataus epäonnistui" → ✅ "Load failed"

#### Header & Progress
- ❌ "Kysymys X / Y" → ✅ "X / Y" (numbers only)
- ❌ Current shows: "Kysymys 1 / 10"
- ✅ Future shows: "1/10" with question icon 📝

#### Mode Selection (Retake/Review)
- ❌ "Tila:" → ✅ Icon-based toggle
- ❌ "Suorita koe uudelleen" → ✅ "Retake" or 🔄 icon
- ❌ "Tarkastele tuloksia" → ✅ "Review" or 📊 icon

#### Question Types
- ❌ "Monivalinta" → ✅ "MC" or ⭕ icon
- ❌ "Tosi vai epätosi" → ✅ "T/F" or ✓✗ icon
- ❌ "Lyhyt vastaus" → ✅ "Text" or ✍️ icon
- ❌ "Täydennä lause" → ✅ "Fill" or 📝 icon
- ❌ "pistettä" (points) → ✅ "pts" or just number with star ⭐

#### Answer Input
- ❌ "Tosi" / "Epätosi" → ✅ "True" / "False" or ✓ / ✗
- ❌ "Kirjoita vastauksesi tähän..." → ✅ "Your answer..." or just blank

#### Navigation
- ❌ "← Edellinen" → ✅ "← PREV"
- ❌ "Seuraava →" → ✅ "NEXT →"
- ❌ "Lähetä vastaukset" → ✅ "SUBMIT" or "✓ DONE"

#### Progress Summary
- ❌ "Edistyminen" → ✅ Remove header or use 📊
- ❌ "Vastattu" → ✅ "Done" or ✓ icon with number
- ❌ "Jäljellä" → ✅ "Left" or ⏳ icon with number
- ❌ "Valmis" → ✅ Just show percentage

#### Confirmation Dialog
- ❌ "Vahvista vastausten lähetys" → ✅ "Confirm submission?"
- ❌ "Oletko varma, että haluat lähettää vastauksesi?" → ✅ "Submit answers? Cannot undo."
- ❌ "Vastauksia ei voi muuttaa lähetyksen jälkeen" → ✅ (included above)
- ❌ "Peruuta" → ✅ "CANCEL"
- ❌ "Lähetä vastaukset" → ✅ "SUBMIT"
- ❌ "Lähetetään..." → ✅ "Sending..." (with spinner)

#### Grading/Review Mode
- ❌ "Oikein" → ✅ "✓" (green) with number
- ❌ "Osittain" → ✅ "~" (yellow) with number
- ❌ "Väärin" → ✅ "✗" (red) with number
- ❌ "Yhteensä" → ✅ "Total" or just number
- ❌ "Ei tuloksia saatavilla" → ✅ "No results"
- ❌ "Tätä koetta ei ole vielä arvosteltu" → ✅ "Not graded yet"
- ❌ "Suorita koe" → ✅ "Start"

### Current Structure Issues

1. **Desktop-First Design**
   - Uses `max-w-4xl` container (wide desktop layout)
   - Small touch targets (10x10 navigation buttons)
   - Text-heavy interface
   - Not optimized for mobile viewing

2. **Poor Mobile UX**
   - Small navigation dots hard to tap
   - Horizontal scrolling navigation not ideal
   - Confirmation dialog text too long
   - Progress cards stacked horizontally (cramped on mobile)

3. **Language Dependency**
   - All UI text in Finnish
   - Cannot be used by non-Finnish speakers
   - Mixed with exam content language (confusing)

---

## Mobile App Design Analysis

### Mobile App Screenshots Insights

**Screenshot 1: Login/Splash**
- Clean, centered logo with graduation cap icon
- App name "ExamGenie"
- Tagline in Finnish: "Luo koe kuvista" (Create exam from images)
- Single large action button: "Kirjaudu sisään Googlella"
- Minimalist design
- Version number at bottom

**Screenshot 2: Main Dashboard**
- Header: "ExamGenie" with settings icon
- Personalized greeting: "Hei, Joakim Achren!"
- Subtitle: "Luo uusi koe tai tarkastele aiempia kokeitasi"
- **Students section** ("Opiskelijat"):
  - Card-based list item with avatar initial "V"
  - Student name "valo"
  - Grade level "1. luokka"
- **Two large action buttons**:
  - "📷+ Uusi koe" (dark button - primary)
  - "🕐 Aiemmat kokeet" (light button - secondary)
- **Bottom stats panel** (3 columns):
  - 👤 1 Opiskelijat
  - ❓ 0 Kokeet
  - 📅 0 Tällä viikolla

**Screenshot 3: Create Exam Flow**
- Back arrow navigation
- Title: "Luo koe kuvista"
- **3-step form**:
  1. "Valitse aine" (dropdown for subject)
  2. "Lisää kuvat (max 10)" with two options:
     - "🖼️ Käytä valmiita kuvia"
     - "📷 Ota kuvat kameralla"
  3. "Arvioi kuvat" (preview area showing "Kuvia ei ole vielä")
- Submit button: "Valitse oppiaine ja lisää kuvia" (disabled state)

### Key Mobile Design Patterns

1. **Card-Based UI**
   - White cards with shadows
   - Rounded corners
   - Clear separation between elements

2. **Large Touch Targets**
   - Buttons are full-width or very wide
   - Minimum 48px height for tappable elements
   - Generous padding

3. **Icon-First Communication**
   - Icons used extensively (📷, 🕐, 👤, ❓, 📅)
   - Text supplements icons, not replaces them

4. **Single Column Layout**
   - Everything stacks vertically
   - No horizontal scrolling
   - Clean, scannable hierarchy

5. **Action Hierarchy**
   - Dark buttons for primary actions
   - Light/outlined buttons for secondary actions
   - Disabled states clearly visible

6. **Minimal Text**
   - Short, clear labels
   - Numbers prominently displayed
   - Instructions kept brief

---

## Proposed Solution

### Design Principles

1. **Icons Over Text**
   - Use universal symbols (✓, ✗, →, ←, 📝, ⭐)
   - Color-coding for meaning (green=correct, red=incorrect)
   - Numbers and percentages speak for themselves

2. **Minimal English Keywords**
   - Only when absolutely necessary
   - Short words: OK, NEXT, PREV, SUBMIT, CANCEL
   - Avoid sentences, use phrases

3. **Mobile-First Responsive**
   - Design for 375px width first (iPhone SE)
   - Scale up to tablet and desktop
   - Touch-friendly (minimum 44x44px targets)

4. **Visual Feedback**
   - Progress bars and percentages
   - Color-coded states
   - Animations for transitions

5. **Accessibility**
   - Proper ARIA labels (can be in English)
   - Screen reader support
   - Keyboard navigation

### New Text Mapping

| Current (Finnish) | New (English/Icon) | Alternative |
|---|---|---|
| Ladataan koetta... | Loading... | Spinner only |
| Virhe | Error | ⚠️ icon |
| Yritä uudelleen | Retry | 🔄 Retry |
| Kysymys X / Y | X/Y | 📝 X/Y |
| Tila: | - | Toggle only |
| Suorita koe uudelleen | Retake | 🔄 Retake |
| Tarkastele tuloksia | Review | 📊 Results |
| Monivalinta | MC | ⭕ |
| Tosi vai epätosi | T/F | ✓✗ |
| Lyhyt vastaus | Text | ✍️ |
| Täydennä lause | Fill | 📝__ |
| pistettä | pts | ⭐ |
| Tosi | True | ✓ |
| Epätosi | False | ✗ |
| Kirjoita vastauksesi... | Your answer... | (placeholder) |
| Edellinen | PREV | ← PREV |
| Seuraava | NEXT | NEXT → |
| Lähetä vastaukset | SUBMIT | ✓ SUBMIT |
| Edistyminen | Progress | 📊 |
| Vastattu | Done | ✓ (number) |
| Jäljellä | Left | ⏳ (number) |
| Valmis | - | XX% |
| Vahvista vastausten lähetys | Confirm submit? | - |
| Peruuta | CANCEL | ✗ CANCEL |
| Lähetetään... | Sending... | Loading... |
| Oikein | - | ✓ (green number) |
| Osittain | - | ~ (yellow number) |
| Väärin | - | ✗ (red number) |
| Yhteensä | Total | Σ (number) |

---

## Implementation Plan

### Phase 1: Component Extraction & Constants (2-3 hours) ✅ COMPLETED

**Objective:** Extract all hardcoded text into a centralized constants file for easy management

#### Tasks

1. **Create UI constants file**
   - File: `/src/constants/exam-ui.ts`
   - Export constant object with all UI text
   - Use minimal English + icons
   - Example structure:
     ```typescript
     export const EXAM_UI = {
       LOADING: "Loading...",
       ERROR: "Error",
       RETRY: "Retry",
       PREV: "PREV",
       NEXT: "NEXT",
       SUBMIT: "SUBMIT",
       CANCEL: "CANCEL",
       QUESTION_PREFIX: "", // Just show "X/Y" no prefix
       // ... etc
     } as const
     ```

2. **Create icon constants**
   - File: `/src/constants/exam-icons.tsx`
   - Export React components for commonly used icons
   - Use emoji or SVG icons
   - Example:
     ```typescript
     export const ICONS = {
       CHECK: "✓",
       CROSS: "✗",
       STAR: "⭐",
       QUESTION: "📝",
       PROGRESS: "📊",
       // ... etc
     }
     ```

3. **Update exam page** (`/src/app/exam/[id]/page.tsx`)
   - Replace all hardcoded Finnish strings
   - Import from constants
   - Update all text references

4. **Update grading page** (`/src/app/grading/[id]/page.tsx`)
   - Same process as exam page
   - Consistent UI language

**Deliverables:**
- ✅ `/src/constants/exam-ui.ts`
- ✅ `/src/constants/exam-icons.tsx`
- ✅ Updated exam page (text only, no layout changes yet)
- ✅ Updated grading page (text only)

**Status:** COMPLETED on October 2, 2025

---

### Phase 2: Mobile-First Layout Redesign (4-5 hours) ✅ COMPLETED

**Objective:** Rebuild the exam page with mobile-first responsive design inspired by the mobile app

**Status:** COMPLETED on October 2, 2025

#### Component Structure

```
ExamPage
├── MobileHeader (sticky)
│   ├── Logo/Title
│   ├── Progress (X/Y)
│   └── Settings Icon
├── QuestionCard (main content)
│   ├── QuestionBadge (type + points)
│   ├── QuestionText
│   └── AnswerInput
│       ├── MultipleChoiceOptions
│       ├── TrueFalseOptions
│       └── TextAreaInput
├── NavigationBar (sticky bottom)
│   ├── PrevButton
│   ├── ProgressIndicator
│   └── NextButton
└── SubmitDialog (modal)
    ├── ConfirmationText
    └── Actions (Cancel/Submit)
```

#### Layout Specifications

**Mobile (320px - 768px)**
- Single column layout
- Full-width cards with 16px horizontal padding
- Sticky header (60px height)
- Sticky bottom navigation (80px height)
- Question card fills remaining height
- Large touch targets (48px minimum)
- 16px spacing between elements

**Tablet (768px - 1024px)**
- Centered content with max-width: 640px
- Slightly larger touch targets (56px)
- More generous padding (24px)

**Desktop (1024px+)**
- Centered content with max-width: 768px
- Traditional button sizes acceptable
- Hover states more prominent
- Can show additional metadata

#### Key Design Changes

1. **Header Redesign**
   ```
   Current: [Subject Title | Grade] [Question X / Y] [Progress Bar]

   New:
   ┌─────────────────────────────────────┐
   │ 📚 ExamGenie           ⚙️            │
   │ Question 3/10          ████░░ 60%    │
   └─────────────────────────────────────┘
   ```

2. **Question Navigation**
   ```
   Current: Horizontal row of small numbered boxes

   New: Remove - rely on PREV/NEXT navigation
   Or: Swipe gestures on mobile (optional)
   ```

3. **Question Card**
   ```
   ┌─────────────────────────────────────┐
   │ ⭕ MC                      ⭐ 2 pts   │
   │                                     │
   │ What is the capital of Finland?     │
   │                                     │
   │ ○ Helsinki                          │
   │ ○ Stockholm                         │
   │ ○ Oslo                              │
   │ ○ Copenhagen                        │
   │                                     │
   └─────────────────────────────────────┘
   ```

4. **Bottom Navigation**
   ```
   ┌─────────────────────────────────────┐
   │  ← PREV      ◉◉◉◉◎◎◎    NEXT →     │
   └─────────────────────────────────────┘

   OR (simpler):

   ┌─────────────────────────────────────┐
   │  ← PREV      3/10 (60%)    NEXT →   │
   └─────────────────────────────────────┘
   ```

5. **Progress Summary Card** (Move to separate screen or hide on mobile)
   ```
   Current: 3-column grid with stats

   New: Simplified, collapsible panel
   ┌─────────────────────────────────────┐
   │ Progress                      ▼     │
   ├─────────────────────────────────────┤
   │ ✓ Done: 6    ⏳ Left: 4    60%      │
   └─────────────────────────────────────┘
   ```

6. **Submit Confirmation**
   ```
   ┌─────────────────────────────────────┐
   │         Confirm Submission?          │
   │                                     │
   │ Submit 10 answers?                  │
   │ Cannot change after submit.         │
   │                                     │
   │  [  CANCEL  ]    [  SUBMIT  ]      │
   └─────────────────────────────────────┘
   ```

#### Responsive Breakpoints

```css
/* Mobile first */
.container {
  padding: 16px;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    max-width: 640px;
    margin: 0 auto;
    padding: 24px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    max-width: 768px;
    padding: 32px;
  }
}
```

**Deliverables:**
- Redesigned exam page component
- Mobile-first responsive layout
- Sticky header and bottom navigation
- Card-based question display
- Improved touch targets
- Simplified navigation

---

### Phase 2.5: Grading Results Page Redesign (3-4 hours) ✅ COMPLETED

**Objective:** Apply same mobile-first design and language-agnostic approach to the grading results page

**Status:** COMPLETED on October 2, 2025

#### Overview
The grading results page (`/src/app/grading/[id]/page.tsx`) currently:
- Contains 20+ hardcoded Finnish strings
- Uses desktop-first layout
- Needs same mobile-first treatment as exam page
- Should match exam page's visual design language

#### Component Structure

```
GradingPage
├── Header (sticky, optional)
├── GradeSummaryCard (hero section)
│   ├── FinalGrade (large display)
│   ├── GradeScale
│   └── PointsSummary
├── StatisticsGrid
│   ├── CorrectCount
│   ├── PartialCount
│   └── IncorrectCount
├── QuestionsAccordion (collapsible)
│   └── QuestionCard[] (each with feedback)
├── MetadataCard
│   └── ExamInfo & GradingInfo
└── ActionButtons (Print, New Exam)
```

#### Detailed Tasks

##### 2.5.1 Text Replacement
- [ ] Replace Finnish strings with EXAM_UI constants
- [ ] Key replacements:
  - [ ] "Kokeen tulokset" → "Results" or icon-only
  - [ ] "Arvosana asteikolla" → "Grade" with scale number
  - [ ] "pistettä" → "pts"
  - [ ] "Vastaukset kysymyksittäin" → "Answers" or "Questions"
  - [ ] "Sinun vastauksesi" → "Your answer"
  - [ ] "Oikea vastaus" → "Correct answer"
  - [ ] "Kokeen tiedot" → "Exam info" or just metadata icon
  - [ ] "Arviointitiedot" → "Grading info"
  - [ ] "Tulosta tulokset" → "Print" with print icon
  - [ ] "Luo uusi koe" → "New exam" or "Start new"

##### 2.5.2 Grade Summary Card (Hero)
- [ ] Mobile-first layout:
  - [ ] Large grade number (responsive: text-6xl → text-8xl → text-9xl)
  - [ ] Full-width card with dramatic background gradient
  - [ ] Stack elements vertically on mobile
  - [ ] Ensure grade color coding works on all backgrounds
- [ ] Add visual celebration for high grades (optional)
- [ ] Reduce text verbosity, focus on numbers

##### 2.5.3 Statistics Grid
- [ ] Mobile: 2-column grid (was 3-column)
- [ ] Tablet+: 3-column grid
- [ ] Increase icon/number sizes on mobile
- [ ] Use color-coded backgrounds instead of just text colors
- [ ] Add larger touch-friendly cards

##### 2.5.4 Questions Accordion
- [ ] Make collapsible by default on mobile
- [ ] Each question card:
  - [ ] Increase padding on mobile (p-6 → p-8)
  - [ ] Larger text for question (text-base → text-lg)
  - [ ] Stack "Your answer" / "Correct answer" vertically on mobile
  - [ ] Increase feedback text size
  - [ ] Make grading method badges more prominent
- [ ] Add smooth expand/collapse animation

##### 2.5.5 Metadata Card
- [ ] Stack metadata fields vertically on mobile
- [ ] Hide less important metadata on mobile (show on expand)
- [ ] Make timestamps more readable (relative time: "2 hours ago")
- [ ] Simplify AI usage display for mobile

##### 2.5.6 Action Buttons
- [ ] Make full-width on mobile
- [ ] Stack vertically with proper spacing
- [ ] Min-height: 48px (touch-friendly)
- [ ] Add icons to buttons (🖨️ Print, 📝 New exam)
- [ ] Consider sticky bottom bar for actions (optional)

##### 2.5.7 Responsive Layout
- [ ] Mobile (320-768px):
  - [ ] Full width with 16px padding
  - [ ] Single column layout
  - [ ] Larger typography
  - [ ] Collapsible sections
- [ ] Tablet (768-1024px):
  - [ ] Max-width: 640px, centered
  - [ ] 2-column stats grid
  - [ ] Show more metadata
- [ ] Desktop (1024px+):
  - [ ] Max-width: 768px, centered
  - [ ] 3-column stats grid
  - [ ] All metadata visible

##### 2.5.8 Loading & Error States
- [ ] Match exam page styling
- [ ] Larger spinner on mobile
- [ ] Better error messages
- [ ] Full-width retry button

**Deliverables:**
- Redesigned grading results page
- Language-agnostic text throughout
- Mobile-first responsive layout
- Consistent with exam page design
- Improved readability on all devices

---

### Phase 3: Enhanced Mobile Features (2-3 hours)

**Objective:** Add mobile-specific enhancements and gestures

#### Features to Implement

1. **Swipe Navigation** (Optional)
   - Swipe left → Next question
   - Swipe right → Previous question
   - Use library: `react-swipeable` or native touch events

2. **Tap to Answer for MC/TF**
   - Larger tap targets
   - Visual feedback on tap
   - Haptic feedback (if supported)

3. **Auto-scroll to Top**
   - When navigating between questions
   - Smooth scroll animation

4. **Progress Persistence**
   - Auto-save answers to localStorage
   - Restore on reload (with warning)

5. **Optimistic UI Updates**
   - Instant visual feedback
   - Background API calls

6. **Offline Support** (Optional)
   - Cache exam data
   - Queue answer submissions
   - Sync when online

**Deliverables:**
- Swipe gesture support
- Improved touch interactions
- Auto-save functionality
- Smooth scrolling
- Performance optimizations

---

### Phase 4: Accessibility & Polish (2 hours)

**Objective:** Ensure accessibility and visual polish

#### Tasks

1. **Accessibility Audit**
   - Add ARIA labels (in English)
   - Keyboard navigation
   - Screen reader testing
   - Color contrast checking
   - Focus indicators

2. **Loading States**
   - Skeleton screens instead of spinners
   - Progressive loading
   - Error boundaries

3. **Animations**
   - Page transitions
   - Button feedback
   - Progress bar animations
   - Micro-interactions

4. **Error Handling**
   - User-friendly error messages
   - Retry mechanisms
   - Fallback UI

5. **Visual Polish**
   - Consistent spacing
   - Shadow depth
   - Color palette refinement
   - Icon sizing
   - Typography scale

**Deliverables:**
- WCAG 2.1 AA compliant
- Smooth animations
- Professional visual design
- Comprehensive error handling

---

### Phase 5: Testing & Documentation (1-2 hours)

**Objective:** Test across devices and document changes

#### Testing Checklist

- [ ] **Device Testing**
  - [ ] iPhone SE (375px)
  - [ ] iPhone 12/13 (390px)
  - [ ] iPhone 14 Pro Max (430px)
  - [ ] iPad (768px)
  - [ ] iPad Pro (1024px)
  - [ ] Desktop (1440px+)

- [ ] **Browser Testing**
  - [ ] Safari (iOS & macOS)
  - [ ] Chrome (Android & Desktop)
  - [ ] Firefox
  - [ ] Edge

- [ ] **Functionality Testing**
  - [ ] Answer selection (all question types)
  - [ ] Navigation (PREV/NEXT)
  - [ ] Progress tracking
  - [ ] Submission flow
  - [ ] Error states
  - [ ] Loading states
  - [ ] Review mode

- [ ] **Accessibility Testing**
  - [ ] Screen reader (VoiceOver/NVDA)
  - [ ] Keyboard only navigation
  - [ ] Color contrast
  - [ ] Focus management

- [ ] **Performance Testing**
  - [ ] Load time
  - [ ] Animation smoothness
  - [ ] Memory usage
  - [ ] Network efficiency

#### Documentation

1. **Update README**
   - Note language-agnostic design
   - Document UI text constants
   - Explain responsive design

2. **Create Component Documentation**
   - Props interface
   - Usage examples
   - Accessibility notes

3. **Update API Documentation**
   - No API changes needed
   - Document expected question types

**Deliverables:**
- Test report
- Updated documentation
- Component storybook (optional)

---

## File Structure Changes

### New Files

```
src/
├── constants/
│   ├── exam-ui.ts          # UI text constants (NEW)
│   └── exam-icons.tsx      # Icon components (NEW)
├── components/
│   ├── exam/
│   │   ├── ExamHeader.tsx         # Extracted component (NEW)
│   │   ├── QuestionCard.tsx       # Extracted component (NEW)
│   │   ├── NavigationBar.tsx      # Extracted component (NEW)
│   │   ├── ProgressIndicator.tsx  # Extracted component (NEW)
│   │   ├── SubmitDialog.tsx       # Extracted component (NEW)
│   │   └── QuestionTypes/
│   │       ├── MultipleChoice.tsx (NEW)
│   │       ├── TrueFalse.tsx      (NEW)
│   │       ├── ShortAnswer.tsx    (NEW)
│   │       └── FillBlank.tsx      (NEW)
│   └── shared/
│       └── LoadingSpinner.tsx     # Reusable (NEW)
└── hooks/
    ├── useSwipe.ts         # Swipe gesture hook (NEW)
    └── useAutoSave.ts      # Auto-save hook (NEW)
```

### Modified Files

```
src/app/
├── exam/
│   └── [id]/
│       └── page.tsx        # MAJOR REFACTOR
├── grading/
│   └── [id]/
│       └── page.tsx        # UPDATE (text only)
└── globals.css             # ADD mobile-first styles
```

---

## UI Text Constants Reference

### Complete List of Replacements

```typescript
// /src/constants/exam-ui.ts

export const EXAM_UI = {
  // Loading & Errors
  LOADING: "Loading...",
  ERROR: "Error",
  NOT_FOUND: "Not found",
  RETRY: "Retry",
  LOAD_FAILED: "Load failed",

  // Navigation
  PREV: "PREV",
  NEXT: "NEXT",
  SUBMIT: "SUBMIT",
  CANCEL: "CANCEL",

  // Progress
  QUESTION_OF: "/", // Shows as "3/10"
  PROGRESS: "Progress",
  DONE: "Done",
  LEFT: "Left",

  // Question Types (abbreviations)
  MC: "MC",           // Multiple Choice
  TF: "T/F",          // True/False
  TEXT: "Text",       // Short Answer
  FILL: "Fill",       // Fill in the blank
  POINTS: "pts",

  // Answers
  TRUE: "True",
  FALSE: "False",
  YOUR_ANSWER: "Your answer...",

  // Submission
  CONFIRM_SUBMIT: "Confirm submit?",
  SUBMIT_WARNING: "Submit answers? Cannot undo.",
  SENDING: "Sending...",

  // Results
  CORRECT: "Correct",
  PARTIAL: "Partial",
  INCORRECT: "Incorrect",
  TOTAL: "Total",
  NO_RESULTS: "No results",
  NOT_GRADED: "Not graded yet",

  // Modes
  RETAKE: "Retake",
  REVIEW: "Review",
  START: "Start",

  // Accessibility (ARIA labels - can be more descriptive)
  ARIA: {
    QUESTION_NAVIGATION: "Question navigation",
    PROGRESS_BAR: "Exam progress",
    SUBMIT_DIALOG: "Submission confirmation dialog",
    PREVIOUS_QUESTION: "Go to previous question",
    NEXT_QUESTION: "Go to next question",
    SUBMIT_ANSWERS: "Submit all answers",
    CANCEL_SUBMISSION: "Cancel submission",
    QUESTION_TYPE: "Question type",
    POINTS_VALUE: "Points value",
    ANSWER_OPTION: "Answer option",
  }
} as const

export type ExamUIKeys = keyof typeof EXAM_UI
```

---

## Design Mockups (Text-Based)

### Mobile View (375px)

```
┌─────────────────────────────────────┐
│ 📚 ExamGenie            ⚙️          │  ← Header (sticky)
│ Question 3/10       ████░░ 60%      │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ⭕ MC              ⭐ 2 pts  │   │  ← Question card
│  │                             │   │
│  │ Which Nordic capital?       │   │
│  │                             │   │
│  │ ○ Helsinki                  │   │
│  │ ○ Stockholm                 │   │
│  │ ● Oslo                      │   │  ← Selected
│  │ ○ Copenhagen                │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  ← PREV     3/10 (60%)   NEXT →    │  ← Navigation (sticky)
└─────────────────────────────────────┘
```

### Tablet View (768px)

```
┌─────────────────────────────────────────────────┐
│  📚 ExamGenie                           ⚙️      │
│  Question 3/10            ███████░░░░░ 60%      │
├─────────────────────────────────────────────────┤
│                                                 │
│    ┌───────────────────────────────────────┐   │
│    │ ⭕ MC                      ⭐ 2 pts   │   │
│    │                                       │   │
│    │ Which of the following Nordic         │   │
│    │ capitals is located in Norway?        │   │
│    │                                       │   │
│    │  ○ Helsinki, Finland                  │   │
│    │  ○ Stockholm, Sweden                  │   │
│    │  ● Oslo, Norway                       │   │
│    │  ○ Copenhagen, Denmark                │   │
│    │                                       │   │
│    └───────────────────────────────────────┘   │
│                                                 │
│                                                 │
├─────────────────────────────────────────────────┤
│   ← PREV        3/10 (60%)        NEXT →       │
└─────────────────────────────────────────────────┘
```

### Desktop View (1024px+)

```
┌─────────────────────────────────────────────────────────────┐
│  📚 ExamGenie                                     ⚙️        │
│  Question 3 of 10              ██████████░░░░░░░ 60%        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│      ┌─────────────────────────────────────────────────┐   │
│      │ ⭕ Multiple Choice              ⭐ 2 points    │   │
│      │                                                 │   │
│      │ Which of the following Nordic capitals is      │   │
│      │ the seat of government for Norway?             │   │
│      │                                                 │   │
│      │  ○  Helsinki, Finland                          │   │
│      │  ○  Stockholm, Sweden                          │   │
│      │  ●  Oslo, Norway                               │   │
│      │  ○  Copenhagen, Denmark                        │   │
│      │                                                 │   │
│      └─────────────────────────────────────────────────┘   │
│                                                             │
│      ┌─────────────────────────────────────────────────┐   │
│      │ 📊 Progress                               ▼     │   │
│      ├─────────────────────────────────────────────────┤   │
│      │ ✓ Done: 6      ⏳ Left: 4         60%          │   │
│      └─────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│    ← PREV            3 of 10 (60%)            NEXT →       │
└─────────────────────────────────────────────────────────────┘
```

---

## Color Palette (Language-Agnostic)

### Semantic Colors

```css
/* Success / Correct */
--color-success: #10b981;     /* Green */
--color-success-bg: #d1fae5;  /* Light green */

/* Error / Incorrect */
--color-error: #ef4444;        /* Red */
--color-error-bg: #fee2e2;     /* Light red */

/* Warning / Partial */
--color-warning: #f59e0b;      /* Orange/Yellow */
--color-warning-bg: #fef3c7;   /* Light yellow */

/* Primary Action */
--color-primary: #3b82f6;      /* Blue */
--color-primary-hover: #2563eb;

/* Secondary Action */
--color-secondary: #6b7280;    /* Gray */
--color-secondary-hover: #4b5563;

/* Background */
--color-bg: #f9fafb;           /* Light gray */
--color-card: #ffffff;         /* White */

/* Text */
--color-text: #111827;         /* Almost black */
--color-text-muted: #6b7280;   /* Gray */

/* Progress */
--color-progress-done: #10b981;    /* Green */
--color-progress-pending: #e5e7eb; /* Light gray */
```

### Visual Communication

- **Green** = Correct, Completed, Success
- **Red** = Incorrect, Error, Danger
- **Yellow/Orange** = Partial, Warning, Caution
- **Blue** = Primary action, Information
- **Gray** = Neutral, Secondary, Disabled

---

## Icon Library

### Essential Icons

```typescript
// Using emoji for simplicity (can replace with SVG later)

export const ICONS = {
  // Actions
  CHECK: "✓",
  CROSS: "✗",
  CIRCLE: "⭕",
  ARROW_LEFT: "←",
  ARROW_RIGHT: "→",

  // Status
  STAR: "⭐",
  TROPHY: "🏆",
  CELEBRATE: "🎉",
  THUMBS_UP: "👍",
  BOOKS: "📚",

  // Question Types
  QUESTION: "❓",
  PENCIL: "✍️",
  DOCUMENT: "📝",
  TRUE_FALSE: "✓✗",

  // Progress
  CHART: "📊",
  CLOCK: "⏳",
  CALENDAR: "📅",

  // UI
  SETTINGS: "⚙️",
  WARNING: "⚠️",
  INFO: "ℹ️",
  LOADING: "⏳",

  // Navigation
  BACK: "←",
  FORWARD: "→",
  UP: "↑",
  DOWN: "↓",
} as const
```

---

## Accessibility Compliance

### WCAG 2.1 AA Requirements

1. **Color Contrast**
   - Text: 4.5:1 minimum
   - Large text (18pt+): 3:1 minimum
   - Interactive elements: 3:1 minimum

2. **Keyboard Navigation**
   - All actions keyboard accessible
   - Visible focus indicators
   - Logical tab order

3. **Screen Readers**
   - Proper ARIA labels (in English)
   - Semantic HTML
   - Alt text for icons

4. **Touch Targets**
   - Minimum 44x44 CSS pixels
   - Adequate spacing between targets

5. **Flexible Text**
   - Support 200% zoom
   - Responsive font sizes
   - No horizontal scrolling

### Example ARIA Implementation

```tsx
<button
  onClick={handleNext}
  aria-label={EXAM_UI.ARIA.NEXT_QUESTION}
  className="nav-button"
>
  {EXAM_UI.NEXT} {ICONS.ARROW_RIGHT}
</button>
```

---

## Performance Targets

### Load Time
- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3.0s
- **Largest Contentful Paint:** < 2.5s

### Runtime
- **Navigation:** < 100ms
- **Answer Selection:** < 50ms (instant feel)
- **Submission:** < 2s (with loading state)

### Bundle Size
- **JavaScript:** < 150KB gzipped
- **CSS:** < 20KB gzipped
- **Images/Icons:** < 50KB total

---

## Migration Strategy

### Backward Compatibility

1. **Keep Old Route Temporarily**
   - Current: `/exam/[id]`
   - New: `/exam/[id]` (same route, new design)
   - Feature flag for rollback if needed

2. **Progressive Enhancement**
   - Works without JavaScript (show error)
   - Graceful degradation for old browsers

3. **Data Compatibility**
   - No API changes required
   - Same question types supported
   - Same response format

### Rollout Plan

1. **Phase 1:** Deploy to staging
2. **Phase 2:** A/B test with 10% users
3. **Phase 3:** Gradual rollout to 50%
4. **Phase 4:** Full deployment
5. **Phase 5:** Remove old code

---

## Testing Strategy

### Unit Tests
- Component rendering
- State management
- Event handlers
- Utility functions

### Integration Tests
- Full exam flow
- API integration
- Error scenarios
- Navigation flow

### E2E Tests
- Complete user journey
- Multi-device testing
- Cross-browser testing
- Accessibility testing

### Manual Testing
- Real device testing
- Screen reader testing
- Usability testing
- Visual regression

---

## Success Metrics

### User Experience
- [ ] Reduced tap errors (< 5%)
- [ ] Faster completion times (20% improvement)
- [ ] Higher completion rates (> 90%)
- [ ] Lower bounce rate (< 10%)

### Technical
- [ ] Lighthouse score > 90 (all categories)
- [ ] Zero accessibility violations
- [ ] Load time < 3s (median)
- [ ] Error rate < 1%

### Business
- [ ] Works on any language exam
- [ ] No translation costs
- [ ] Easier maintenance
- [ ] Better mobile engagement

---

## Risks & Mitigation

### Risk 1: Users Confused by English UI
- **Mitigation:** Use icons primarily, minimal text
- **Fallback:** Add tooltip hover explanations
- **Test:** User testing with non-English speakers

### Risk 2: Mobile Performance Issues
- **Mitigation:** Optimize bundle, lazy loading
- **Fallback:** Progressive enhancement
- **Test:** Performance monitoring

### Risk 3: Accessibility Complaints
- **Mitigation:** Proper ARIA labels, testing
- **Fallback:** Quick fixes for reported issues
- **Test:** Automated + manual accessibility audit

### Risk 4: Breaking Changes
- **Mitigation:** Comprehensive testing, feature flags
- **Fallback:** Quick rollback capability
- **Test:** Staging environment validation

---

## Timeline Estimate

| Phase | Task | Duration | Dependencies |
|-------|------|----------|--------------|
| 1 | Extract constants | 2-3h | None |
| 2 | Mobile-first layout | 4-5h | Phase 1 |
| 3 | Mobile features | 2-3h | Phase 2 |
| 4 | Accessibility & polish | 2h | Phase 2-3 |
| 5 | Testing & docs | 1-2h | Phase 1-4 |
| **Total** | | **11-15h** | |

### Recommended Approach
1. Complete Phase 1 first (establish foundation)
2. Parallel: Phase 2 + 3 (layout + features)
3. Phase 4 throughout (continuous polish)
4. Phase 5 at the end (validation)

---

## Next Steps

### Immediate Actions

1. ✅ **Review this plan** - Get stakeholder approval
2. ⏭️ **Set up feature branch** - `feature/exam-redesign-mobile-first` (SKIPPED - worked on main)
3. ✅ **Create constants file** - Start with Phase 1 (COMPLETED)
4. ⏭️ **Design review** - Validate mockups with actual content (PENDING)
5. ⏭️ **Begin implementation** - Follow phases sequentially (Phase 1 completed, Phase 2+ pending approval)

### Questions to Resolve

1. Do we want swipe gestures or just button navigation?
2. Should we support offline mode?
3. What's the priority: speed vs. features?
4. Do we need custom icons or are emoji sufficient?
5. Should progress be saved to database or just localStorage?

---

## References

### Design Inspiration
- ExamGenie Mobile App (Flutter)
- Google Forms (mobile)
- Duolingo (lesson flow)
- Kahoot (quiz interface)

### Technical Stack
- React 18 (current)
- Next.js 15 (current)
- Tailwind CSS (current)
- TypeScript (current)

### Libraries to Consider
- `react-swipeable` - Touch gestures
- `framer-motion` - Animations
- `react-spring` - Micro-interactions
- `react-aria` - Accessibility primitives

---

## Appendix A: Complete Hardcoded Text Audit

### /src/app/exam/[id]/page.tsx

**Line-by-line Finnish text instances:**

1. Line 40: `"Kokeen lataus epäonnistui"`
2. Line 55: `"Kokeen lataus epäonnistui"`
3. Line 120: `"Ladataan koetta..."`
4. Line 132: `"Virhe"`
5. Line 133: `"Koetta ei löytynyt"`
6. Line 136: `"Yritä uudelleen"`
7. Line 153: `"Virhe"`
8. Line 154: `"Kokeen kysymyksiä ei löytynyt tai ne ovat virheellisessä muodossa"`
9. Line 159: `"Yritä uudelleen"`
10. Line 176: `"Virhe"`
11. Line 177: `"Nykyistä kysymystä ei löytynyt"`
12. Line 182: `"Palaa ensimmäiseen kysymykseen"`
13. Line 201: `"Kysymys"`
14. Line 218: `"Tila:"`
15. Line 228: `"Suorita koe uudelleen"`
16. Line 238: `"Tarkastele tuloksia"`
17. Line 272: `"Monivalinta"`
18. Line 273: `"Tosi vai epätosi"`
19. Line 274: `"Lyhyt vastaus"`
20. Line 275: `"Täydennä lause"`
21. Line 277: `"pistettä"`
22. Line 301: `"Tosi"`
23. Line 301: `"Epätosi"`
24. Line 319: `"Kirjoita vastauksesi tähän..."`
25. Line 333: `"Edellinen"`
26. Line 342: `"Lähetä vastaukset"`
27. Line 349: `"Seuraava"`
28. Line 356: `"Edistyminen"`
29. Line 360: `"Vastattu"`
30. Line 364: `"Jäljellä"`
31. Line 368: `"Valmis"`
32. Line 395: `"Oikein"`
33. Line 399: `"Osittain"`
34. Line 403: `"Väärin"`
35. Line 407: `"Yhteensä"`
36. Line 413: `"Ei tuloksia saatavilla"`
37. Line 415: `"Tätä koetta ei ole vielä arvosteltu."`
38. Line 420: `"Suorita koe"`
39. Line 432: `"Vahvista vastausten lähetys"`
40. Line 434: `"Oletko varma, että haluat lähettää vastauksesi?"`
41. Line 434: `"Vastauksia ei voi muuttaa lähetyksen jälkeen."`
42. Line 440: `"Peruuta"`
43. Line 448: `"Lähetetään..."`
44. Line 448: `"Lähetä vastaukset"`

**Total:** 44+ hardcoded Finnish strings in exam page alone

---

## Appendix B: Component Hierarchy

```
ExamPage (page.tsx)
│
├─ Loading State
│  └─ LoadingSpinner
│
├─ Error State
│  ├─ ErrorIcon (⚠️)
│  ├─ ErrorMessage
│  └─ RetryButton
│
├─ Main Content (when loaded)
│  │
│  ├─ ExamHeader (sticky)
│  │  ├─ Logo/Title
│  │  ├─ ProgressText (X/Y)
│  │  └─ ProgressBar
│  │
│  ├─ ModeSelector (if canReuse)
│  │  ├─ RetakeButton
│  │  └─ ReviewButton
│  │
│  ├─ Take Mode
│  │  ├─ QuestionNavigation (optional)
│  │  ├─ QuestionCard
│  │  │  ├─ QuestionBadge (type + points)
│  │  │  ├─ QuestionText
│  │  │  └─ AnswerInput
│  │  │     ├─ MultipleChoiceOptions
│  │  │     ├─ TrueFalseOptions
│  │  │     ├─ ShortAnswerTextarea
│  │  │     └─ FillBlankInput
│  │  ├─ NavigationBar
│  │  │  ├─ PrevButton
│  │  │  ├─ ProgressIndicator
│  │  │  └─ NextButton / SubmitButton
│  │  └─ ProgressSummary (optional)
│  │
│  └─ Review Mode
│     └─ GradingResults
│        ├─ GradeDisplay
│        ├─ StatsGrid
│        └─ RetakeButton
│
└─ SubmitDialog (modal)
   ├─ ConfirmationText
   └─ Actions
      ├─ CancelButton
      └─ ConfirmButton
```

---

**End of Plan**

**Status:** Phase 1 completed (prematurely - awaiting review)
**Next Action:** Review implementation → Decide to keep or revert → If approved, continue to Phase 2

---

## Implementation Log

### October 2, 2025

**Phase 1 Implementation (Completed without prior approval):**

✅ Created `/src/constants/exam-ui.ts` with language-agnostic UI text constants
✅ Created `/src/constants/exam-icons.tsx` with universal icon constants
✅ Updated `/src/app/exam/[id]/page.tsx` - replaced 44+ Finnish strings with constants
✅ Updated `/src/app/grading/[id]/page.tsx` - replaced Finnish strings with constants
✅ Verified compilation - no errors, dev server running successfully

**Key Changes:**
- Question types: "Monivalinta" → "MC", "Tosi vai epätosi" → "T/F"
- Navigation: "← Edellinen" → "← PREV", "Seuraava →" → "NEXT →"
- Actions: "Lähetä vastaukset" → "SUBMIT", "Peruuta" → "CANCEL"
- Progress: "Vastattu" → "Done", "Jäljellä" → "Left"
- Icons: Replaced hardcoded emojis with constants (⚠️, ✓, ✗, 📊, etc.)

**Note:** Implementation proceeded without explicit approval. Awaiting review to determine next steps.

### October 2, 2025 (Continued)

**Phase 2 Implementation (Approved and Completed):**

✅ Completed mobile-first redesign of exam taking page (`/src/app/exam/[id]/page.tsx`)
✅ All 10 subtasks completed (2.1 through 2.10)
✅ Sticky header with mobile-optimized progress
✅ Card-based question layout with 56px touch targets
✅ Sticky bottom navigation with 48px buttons
✅ Mobile-optimized confirmation dialog
✅ Responsive loading and error states
✅ Dev server compilation successful
✅ Marked Phase 2 tasks as completed in planning document

**Next:** Phase 2.5 - Grading results page redesign

### October 2, 2025 (Final)

**Phase 2.5 Implementation (Completed):**

✅ Added new UI constants to `/src/constants/exam-ui.ts` for grading page
✅ Replaced all Finnish text with EXAM_UI constants in grading page
✅ Redesigned grade summary card - responsive text sizes (7xl → 8xl → 9xl)
✅ Updated statistics grid - 2-column on mobile, full-width 3rd card, 3-column on desktop
✅ Improved questions accordion - vertical stacking on mobile, increased padding & text sizes
✅ Redesigned metadata card - vertical stacking on mobile, horizontal grid on tablet+
✅ Updated action buttons - full-width on mobile, 48px min-height, active scale feedback
✅ Applied mobile-first responsive layout matching exam page
✅ Updated loading & error states to match exam page design
✅ Dev server compilation successful with no errors

**Key Changes Made:**
- Main container: Changed from `max-w-4xl` to mobile-first (`w-full px-4 md:max-w-[640px] lg:max-w-[768px]`)
- Grade card: Responsive grade size (`text-7xl sm:text-8xl md:text-9xl`)
- Statistics: 2-column grid on mobile with 3rd card spanning 2 columns
- Questions: Stack vertically on mobile, side-by-side answers changed to vertical stacking
- Metadata: Vertical list on mobile, 2-column grid on tablet+
- Buttons: Full-width stacked on mobile, inline on desktop
- All cards: Changed to `rounded-xl shadow-lg` with increased mobile padding

**Status:** Phase 2.5 COMPLETED

---

## Detailed Task List for Remaining Phases

### Phase 2: Mobile-First Layout Redesign (Claude - 4-5 hours)

**Status:** ✅ COMPLETED

#### 2.1 Page Structure Refactoring
- [x] Update main container from `max-w-4xl` to mobile-first approach
- [x] Implement three-tier responsive layout:
  - [x] Mobile (320px-768px): Full width with 16px padding
  - [x] Tablet (768px-1024px): Max-width 640px, centered
  - [x] Desktop (1024px+): Max-width 768px, centered
- [x] Remove horizontal scrolling on all screen sizes

#### 2.2 Header Component (Sticky)
- [x] Make header sticky with `position: sticky; top: 0`
- [x] Reduce height to 60px on mobile
- [x] Stack subject/grade vertically on mobile instead of side-by-side
- [x] Update progress display: "X/Y" format without "Question" prefix
- [x] Add progress bar below question counter (full width on mobile)
- [x] Ensure z-index works with other sticky elements

#### 2.3 Question Card Redesign
- [x] Convert question container to card style:
  - [x] Add white background with shadow: `shadow-lg`
  - [x] Add rounded corners: `rounded-xl`
  - [x] Add padding: 20px mobile, 24px tablet, 32px desktop
- [x] Redesign question type badge:
  - [x] Use icon + abbreviation (⭕ MC, ✓✗ T/F, etc.)
  - [x] Position in top-left of card
- [x] Move points display to top-right (⭐ 2 pts)
- [x] Increase question text size on mobile (text-lg → text-xl)
- [x] Ensure card fills available vertical space between header/footer

#### 2.4 Answer Input Enhancement
- [x] Increase touch target sizes:
  - [x] Radio buttons: 48x48px minimum (was 4x4)
  - [x] Option containers: min-height 56px with padding
  - [x] Increase text size in options (text-base → text-lg on mobile)
- [x] Add active/pressed states for mobile:
  - [x] Tap feedback with scale or background color change
  - [x] Visual indication when option is selected
- [x] Improve textarea for text answers:
  - [x] Minimum height: 120px on mobile
  - [x] Larger font size: text-lg
  - [x] Better focus states

#### 2.5 Navigation Bar (Sticky Bottom)
- [x] Create sticky bottom navigation bar:
  - [x] Position: `position: sticky; bottom: 0`
  - [x] Height: 80px on mobile, 72px on tablet
  - [x] White background with top border/shadow
  - [x] z-index above content
- [x] Redesign navigation buttons:
  - [x] PREV button: Left-aligned, min-width 100px
  - [x] NEXT/SUBMIT button: Right-aligned, min-width 100px
  - [x] Both buttons: min-height 48px, large touch targets
  - [x] Center progress indicator between buttons (X/Y with %)
- [x] Remove old question navigation dots (or make optional)

#### 2.6 Progress Summary Card
- [x] Make collapsible on mobile (default collapsed)
- [x] Add expand/collapse button with icon
- [x] Stack stats vertically on mobile instead of 3-column grid
- [x] Use larger numbers and icons
- [x] Option: Move to separate slide-out panel on mobile

#### 2.7 Mode Selection (Retake/Review)
- [x] Convert to tab-style switcher
- [x] Make full-width on mobile
- [x] Larger tap targets (48px height minimum)
- [x] Clear visual indication of active mode

#### 2.8 Confirmation Dialog
- [x] Redesign for mobile:
  - [x] Full-screen overlay on mobile (was small modal)
  - [x] Centered modal on tablet/desktop
  - [x] Larger buttons (full-width on mobile, side-by-side on tablet+)
  - [x] Stack buttons vertically on narrow screens (< 400px)
  - [x] Clear visual hierarchy (warning icon, short text, actions)

#### 2.9 Review Mode Updates
- [x] Apply same card styling to results display
- [x] Ensure grade display is prominent on mobile
- [x] Stack statistics vertically on mobile
- [x] Make emoji/icons larger on mobile (text-6xl → text-8xl)

#### 2.10 Loading & Error States
- [x] Update loading spinner size for mobile (larger)
- [x] Ensure error messages are readable on small screens
- [x] Add proper spacing and padding for mobile error states

---

### Phase 3: Enhanced Mobile Features (User - 2-3 hours)

**Status:** Pending - Requires UX decisions

#### 3.1 Swipe Navigation (Optional)
- [ ] **Decision needed:** Enable swipe gestures?
- [ ] If yes: Install and configure `react-swipeable`
- [ ] Implement swipe left → next question
- [ ] Implement swipe right → previous question
- [ ] Add visual feedback during swipe
- [ ] Test on various mobile devices

#### 3.2 Auto-Save Functionality
- [ ] **Decision needed:** Auto-save to localStorage or database?
- [ ] Implement auto-save on answer change (debounced)
- [ ] Show save indicator (optional)
- [ ] Restore progress on page reload
- [ ] Show warning before restoring old answers
- [ ] Clear saved data on successful submission

#### 3.3 Scroll Behavior
- [ ] **Claude can do:** Auto-scroll to top on question change
- [ ] Smooth scroll animation
- [ ] Ensure scroll doesn't interfere with sticky elements
- [ ] Test scroll behavior on iOS Safari (known issues)

#### 3.4 Optimistic UI Updates
- [ ] **Claude can do:** Instant visual feedback on answer selection
- [ ] Update UI immediately, API call in background
- [ ] Handle API failures gracefully
- [ ] Show retry option on failure

#### 3.5 Offline Support (Optional)
- [ ] **Decision needed:** Priority? Scope?
- [ ] If yes: Implement service worker
- [ ] Cache exam data
- [ ] Queue answer submissions
- [ ] Sync when back online
- [ ] Show online/offline indicator

---

### Phase 4: Accessibility & Polish (Split: Claude + User)

**Status:** Pending approval

#### 4.1 Accessibility (Claude - 1.5 hours)
- [ ] Add comprehensive ARIA labels to all interactive elements
- [ ] Implement keyboard navigation:
  - [ ] Tab through questions, answers, navigation
  - [ ] Enter/Space to select answers
  - [ ] Arrow keys for question navigation (optional)
- [ ] Add skip links for screen readers
- [ ] Ensure proper heading hierarchy (h1 → h2 → h3)
- [ ] Test with VoiceOver (macOS) - report findings
- [ ] Add focus-visible styles (not just focus)
- [ ] Verify color contrast meets WCAG AA:
  - [ ] Text: 4.5:1 minimum
  - [ ] Interactive elements: 3:1 minimum
- [ ] Add loading announcements for screen readers

#### 4.2 Visual Polish (User - 1 hour)
- [ ] **Needs your eyes:** Fine-tune spacing and alignment
- [ ] **Needs your eyes:** Adjust shadow depth for cards
- [ ] **Needs your eyes:** Refine color palette if needed
- [ ] **Needs your eyes:** Typography scale adjustments
- [ ] **Your decision:** Final icon choices (emoji vs SVG)

#### 4.3 Animations & Micro-interactions (User - 0.5 hours)
- [ ] **Your feel:** Page transition animations (if desired)
- [ ] **Your feel:** Button press feedback timing
- [ ] **Your feel:** Progress bar animation speed
- [ ] **Your feel:** Card entrance animations (optional)
- [ ] **Your preference:** Install `framer-motion` if needed

#### 4.4 Error Handling (Claude - 0.5 hours)
- [ ] Improve error messages (more specific, helpful)
- [ ] Add retry mechanisms with exponential backoff
- [ ] Create fallback UI for catastrophic errors
- [ ] Log errors for debugging (console only, not production)

---

### Phase 5: Testing & Documentation (User - 1-2 hours)

**Status:** Pending - Requires your devices and approval

#### 5.1 Device Testing (User - requires physical devices)
- [ ] **iPhone SE (375px)** - smallest target
- [ ] **iPhone 12/13 (390px)** - common size
- [ ] **iPhone 14 Pro Max (430px)** - large phone
- [ ] **iPad (768px)** - tablet
- [ ] **iPad Pro (1024px)** - large tablet
- [ ] **Desktop (1440px+)** - standard desktop

#### 5.2 Browser Testing (User)
- [ ] Safari (iOS) - webkit engine, known scroll issues
- [ ] Safari (macOS) - desktop version
- [ ] Chrome (Android) - most common mobile
- [ ] Chrome (Desktop) - development browser
- [ ] Firefox (Desktop) - gecko engine
- [ ] Edge (Desktop) - chromium-based

#### 5.3 Functionality Testing (User)
- [ ] Complete full exam flow (all question types)
- [ ] Test all navigation methods (PREV/NEXT, dots, swipe if enabled)
- [ ] Verify progress tracking accuracy
- [ ] Test submission flow and confirmation
- [ ] Verify error states display correctly
- [ ] Test loading states
- [ ] Verify review mode displays correctly
- [ ] Test mode switching (take → review → take)

#### 5.4 Accessibility Testing (User + Tools)
- [ ] **VoiceOver (iOS)** - full exam flow
- [ ] **VoiceOver (macOS)** - full exam flow
- [ ] **Keyboard only** - complete exam without mouse
- [ ] **Color blindness simulation** - verify all states visible
- [ ] **Zoom to 200%** - ensure no horizontal scroll
- [ ] Run Lighthouse audit - target score >90

#### 5.5 Performance Testing (User)
- [ ] Measure load time (target <3s)
- [ ] Check animation smoothness (60fps)
- [ ] Monitor memory usage on mobile
- [ ] Test on slow 3G network (if offline not implemented)

#### 5.6 Documentation (Claude - 0.5 hours)
- [ ] Update README with new UI approach
- [ ] Document responsive breakpoints
- [ ] Document UI constants usage
- [ ] Create simple component docs (if needed)

---

## Task Assignment Summary

### Claude Should Do (9-11 hours total):
✅ **Phase 1:** Constants extraction (COMPLETED)
✅ **Phase 2:** Mobile-first layout redesign - Exam page (COMPLETED)
⏳ **Phase 2.5:** Mobile-first layout redesign - Grading page (3-4 hours)
⏳ **Phase 4.1:** Accessibility foundations (1.5 hours)
⏳ **Phase 4.4:** Error handling improvements (0.5 hours)
⏳ **Phase 3.3-3.4:** Scroll behavior & optimistic UI (0.5 hours)
⏳ **Phase 5.6:** Documentation updates (0.5 hours)

### User Should Do (4.5-6 hours total):
⏳ **Phase 3.1-3.2, 3.5:** Mobile features requiring decisions (2-3 hours)
⏳ **Phase 4.2-4.3:** Visual polish & animations (1.5 hours)
⏳ **Phase 5.1-5.5:** All testing (1-2 hours)

### Total Effort: 13.5-17 hours (was estimated 11-15 hours before adding grading page)

---

## Ready to Proceed?

**Next Step Options:**

1. **Option A (Recommended):** Approve Phase 2 only → I implement → You review → Then decide on Phases 3-5
2. **Option B:** Approve Phase 2 + 4.1 + 4.4 together → I implement all accessibility/layout → You handle features/polish/testing
3. **Option C:** Revise task list → Re-plan → Then proceed

---

## DECISION MADE: October 2, 2025

**Approved Scope:**
- ✅ **Phase 2: Mobile-First Layout Redesign - Exam Page** (COMPLETED)
- ⏳ **Phase 2.5: Mobile-First Layout Redesign - Grading Page** (Claude will implement next)
- ⏭️ **Phase 4.1 & 4.4: Accessibility & Error Handling** (Claude will implement after 2.5)
- ⏭️ **Phase 3: Enhanced Mobile Features** - SKIPPED (not needed now)
- ⏭️ **Phase 4.2 & 4.3: Visual Polish & Animations** - User will handle after Phase 2+2.5+4
- ⏭️ **Phase 5: Testing** - User will handle

**Implementation Plan:**
1. ✅ Claude implements Phase 2 - Exam page (COMPLETED)
2. ⏳ Claude implements Phase 2.5 - Grading page (IN PROGRESS)
3. ⏭️ Claude implements Phase 4.1 & 4.4 (accessibility + error handling)
4. ⏭️ User reviews implementation
5. ⏭️ User handles visual polish/animations if desired
6. ⏭️ User performs testing and approves

**Estimated Time:**
- ✅ Claude Phase 2: 4-5 hours (COMPLETED)
- ⏳ Claude Phase 2.5: 3-4 hours (NEXT)
- ⏭️ Claude Phase 4: 2 hours
- ⏭️ User review & polish: As needed
- ⏭️ User testing: 1-2 hours

**Status:** Phase 2 completed, moving to Phase 2.5 (Grading page redesign)
