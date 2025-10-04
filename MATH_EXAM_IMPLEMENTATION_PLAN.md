# Math Exam Implementation Plan
**ExamGenie - Mathematical Notation Support**

## Executive Summary

The current ExamGenie system uses plain text input for exam answers, which is inadequate for mathematics education from elementary arithmetic through high school algebra and trigonometry. This document outlines a comprehensive plan to support mathematical notation, equation input, and intelligent grading for math-specific exams.

**Focus:** This plan emphasizes **visual examples** and **user experience** over technical implementation details.

---

## Problem Statement

### Current Limitations

**What Students See Now:**
```
Question: "Solve: x² + 5x + 6 = 0"
Answer Input: [Text box: "x=-2 or x=-3"]
```

**Problems:**
- No proper mathematical symbols
- Typing "x²" requires awkward keyboard combinations
- Fractions look ugly: "3/4" instead of ¾
- No visual feedback on correctness of notation
- Difficult on mobile devices

---

## High School Math Topics - Visual Examples

### 1. Quadratic Equations

**Traditional Lukio Question:**
```
Ratkaise toisen asteen yhtälö: x² - 5x + 6 = 0
```

**What Student Sees on Screen:**

```
┌─────────────────────────────────────────────────────┐
│  Ratkaise toisen asteen yhtälö:                    │
│                                                      │
│         x² - 5x + 6 = 0                             │
│                                                      │
│  (Beautiful rendered equation with proper spacing)  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Vastauksesi:                                       │
│                                                      │
│  [Equation Editor showing: x = ___________]         │
│                                                      │
│  Useful buttons below:                              │
│  [±] [√] [²] [x²] [()  [,]  [=]                    │
│                                                      │
│  Preview: x = 2, x = 3  ✓ looks good!             │
└─────────────────────────────────────────────────────┘
```

**Student Experience:**
1. Taps in answer field
2. Types "x = 2"
3. Taps [,] button to add another solution
4. Types "x = 3"
5. Sees live preview: "x = 2, x = 3" with proper formatting
6. Submits answer

**What We Accept:**
- `x = 2, x = 3`
- `x = 3, x = 2` (order doesn't matter)
- `x₁ = 2, x₂ = 3`
- Just `2, 3` (implicit x =)

---

### 2. Trigonometric Equations

**Traditional Lukio Question:**
```
Ratkaise trigonometrinen yhtälö välillä [0°, 360°]:
sin(2x) = √3/2
```

**What Student Sees:**

```
┌─────────────────────────────────────────────────────┐
│  Ratkaise trigonometrinen yhtälö välillä [0°, 360°]:│
│                                                      │
│              √3                                      │
│  sin(2x) = ─────                                    │
│              2                                       │
│                                                      │
│  (Perfectly rendered with proper fraction)          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Anna kaikki ratkaisut:                             │
│                                                      │
│  Solution 1: [30] °                                 │
│  Solution 2: [150] °   [+ Lisää ratkaisu]          │
│  Solution 3: [390] °                                │
│  Solution 4: [510] °                                │
│                                                      │
│  Common angles: [30°] [45°] [60°] [90°]            │
│  Trig buttons: [sin] [cos] [tan] [θ] [π]          │
└─────────────────────────────────────────────────────┘

Optional visual aid below:
┌─────────────────────────────────────────────────────┐
│     Unit Circle Visualization                       │
│                                                      │
│         •(30°) •(150°)                              │
│       /         \                                   │
│      /           \                                  │
│     •─────────────•                                 │
│      \           /                                  │
│       \ (210°) /(330°)                             │
│         •     •                                     │
│                                                      │
│  Click to select angles on circle                   │
└─────────────────────────────────────────────────────┘
```

**Student Experience:**
1. Recognizes sin(2x) = √3/2
2. Knows 2x must be 60° or 120°
3. Enters x = 30° in first field
4. Clicks "+ Lisää ratkaisu" for more solutions
5. Can either type manually OR click on unit circle diagram
6. System shows all four solutions: 30°, 150°, 210°, 330°

**Visual Feedback:**
- ✓ Green checkmark when angle is entered
- Unit circle highlights the angle
- Shows all solutions on one view

---

### 3. Derivatives (Calculus)

**Traditional Lukio Question:**
```
Derivoi funktio: f(x) = 3x⁴ - 2x² + 5x - 7
```

**What Student Sees:**

```
┌─────────────────────────────────────────────────────┐
│  Derivoi funktio:                                   │
│                                                      │
│  f(x) = 3x⁴ - 2x² + 5x - 7                         │
│                                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Derivative: f'(x) = ___________________________   │
│                                                      │
│  Symbol palette:                                    │
│  [xⁿ] [√] [¹⁄ₓ] [eˣ] [ln] [sin] [cos]             │
│                                                      │
│  Live preview as you type:                          │
│  f'(x) = 12x³ - 4x + 5                             │
│                                                      │
│  ✓ Looks correct!                                   │
└─────────────────────────────────────────────────────┘

Optional: Show work section
┌─────────────────────────────────────────────────────┐
│  ☐ Näytä työvaiheet (optional bonus points)        │
│                                                      │
│  Step 1: d/dx(3x⁴) = 12x³                          │
│  Step 2: d/dx(-2x²) = -4x                          │
│  Step 3: d/dx(5x) = 5                              │
│  Step 4: d/dx(-7) = 0                              │
│                                                      │
│  Combined: f'(x) = 12x³ - 4x + 5                   │
└─────────────────────────────────────────────────────┘
```

**Student Experience:**
1. Sees the function beautifully rendered
2. Clicks in answer field
3. Types using keyboard OR clicks symbol buttons
4. As they type "12x^3", preview shows: 12x³
5. Continues: "- 4x + 5"
6. Sees live preview with proper formatting
7. Optionally shows step-by-step work for partial credit

**What We Accept:**
- `12x³ - 4x + 5`
- `12x^3 - 4x + 5` (plain text exponent)
- `-4x + 12x³ + 5` (different order of terms)
- `5 - 4x + 12x³` (any valid algebraic form)

---

### 4. Integrals (Calculus)

**Traditional Lukio Question:**
```
Laske määrätty integraali: ∫₀² (3x² + 2x) dx
```

**What Student Sees:**

```
┌─────────────────────────────────────────────────────┐
│  Laske määrätty integraali:                        │
│                                                      │
│      2                                               │
│     ⌠                                                │
│     ⎮  (3x² + 2x) dx                               │
│     ⌡                                                │
│     0                                                │
│                                                      │
│  (Beautiful integral symbol with bounds)            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Antiderivatiivi (välivaihe):                      │
│                                                      │
│  F(x) = [____________]                              │
│                                                      │
│  Symbol palette:                                    │
│  [xⁿ] [+C] [ln] [eˣ] [sin] [cos]                   │
│                                                      │
│  Preview: F(x) = x³ + x² + C                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Lopullinen vastaus:                                │
│                                                      │
│  F(2) - F(0) = [________]                          │
│                                                      │
│  Preview: 8 + 4 - 0 = 12                           │
│                                                      │
│  Numeric keypad:                                    │
│  [7] [8] [9]                                        │
│  [4] [5] [6]                                        │
│  [1] [2] [3]                                        │
│  [0] [.] [-]                                        │
└─────────────────────────────────────────────────────┘
```

**Student Experience:**
1. Sees integral with proper mathematical notation
2. First enters antiderivative: x³ + x²
3. System optionally asks for "+ C" (or auto-adds it)
4. Then calculates: F(2) - F(0) = 12
5. Final answer: simple number

**Two-Part Question Structure:**
- **Part A:** Antiderivative (symbolic) - uses equation editor
- **Part B:** Final numerical answer - simple number input

---

### 5. Systems of Equations

**Traditional Lukio Question:**
```
Ratkaise yhtälöpari:
2x + 3y = 12
x - y = 1
```

**What Student Sees:**

```
┌─────────────────────────────────────────────────────┐
│  Ratkaise yhtälöpari:                               │
│                                                      │
│  { 2x + 3y = 12                                     │
│  { x - y = 1                                        │
│                                                      │
│  (Curly brace shows it's a system)                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Ratkaisu:                                          │
│                                                      │
│  x = [_____]     y = [_____]                       │
│                                                      │
│  OR enter as ordered pair:                          │
│                                                      │
│  (x, y) = ( [___] , [___] )                        │
│                                                      │
│  Preview: (3, 2)                                    │
└─────────────────────────────────────────────────────┘

Optional verification:
┌─────────────────────────────────────────────────────┐
│  ☐ Tarkista vastauksesi                            │
│                                                      │
│  Substituting x=3, y=2:                             │
│    2(3) + 3(2) = 6 + 6 = 12 ✓                      │
│    3 - 2 = 1 ✓                                      │
│                                                      │
│  Both equations satisfied!                          │
└─────────────────────────────────────────────────────┘
```

**Student Experience:**
1. Sees system with proper formatting
2. Solves (by any method: substitution, elimination, graphing)
3. Enters x = 3 and y = 2
4. Can optionally check answer before submitting
5. System verifies both equations are satisfied

---

### 6. Polynomial Factoring

**Traditional Lukio Question:**
```
Jaa tekijöihin: x² - 9
```

**What Student Sees:**

```
┌─────────────────────────────────────────────────────┐
│  Jaa tekijöihin:                                    │
│                                                      │
│  x² - 9                                             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Tekijöihin jaettu muoto:                          │
│                                                      │
│  [____________]                                      │
│                                                      │
│  Templates (click to insert):                       │
│  [(x+_)(x+_)]  [(x+_)(x-_)]  [(x-_)(x-_)]         │
│                                                      │
│  Preview: (x + 3)(x - 3)                           │
│                                                      │
│  ✓ Expands to: x² - 9                              │
└─────────────────────────────────────────────────────┘
```

**Student Experience:**
1. Recognizes difference of squares pattern
2. Clicks template `(x+_)(x-_)` to get structure
3. Fills in: (x + 3)(x - 3)
4. System verifies by expanding: equals original ✓

**Smart Validation:**
- Accepts: `(x+3)(x-3)`
- Accepts: `(x-3)(x+3)` (commutative)
- Accepts: `(3+x)(-3+x)` (alternative forms)
- Rejects: `x(x-9)` (incorrect factoring)

---

### 7. Logarithmic Equations

**Traditional Lukio Question:**
```
Ratkaise yhtälö: log₂(x) + log₂(x-3) = 2
```

**What Student Sees:**

```
┌─────────────────────────────────────────────────────┐
│  Ratkaise yhtälö:                                   │
│                                                      │
│  log₂(x) + log₂(x - 3) = 2                         │
│                                                      │
│  (Subscript 2 properly formatted)                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Ratkaisu: x = [_____]                             │
│                                                      │
│  Log functions:                                     │
│  [log] [ln] [log₂] [log₁₀] [eˣ]                   │
│                                                      │
│  Preview: x = 4                                     │
│                                                      │
│  Domain check:                                      │
│  ✓ x > 0                                            │
│  ✓ x - 3 > 0 → x > 3                               │
│  ✓ x = 4 is valid                                   │
└─────────────────────────────────────────────────────┘
```

**Student Experience:**
1. Solves using logarithm properties
2. Gets x = 4
3. Enters answer
4. System automatically checks domain restrictions
5. Shows why answer is valid

---

### 8. Matrices (Advanced Lukio)

**Traditional Lukio Question:**
```
Laske matriisien tulo:
[2  1]   [3]
[4 -1] · [2]
```

**What Student Sees:**

```
┌─────────────────────────────────────────────────────┐
│  Laske matriisien tulo:                             │
│                                                      │
│  ⎡ 2   1⎤   ⎡3⎤                                     │
│  ⎣ 4  -1⎦ · ⎣2⎦                                     │
│                                                      │
│  (Proper matrix brackets)                           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Tulos (2x1 matriisi):                             │
│                                                      │
│  ⎡ [____] ⎤                                         │
│  ⎣ [____] ⎦                                         │
│                                                      │
│  Matrix builder:                                    │
│  [Resize] [2x1] [2x2] [3x3]                        │
│                                                      │
│  Preview:                                           │
│  ⎡  8 ⎤                                             │
│  ⎣ 10 ⎦                                             │
└─────────────────────────────────────────────────────┘
```

**Student Experience:**
1. Sees matrices with proper brackets
2. Clicks matrix builder to create 2×1 result matrix
3. Calculates: (2·3 + 1·2) = 8, (4·3 + (-1)·2) = 10
4. Enters values
5. Sees live preview with proper formatting

---

### 9. Complex Numbers

**Traditional Lukio Question:**
```
Laske: (3 + 2i)(1 - 4i)
```

**What Student Sees:**

```
┌─────────────────────────────────────────────────────┐
│  Laske:                                             │
│                                                      │
│  (3 + 2i)(1 - 4i)                                  │
│                                                      │
│  Anna vastaus muodossa a + bi                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Vastaus:                                           │
│                                                      │
│  Real part:      [_____]                           │
│  Imaginary part: [_____] i                         │
│                                                      │
│  OR enter directly:                                 │
│                                                      │
│  [___________] + [___________]i                     │
│                                                      │
│  Preview: 11 - 10i                                  │
│                                                      │
│  Complex number tools:                              │
│  [a+bi] [r·e^(iθ)] [|z|] [arg(z)]                 │
└─────────────────────────────────────────────────────┘
```

**Student Experience:**
1. Expands using FOIL method
2. Remembers i² = -1
3. Enters real part: 11
4. Enters imaginary part: -10
5. Sees preview: 11 - 10i

---

### 10. Rational Expressions

**Traditional Lukio Question:**
```
Sievennä lauseke: (x² - 4)/(x² - 4x + 4)
```

**What Student Sees:**

```
┌─────────────────────────────────────────────────────┐
│  Sievennä lauseke:                                  │
│                                                      │
│      x² - 4                                          │
│  ─────────────                                      │
│   x² - 4x + 4                                       │
│                                                      │
│  (Proper fraction bar)                              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Sievennetty muoto:                                 │
│                                                      │
│  Numerator:   [____________]                        │
│  ───────────                                        │
│  Denominator: [____________]                        │
│                                                      │
│  Fraction builder:                                  │
│  [Insert fraction template]                         │
│                                                      │
│  Preview:                                           │
│      x + 2                                           │
│  ──────────                                         │
│     x - 2                                            │
│                                                      │
│  Domain restrictions: x ≠ 2                         │
└─────────────────────────────────────────────────────┘
```

**Student Experience:**
1. Factors numerator: (x+2)(x-2)
2. Factors denominator: (x-2)(x-2)
3. Cancels (x-2)
4. Enters simplified: (x+2)/(x-2)
5. System notes domain restriction

---

## Visual Interface Mockups

### Mobile Phone View (Exam Taking)

```
╔═══════════════════════════════════════════════╗
║  ◀ Kysymys 5/15                    ⋮ Menu    ║
╠═══════════════════════════════════════════════╣
║                                               ║
║  Derivoi funktio:                             ║
║                                               ║
║       f(x) = sin(x²)                         ║
║                                               ║
║  Käytä ketjusääntöä.                         ║
║                                               ║
╠═══════════════════════════════════════════════╣
║  Vastauksesi:                                 ║
║                                               ║
║  f'(x) = ┌─────────────────────────┐        ║
║          │ 2x·cos(x²)              │        ║
║          └─────────────────────────┘        ║
║                                               ║
║  Preview:                                     ║
║    f'(x) = 2x cos(x²)  ✓                     ║
║                                               ║
╠═══════════════════════════════════════════════╣
║  Symbol Palette (swipe left for more):       ║
║                                               ║
║  [sin] [cos] [tan] [x²] [√] [π] [e] [ln]    ║
║                                               ║
╠═══════════════════════════════════════════════╣
║                                               ║
║     [Edellinen]          [Seuraava]          ║
║                                               ║
╚═══════════════════════════════════════════════╝
```

**Features:**
- Clean, single question view
- Swipeable symbol palette
- Live preview of formatted answer
- Navigation dots at top show progress

---

### Tablet View (Larger Screen)

```
╔═══════════════════════════════════════════════════════════════════╗
║  Matematiikan koe - Lukio MAA4 Vektorit          Aika: 45:23    ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  Kysymys 8/15: Vektorien pistetulo                               ║
║                                                                    ║
║  Laske vektorien a⃗ = (3, 4) ja b⃗ = (-2, 5) pistetulo.          ║
║                                                                    ║
║  ┌────────────────────────────────────────────────────────┐      ║
║  │  Vastaus: a⃗ · b⃗ = [________________]                 │      ║
║  │                                                         │      ║
║  │  Vector notation tools:                                │      ║
║  │  [a⃗] [b⃗] [·] [×] [(x,y)] [|v|]                       │      ║
║  │                                                         │      ║
║  │  Preview: a⃗ · b⃗ = 14                                  │      ║
║  └────────────────────────────────────────────────────────┘      ║
║                                                                    ║
║  Optional calculator:                                             ║
║  ┌────────────────────────────────────────────────────────┐      ║
║  │  Working space:                                         │      ║
║  │  (3)(-2) + (4)(5) = -6 + 20 = 14                       │      ║
║  └────────────────────────────────────────────────────────┘      ║
║                                                                    ║
║  Progress: ● ● ● ● ● ● ● ○ ○ ○ ○ ○ ○ ○ ○                     ║
║                                                                    ║
║  [◀ Edellinen]  [Tallenna]  [Seuraava ▶]                        ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

**Features:**
- More screen real estate for complex problems
- Optional scratch work area
- Persistent symbol palette
- Progress dots show all questions at once

---

## Key User Experience Principles

### 1. Progressive Disclosure
**Don't Overwhelm Students**

Elementary students see:
```
Simple numeric keypad
[7] [8] [9]
[4] [5] [6]
[1] [2] [3]
[0] [.] [←]
```

High school students see:
```
Full symbol palette with categories
[Basic: +×÷] [Powers: ² ³ ⁿ √] [Trig: sin cos tan]
[Calculus: ∫ d/dx lim] [Greek: α β θ π]
```

### 2. Live Preview
**What You Type is What You See**

As student types: `x^2 + 5x + 6`
Preview shows: `x² + 5x + 6` (beautifully formatted)

Benefits:
- Immediate feedback
- Catch notation errors
- Build confidence

### 3. Touch-Friendly
**Large Tap Targets on Mobile**

Bad:
```
[sin][cos][tan][cot][sec][csc] (too small, 30px)
```

Good:
```
┌─────┐ ┌─────┐ ┌─────┐
│ sin │ │ cos │ │ tan │  (48px minimum)
└─────┘ └─────┘ └─────┘
```

### 4. Smart Defaults
**Reduce Cognitive Load**

Question: "Solve for x: 2x + 5 = 13"
Pre-filled answer field: `x = _____`

Question: "Find all solutions: sin(θ) = 1/2"
Shows: `θ₁ = ___°, θ₂ = ___°`

### 5. Error Prevention
**Guide Students to Success**

Before submission:
```
┌────────────────────────────────────┐
│  ⚠️ Domain check:                  │
│                                     │
│  You entered: x = -3                │
│                                     │
│  But log(x) requires x > 0          │
│                                     │
│  Are you sure?                      │
│                                     │
│  [Review Answer] [Submit Anyway]   │
└────────────────────────────────────┘
```

---

## Grading Intelligence Examples

### Example 1: Equivalent Algebraic Forms

**Question:** Factor x² - 9

**We Accept All of These:**
- `(x+3)(x-3)` ✓
- `(x-3)(x+3)` ✓
- `-(−x+3)(x+3)` ✓
- `(3+x)(-3+x)` ✓

**How:** Symbolic algebra engine expands all forms and checks equivalence

### Example 2: Numerical Tolerance

**Question:** Calculate π × 5

**We Accept:**
- `15.708` ✓
- `15.71` ✓
- `15.7` ✓
- `16` ✓ (if question says "round to nearest integer")

**Reject:**
- `15` ✗ (too far off)
- `16.5` ✗ (incorrect)

**How:** Tolerance of ±0.01 (configurable per question)

### Example 3: Multiple Solutions (Set Comparison)

**Question:** Solve x² - 5x + 6 = 0

**Student enters:** `x = 3, x = 2`
**Correct answer:** `x = 2, x = 3`

**Result:** ✓ Correct (order doesn't matter)

**Partial Credit Example:**
Student enters: `x = 2` (only one solution)
**Result:** 50% credit (1 of 2 solutions)

### Example 4: Different Notations

**Question:** Express as a fraction: 0.75

**We Accept:**
- `3/4` ✓
- `6/8` ✓
- `75/100` ✓
- `0.75` ✓ (already a decimal, technically correct)

**Show to student:** "Simplify: 3/4 is the simplest form"

---

## Implementation Priorities

### Phase 1: Foundation (Week 1-3)
**Goal:** Get basic math notation working

**Deliverables:**
1. Questions display with LaTeX (using KaTeX library)
2. Simple numeric input for elementary math
3. Basic fraction input widget
4. Multiple choice with math symbols

**Visual Target:**
```
┌──────────────────────────────────┐
│  Mikä on 1/2 + 1/4?              │
│                                   │
│  a) 3/4 ✓                        │
│  b) 2/4                          │
│  c) 3/8                          │
│  d) 1/6                          │
└──────────────────────────────────┘
```

### Phase 2: Middle School (Week 4-7)
**Goal:** Algebra equation solving

**Deliverables:**
1. Symbol palette (±, ×, ÷, √, ², ³)
2. Equation editor with live preview
3. Algebraic equivalence checker
4. Support for scientific notation

**Visual Target:**
```
┌──────────────────────────────────┐
│  Solve: 2x + 5 = 13              │
│                                   │
│  x = [_____]                     │
│                                   │
│  [±] [²] [³] [√] [π]            │
│                                   │
│  Preview: x = 4 ✓                │
└──────────────────────────────────┘
```

### Phase 3: High School (Week 8-14)
**Goal:** Advanced notation support

**Deliverables:**
1. Full equation editor (MathLive)
2. Trigonometric functions
3. Calculus notation (∫, d/dx, lim)
4. Matrices and vectors
5. Complex numbers

**Visual Target:** (See all examples above)

---

## Success Metrics

### User Experience Metrics
- **Input Speed:** Students complete math answers in < 90 seconds
- **Error Rate:** < 3% notation errors
- **Satisfaction:** 4.5/5 stars from students
- **Mobile Usability:** 90%+ completion rate on phones

### Educational Metrics
- **Question Variety:** 10x more math question types
- **Grade 7-9 Adoption:** 70%+ for algebra
- **Lukio Adoption:** 50%+ for advanced math
- **Grading Accuracy:** 98%+ correct

### Technical Metrics
- **Render Speed:** < 100ms per equation
- **Mobile Performance:** 60fps smooth scrolling
- **Bundle Size:** < 500KB additional

---

## Conclusion

This plan transforms ExamGenie from a text-based exam system into a true mathematical learning platform. By focusing on visual clarity, touch-friendly interfaces, and intelligent grading, we enable authentic mathematical assessment from elementary through high school.

**The key insight:** Math education isn't about typing "x^2" - it's about seeing x² and understanding what it means. Our implementation prioritizes this visual and conceptual understanding over technical complexity.

---

**Next Steps:**
1. Get feedback from Finnish math teachers
2. Prototype equation editor (1 week)
3. User test with 10 lukio students
4. Refine based on feedback
5. Implement Phase 1 (3 weeks)

**Timeline:** 3 months to full high school support
**Cost:** Mostly development time (all libraries are free)
**Impact:** Enables authentic math assessment for 100% of curriculum

---

**Document Version:** 2.0 (Visual/UX Focus)
**Last Updated:** October 2025
**Status:** Planning / Design Phase
