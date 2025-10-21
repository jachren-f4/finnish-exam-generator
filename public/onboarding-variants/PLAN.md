# Exam Page Onboarding Flow - Implementation Plan

## Overview
Create a first-time user onboarding experience for the exam taking page that teaches users how to navigate and complete exams.

## Requirements
- ✅ Show only on first visit to each exam
- ✅ Support both swipe gestures (mobile) and button clicks (desktop)
- ✅ Quick to dismiss (skip button always visible)
- ✅ Use localStorage for persistence
- ✅ Match ExamGenie design system

## Detection Strategy

### localStorage Key
```typescript
const ONBOARDING_KEY = 'examgenie_onboarding_seen'

interface OnboardingData {
  [examId: string]: boolean
}
```

### Check Pattern
```typescript
function hasSeenOnboarding(examId: string): boolean {
  try {
    const data = localStorage.getItem(ONBOARDING_KEY)
    if (!data) return false
    const parsed = JSON.parse(data)
    return parsed[examId] === true
  } catch {
    return false
  }
}

function markOnboardingSeen(examId: string): void {
  try {
    const data = localStorage.getItem(ONBOARDING_KEY) || '{}'
    const parsed = JSON.parse(data)
    parsed[examId] = true
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(parsed))
  } catch (error) {
    console.error('Failed to save onboarding status:', error)
  }
}
```

## Onboarding Content (4 screens)

### Screen 1: Welcome
**Visual:** Large welcome icon (👋 or exam icon)
**Title:** "Welcome to Your Exam!"
**Description:** "Let's take a quick tour to show you how it works."
**Action:** Next button / Swipe right

### Screen 2: Navigate Questions
**Visual:** Arrow icons showing navigation
**Title:** "Navigate Questions"
**Description:** "Swipe left/right or use the arrow buttons to move between questions."
**Action:** Next button / Swipe right

### Screen 3: Select Answers
**Visual:** Multiple choice options illustration
**Title:** "Select Your Answers"
**Description:** "Tap an option to select your answer. You can change it anytime before submitting."
**Action:** Next button / Swipe right

### Screen 4: Submit Exam
**Visual:** Checkmark icon
**Title:** "Submit When Ready"
**Description:** "Once you've answered all questions, tap Submit to see your results!"
**Action:** "Got it!" button (dismisses onboarding)

## Gesture Support

### Touch Events (Mobile)
```typescript
let touchStartX = 0
let touchEndX = 0

onTouchStart = (e) => {
  touchStartX = e.changedTouches[0].screenX
}

onTouchEnd = (e) => {
  touchEndX = e.changedTouches[0].screenX
  handleSwipe()
}

handleSwipe = () => {
  const swipeThreshold = 50
  if (touchStartX - touchEndX > swipeThreshold) {
    // Swiped left - next screen
    goToNextScreen()
  }
  if (touchEndX - touchStartX > swipeThreshold) {
    // Swiped right - previous screen
    goToPreviousScreen()
  }
}
```

### Keyboard Support (Desktop)
- Arrow Right: Next screen
- Arrow Left: Previous screen
- Escape: Dismiss onboarding
- Enter/Space: Next screen (or dismiss on last screen)

## Design Variants

### Variant 1: Full-Screen Carousel
**Approach:** Instagram/Snapchat story-style full-screen slides
**Pros:**
- Immersive, focused experience
- Familiar pattern from social media
- Maximum visual space for illustrations
**Cons:**
- Blocks entire exam view
- Might feel heavy for quick learners

### Variant 2: Modal Overlay
**Approach:** Centered modal dialog with semi-transparent backdrop
**Pros:**
- Less intrusive than full-screen
- Desktop-friendly design
- Users can see exam content behind
**Cons:**
- Less mobile-native feeling
- Smaller space for content

### Variant 3: Bottom Sheet
**Approach:** Slide-up sheet from bottom (similar to retake UI)
**Pros:**
- Minimal intrusion
- Matches existing ExamGenie patterns
- Quick to dismiss
**Cons:**
- Less space for content
- Might be missed by users

## Integration Points

### In take/page.tsx
```typescript
const [showOnboarding, setShowOnboarding] = useState(false)

useEffect(() => {
  if (examId && !hasSeenOnboarding(examId)) {
    setShowOnboarding(true)
  }
}, [examId])

const dismissOnboarding = () => {
  markOnboardingSeen(examId)
  setShowOnboarding(false)
}
```

### Component Structure
```
<ExamPage>
  {showOnboarding && (
    <OnboardingOverlay
      onDismiss={dismissOnboarding}
      variant="carousel" // or "modal" or "bottomSheet"
    />
  )}
  {/* Existing exam content */}
</ExamPage>
```

## Implementation Steps

1. **Phase 1: Static Prototypes** (Current)
   - Create 3 HTML variant prototypes
   - Review and select preferred design

2. **Phase 2: Component Development**
   - Create `<OnboardingOverlay>` component
   - Implement swipe gesture detection
   - Add keyboard navigation
   - Wire up localStorage persistence

3. **Phase 3: Integration**
   - Add to take/page.tsx
   - Test on mobile and desktop
   - Add i18n support (Finnish/English)

4. **Phase 4: Polish**
   - Add animations/transitions
   - Test accessibility (screen readers, keyboard-only)
   - Add analytics tracking (optional)

## Testing Checklist

- [ ] Shows only on first visit per exam
- [ ] Can be dismissed with skip button
- [ ] Swipe left advances to next screen
- [ ] Swipe right goes to previous screen
- [ ] Arrow keys work on desktop
- [ ] Escape key dismisses overlay
- [ ] Auto-dismisses after last screen
- [ ] localStorage persists correctly
- [ ] Works on iOS Safari (touch events)
- [ ] Works on Android Chrome (touch events)
- [ ] Works on desktop browsers (mouse + keyboard)
- [ ] Respects user's existing exam progress
- [ ] Doesn't interfere with exam functionality

## Open Questions

1. Should onboarding be per-exam or global (show once ever)?
   - **Recommendation:** Per-exam allows users to see it again for different exam types

2. Should there be a "Don't show again" option?
   - **Recommendation:** Yes, add checkbox on first screen

3. Should we show different onboarding for retake mode?
   - **Recommendation:** No, one onboarding is enough - retakes are self-explanatory

## Notes

- Keep animations short (<300ms) for quick users
- Use design tokens from `/src/constants/design-tokens.ts`
- Match button styles from existing exam UI
- Consider adding subtle background blur to overlays
- Test on actual devices, not just browser dev tools
