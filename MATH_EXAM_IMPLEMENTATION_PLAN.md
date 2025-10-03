# Math Exam Implementation Plan
**ExamGenie - Mathematical Notation Support**

## Executive Summary

The current ExamGenie system uses plain text input for exam answers, which is inadequate for mathematics education from elementary arithmetic through high school algebra and trigonometry. This document outlines a comprehensive plan to support mathematical notation, equation input, and intelligent grading for math-specific exams.

---

## Problem Statement

### Current Limitations

**Text-Based Input:**
- Students can only type plain text answers
- No support for mathematical symbols: ∫, ∑, √, π, θ, ±, ≠, ≤, ≥, etc.
- Cannot express fractions, exponents, radicals properly
- No way to write equations like `x² + 2x + 1 = 0`
- Superscripts/subscripts impossible: `x₁`, `a²`

**Examples of What Doesn't Work:**

```
Elementary School:
- Fractions: "3/4 + 1/2" vs proper fraction notation
- Long division layout
- Place value alignment for addition/subtraction

Middle School:
- Exponents: "2^3" vs 2³
- Roots: "sqrt(16)" vs √16
- Scientific notation: "3.2 × 10^5"

High School:
- Algebra: "(x+2)(x-3) = x²-x-6"
- Trigonometry: "sin²θ + cos²θ = 1"
- Calculus: "∫(2x + 3)dx"
- Matrices, vectors, complex numbers
```

### Real-World Educational Requirements

**Finnish National Curriculum (Grades 1-9 + High School):**
- **Grades 1-2:** Basic arithmetic, number recognition
- **Grades 3-6:** Fractions, decimals, geometry, measurement
- **Grades 7-9:** Algebra, equations, functions, statistics
- **High School:** Advanced algebra, trigonometry, calculus, analytical geometry

---

## Solution Architecture

### Three-Tier Approach

#### **Tier 1: Elementary Math (Grades 1-6)**
**Complexity:** Low
**Priority:** High (largest user base)

**Question Types:**
- Basic arithmetic (addition, subtraction, multiplication, division)
- Simple fractions (visual + numeric)
- Decimal operations
- Word problems with numeric answers

**Input Method:**
- **Numeric keypad** with basic symbols: `0-9`, `.`, `/`, `-`
- Visual fraction selector for common fractions (½, ¼, ¾, etc.)
- Simple equation builder for basic operations

**Example Questions:**
```
Q: "Mikä on 3/4 + 1/2?"
A: [Fraction Input: Numerator: 5, Denominator: 4] or simplified [1 1/4]

Q: "Laske: 234 + 567"
A: [Numeric Input: 801]

Q: "Anna vastaus desimaalilukuna: 0.5 × 0.3"
A: [Decimal Input: 0.15]
```

**Implementation:**
- Custom React/Flutter components for fraction input
- Numeric validation with decimal support
- Visual feedback (show fraction as visual representation)

---

#### **Tier 2: Middle School Math (Grades 7-9)**
**Complexity:** Medium
**Priority:** High

**Question Types:**
- Linear equations and inequalities
- Basic algebra (solve for x)
- Exponents and roots
- Percentages and ratios
- Basic geometry (angles, areas, perimeters)
- Scientific notation

**Input Method:**
- **Enhanced equation editor** with:
  - Superscript/subscript buttons
  - Common symbols: π, √, ², ³, ±
  - Fraction builder
  - Variable input (x, y, a, b, etc.)
- **LaTeX-lite syntax** (simplified) with visual preview
- **Touch-friendly symbol palette**

**Example Questions:**
```
Q: "Ratkaise yhtälö: 2x + 5 = 13"
A: [Equation Editor: x = 4]

Q: "Laske: √(64)"
A: [Input: 8]

Q: "Ilmoita tieteellisenä notaationa: 45000"
A: [Scientific: 4.5 × 10⁴]
```

**Implementation:**
- Symbol palette with categorized buttons (operators, Greek letters, etc.)
- Live LaTeX/MathML preview
- Smart autocomplete for common patterns
- Template-based input for common equation types

---

#### **Tier 3: High School Math (Lukio/Upper Secondary)**
**Complexity:** High
**Priority:** Medium (smaller user base, higher value)

**Question Types:**
- Advanced algebra (polynomials, rational expressions)
- Trigonometry (identities, equations, graphing)
- Functions and their properties
- Calculus (derivatives, integrals, limits)
- Analytical geometry
- Matrices and vectors
- Complex numbers
- Sequences and series

**Input Method:**
- **Full mathematical equation editor**:
  - **LaTeX support** (industry standard)
  - **Visual equation builder** (drag-and-drop components)
  - **Handwriting recognition** (optional, for tablets)
  - Complete symbol library
- **Multi-line equation support**
- **Matrix/vector input**

**Example Questions:**
```
Q: "Derivoi funktio: f(x) = x³ + 2x² - 5x + 3"
A: [LaTeX: f'(x) = 3x^2 + 4x - 5]

Q: "Ratkaise trigonometrinen yhtälö: sin(2θ) = 1/2, kun 0° ≤ θ ≤ 360°"
A: [Multi-input: θ = 15°, 75°, 195°, 255°]

Q: "Laske integraali: ∫(3x² + 2x)dx"
A: [LaTeX: x^3 + x^2 + C]
```

**Implementation:**
- Full LaTeX rendering with MathJax or KaTeX
- Equation editor similar to Desmos, Symbolab, or WolframAlpha
- Step-by-step solution verification
- Support for multiple valid answer formats

---

## Technology Stack Evaluation

### Option 1: MathML (Mathematical Markup Language)
**Standard:** W3C web standard for displaying mathematical notation

**Pros:**
- Native web standard
- Semantic representation (meaning embedded)
- Accessible (screen reader support)
- No external dependencies

**Cons:**
- Verbose XML syntax
- Limited browser support (Safari good, Chrome inconsistent)
- Difficult to write manually
- Not widely used in practice

**Verdict:** ❌ Not recommended as primary solution

---

### Option 2: LaTeX + Rendering Library
**Standard:** De facto standard for mathematical typesetting

**Pros:**
- Industry standard (used by mathematicians, scientists, educators)
- Compact syntax: `\frac{1}{2}` → ½
- Extensive symbol support
- Excellent rendering libraries available
- Can be stored as plain text in database
- Works on web and mobile

**Cons:**
- Learning curve for students
- Requires rendering library (adds dependencies)
- Need to validate LaTeX syntax

**Rendering Libraries:**
- **KaTeX** (recommended): Fast, lightweight, no server-side dependencies
- **MathJax**: More features, slower, larger bundle size
- **react-katex**: React wrapper for KaTeX

**Verdict:** ✅ **Recommended for High School (Tier 3)**

**Example Implementation:**
```typescript
// Question storage
{
  "question_text": "Ratkaise yhtälö: $2x + 5 = 13$",
  "correct_answer": "$x = 4$",
  "answer_format": "latex"
}

// Rendering
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

<InlineMath math="2x + 5 = 13" />
<BlockMath math="\int_0^1 x^2 dx = \frac{1}{3}" />
```

---

### Option 3: Visual Equation Editor (WYSIWYG)
**Examples:** Mathquill, MathLive, Wiris

**Pros:**
- User-friendly (no syntax to learn)
- Visual feedback
- Touch-friendly for mobile
- Generates LaTeX in background
- Good for elementary/middle school

**Cons:**
- Requires JavaScript library
- More complex to implement
- Can be slow on older devices
- Limited to available UI components

**Best Libraries:**
- **MathLive** (https://cortexjs.io/mathlive/): Modern, well-maintained, React-friendly
- **Mathquill** (http://mathquill.com/): Older but stable
- **Wiris** (Commercial): Enterprise solution, expensive

**Verdict:** ✅ **Recommended for Middle School (Tier 2)**

**Example Implementation:**
```typescript
import MathLive from 'mathlive';

// Student types visually, system stores as LaTeX
<math-field
  id="equation-input"
  virtual-keyboard-mode="manual"
  onInput={(e) => setAnswer(e.target.value)}
>
  {initialValue}
</math-field>

// Returns: "2x+5=13" stored as LaTeX
```

---

### Option 4: Custom Input Components
**Approach:** Build custom UI for specific math operations

**Best for:** Elementary School (Tier 1)

**Components to Build:**
1. **Fraction Input:**
   ```typescript
   <FractionInput
     numerator={3}
     denominator={4}
     onChange={(n, d) => handleFractionChange(n, d)}
   />
   ```

2. **Numeric Keypad:**
   ```typescript
   <MathKeypad
     allowDecimals={true}
     allowNegative={true}
     allowFractions={true}
     onValueChange={(value) => setAnswer(value)}
   />
   ```

3. **Multiple Choice with Math:**
   ```typescript
   <MathMultipleChoice
     question="Mikä on 1/2 + 1/4?"
     options={[
       { latex: "\\frac{3}{4}", value: "3/4" },
       { latex: "\\frac{2}{4}", value: "2/4" },
       { latex: "\\frac{1}{8}", value: "1/8" }
     ]}
   />
   ```

**Verdict:** ✅ **Recommended for Elementary School (Tier 1)**

---

## Recommended Implementation Strategy

### Phase 1: Elementary Math Support (Tier 1) - MVP
**Timeline:** 2-3 weeks
**Complexity:** Low-Medium

**Components to Build:**
1. **Enhanced Multiple Choice** with LaTeX rendering (KaTeX)
2. **Numeric Input Component** with validation
3. **Fraction Input Widget** (visual + numeric)
4. **Math Keypad** for mobile devices

**Database Schema Changes:**
```sql
ALTER TABLE examgenie_questions
ADD COLUMN question_format VARCHAR(50) DEFAULT 'text', -- 'text', 'latex', 'math_structured'
ADD COLUMN answer_format VARCHAR(50) DEFAULT 'text',   -- 'text', 'numeric', 'fraction', 'latex'
ADD COLUMN answer_metadata JSONB;                      -- Store fraction parts, units, etc.

-- Example for fraction answer
{
  "type": "fraction",
  "numerator": 3,
  "denominator": 4,
  "mixed": false,
  "simplified": true
}
```

**Gemini Prompt Updates:**
```typescript
const MATH_ELEMENTARY_PROMPT = `
Generate math questions for grade ${grade} students.

ANSWER FORMATS:
1. Numeric: Simple number answers (integers or decimals)
2. Fraction: Answers in fraction form
3. Multiple choice with LaTeX rendering

OUTPUT STRUCTURE:
{
  "questions": [
    {
      "id": 1,
      "type": "numeric_input",
      "question_text": "Laske: 234 + 567",
      "question_format": "text",
      "correct_answer": "801",
      "answer_format": "numeric",
      "answer_metadata": {
        "allow_decimals": false,
        "min_value": 0,
        "max_value": 1000
      }
    },
    {
      "id": 2,
      "type": "fraction_input",
      "question_text": "Laske: $\\frac{1}{2} + \\frac{1}{4}$",
      "question_format": "latex",
      "correct_answer": "3/4",
      "answer_format": "fraction",
      "answer_metadata": {
        "numerator": 3,
        "denominator": 4,
        "accept_equivalent": true
      }
    }
  ]
}
`;
```

**Mobile Implementation (Flutter):**
```dart
// Fraction input widget
class FractionInputWidget extends StatefulWidget {
  final Function(int numerator, int denominator) onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TextField(
          keyboardType: TextInputType.number,
          decoration: InputDecoration(labelText: 'Osoittaja'),
          onChanged: (value) => updateFraction(int.parse(value), denominator),
        ),
        Divider(),
        TextField(
          keyboardType: TextInputType.number,
          decoration: InputDecoration(labelText: 'Nimittäjä'),
          onChanged: (value) => updateFraction(numerator, int.parse(value)),
        ),
      ],
    );
  }
}

// LaTeX rendering
import 'package:flutter_math_fork/flutter_math.dart';

Math.tex(
  r'\frac{1}{2} + \frac{1}{4} = \frac{3}{4}',
  textStyle: TextStyle(fontSize: 20),
)
```

---

### Phase 2: Middle School Support (Tier 2)
**Timeline:** 3-4 weeks
**Complexity:** Medium

**Components to Build:**
1. **Symbol Palette** (±, √, π, ², ³, etc.)
2. **Equation Builder** with templates
3. **LaTeX Preview** (live rendering)
4. **Scientific Calculator Integration** (optional)

**New Question Types:**
- `algebra_equation`: Solve for x
- `scientific_notation`: Express in form a × 10^n
- `exponent_expression`: Calculate powers and roots
- `geometry_calculation`: Angles, areas, perimeters

**Grading Enhancements:**
```typescript
// Algebraic equivalence checking
function checkAlgebraicEquivalence(studentAnswer: string, correctAnswer: string): boolean {
  // Use symbolic math library (e.g., mathjs, algebrite)
  const studentExpr = math.parse(studentAnswer);
  const correctExpr = math.parse(correctAnswer);

  // Check if expressions are equivalent
  return math.simplify(studentExpr).equals(math.simplify(correctExpr));
}

// Example:
checkAlgebraicEquivalence("2x + 4", "4 + 2x") // true
checkAlgebraicEquivalence("x^2 - 4", "(x-2)(x+2)") // true
```

**Math.js Integration:**
```typescript
import { create, all } from 'mathjs';
const math = create(all);

// Evaluate expressions
math.evaluate('sqrt(16)'); // 4
math.evaluate('2^3'); // 8
math.evaluate('sin(pi/2)'); // 1

// Symbolic simplification
math.simplify('2x + x'); // '3x'
math.simplify('(x+2)(x-2)'); // 'x^2 - 4'
```

---

### Phase 3: High School Support (Tier 3)
**Timeline:** 4-6 weeks
**Complexity:** High

**Components to Build:**
1. **Full LaTeX Editor** (MathLive integration)
2. **Multi-line Equation Support**
3. **Matrix/Vector Input**
4. **Graph Plotting** (for function questions)
5. **Step-by-Step Solution Checker**

**Advanced Grading:**
```typescript
// Symbolic computation with CAS (Computer Algebra System)
import nerdamer from 'nerdamer';
require('nerdamer/Calculus');
require('nerdamer/Algebra');

// Derivatives
nerdamer('diff(x^3 + 2x^2 - 5x + 3, x)').toString(); // "3*x^2+4*x-5"

// Integrals
nerdamer('integrate(3x^2 + 2x, x)').toString(); // "x^3+x^2"

// Solve equations
nerdamer.solveEquations('2x + 5 = 13'); // [4]

// Trigonometry
nerdamer('cos(pi)').toString(); // "-1"
```

**Alternative: Gemini for Grading**
```typescript
const MATH_GRADING_PROMPT = `
You are grading a high school math exam.

Question: ${question}
Student Answer: ${studentAnswer}
Expected Answer: ${correctAnswer}

Evaluate if the student's answer is mathematically equivalent to the expected answer.
Consider:
- Algebraic equivalence (different forms of same expression)
- Trigonometric identities
- Multiple valid solutions for equations
- Acceptable approximations for transcendental numbers

Return JSON:
{
  "correct": true/false,
  "explanation": "Brief explanation",
  "points_awarded": 0-2,
  "feedback": "Specific feedback for student"
}
`;
```

---

## Mobile vs Web Considerations

### Web Implementation

**Advantages:**
- Full LaTeX rendering support (KaTeX/MathJax)
- Rich text editors available
- More screen real estate
- Copy-paste support

**Challenges:**
- Touch input for complex equations
- Virtual keyboard interference
- Mobile browser limitations

**Recommendation:**
- Use **MathLive** for equation editing (touch-optimized)
- Provide symbol palette overlays
- Support both typing and button clicks
- Save draft answers (local storage)

---

### Mobile App (Flutter) Implementation

**Advantages:**
- Native keyboard integration
- Gesture support (swipe, pinch)
- Better performance
- Offline capability

**Challenges:**
- LaTeX rendering requires packages
- Smaller screen space
- Complex UI components

**Flutter Packages:**
- **flutter_math_fork**: LaTeX rendering
- **flutter_tex**: Alternative LaTeX renderer
- **math_keyboard**: Mathematical keyboard widget

**Recommendation:**
- Simpler UI for elementary (large buttons)
- Symbol drawer/palette for middle school
- Consider tablet-optimized layout for high school
- Progressive disclosure (show advanced features only when needed)

---

## Grading Strategy

### Numeric Answers (Tier 1)
**Method:** Exact match with tolerance

```typescript
function gradeNumeric(student: number, correct: number, tolerance: number = 0.01): boolean {
  return Math.abs(student - correct) <= tolerance;
}

// Example
gradeNumeric(3.14, Math.PI, 0.01) // true
gradeNumeric(0.333, 1/3, 0.001) // true
```

---

### Fraction Answers (Tier 1)
**Method:** Normalize and compare

```typescript
function gradeFraction(
  studentNum: number,
  studentDen: number,
  correctNum: number,
  correctDen: number
): boolean {
  // Normalize both fractions
  const studentValue = studentNum / studentDen;
  const correctValue = correctNum / correctDen;

  return Math.abs(studentValue - correctValue) < 0.0001;
}

// Also check for simplified form if required
function isSimplified(num: number, den: number): boolean {
  return gcd(num, den) === 1;
}
```

---

### Algebraic Expressions (Tier 2-3)
**Method:** Symbolic equivalence

```typescript
import { create, all } from 'mathjs';
const math = create(all);

function gradeAlgebraic(studentExpr: string, correctExpr: string): boolean {
  try {
    const student = math.simplify(studentExpr);
    const correct = math.simplify(correctExpr);

    // Compare simplified forms
    return student.toString() === correct.toString();
  } catch (error) {
    // Syntax error in student answer
    return false;
  }
}

// Example
gradeAlgebraic("x^2 - 4", "(x+2)(x-2)") // true
gradeAlgebraic("2x + 3x", "5x") // true
```

---

### Equations with Multiple Solutions (Tier 2-3)
**Method:** Set comparison

```typescript
function gradeMultipleSolutions(
  studentSolutions: number[],
  correctSolutions: number[],
  tolerance: number = 0.01
): { correct: boolean; partial: boolean; score: number } {
  const matched = studentSolutions.filter(s =>
    correctSolutions.some(c => Math.abs(s - c) <= tolerance)
  );

  const score = matched.length / correctSolutions.length;

  return {
    correct: score === 1.0,
    partial: score > 0 && score < 1.0,
    score: score
  };
}

// Example
gradeMultipleSolutions([15, 75], [15, 75, 195, 255], 0.1)
// { correct: false, partial: true, score: 0.5 }
```

---

### Gemini-Assisted Grading (Advanced)
**Method:** AI evaluation for complex answers

```typescript
async function gradeWithGemini(
  question: string,
  studentAnswer: string,
  correctAnswer: string,
  questionType: string
): Promise<GradingResult> {
  const prompt = `
Grade this math answer:

Question: ${question}
Student Answer: ${studentAnswer}
Expected Answer: ${correctAnswer}
Question Type: ${questionType}

Evaluate:
1. Mathematical correctness
2. Equivalent forms (e.g., factored vs expanded)
3. Units (if applicable)
4. Significant figures (for science)

Return JSON:
{
  "points": 0-2,
  "feedback": "Why correct/incorrect",
  "is_equivalent": true/false,
  "common_mistake": "If wrong, what mistake?"
}
`;

  const result = await callGemini(prompt);
  return JSON.parse(result);
}
```

---

## User Experience Flow

### Elementary School Student (Grade 3)
**Problem:** `Mikä on 1/2 + 1/4?`

1. **Question Display:**
   - Large, clear text
   - Visual fraction representation (pie charts)

2. **Answer Input:**
   - Two number inputs: "Osoittaja" (numerator) and "Nimittäjä" (denominator)
   - Visual feedback showing entered fraction as pie chart
   - "Tarkista vastaus" button

3. **Validation:**
   - Accept equivalent fractions (3/4, 6/8, 9/12)
   - Provide hint if denominator is wrong

4. **Feedback:**
   - ✅ "Oikein! 1/2 + 1/4 = 3/4"
   - Visual confirmation with fraction diagrams

---

### Middle School Student (Grade 8)
**Problem:** `Ratkaise yhtälö: 3x - 7 = 11`

1. **Question Display:**
   - LaTeX-rendered equation: 3x - 7 = 11
   - Instructions: "Ratkaise x"

2. **Answer Input:**
   - Equation editor with symbol palette
   - Templates: `x = ___`, `x = ___ ± ___`
   - Live preview of entered expression

3. **Validation:**
   - Check if x = 6
   - Accept forms: "6", "x = 6", "x=6.0"

4. **Feedback:**
   - ✅ "Oikein! x = 6"
   - Show work: "3(6) - 7 = 18 - 7 = 11 ✓"

---

### High School Student (Lukio, Trigonometry)
**Problem:** `Ratkaise: sin(2θ) = 1/2, kun 0° ≤ θ ≤ 360°`

1. **Question Display:**
   - Full LaTeX: `\sin(2\theta) = \frac{1}{2}, \quad 0° \leq \theta \leq 360°`
   - Graph showing sin(2θ) function

2. **Answer Input:**
   - Multiple answer fields (4 solutions expected)
   - Unit selector: degrees/radians
   - LaTeX editor for showing work (optional)

3. **Validation:**
   - Check set: {15°, 75°, 195°, 255°}
   - Accept in any order
   - Partial credit for incomplete sets

4. **Feedback:**
   - ✅ "Kaikki ratkaisut oikein! (4/4)"
   - Visual: Show solutions on unit circle
   - Explanation: "sin(2θ) = 1/2 when 2θ = 30°, 150°, 390°, 510°"

---

## Database Schema Updates

### Enhanced Question Schema

```sql
-- Add new columns to examgenie_questions
ALTER TABLE examgenie_questions
ADD COLUMN question_format VARCHAR(50) DEFAULT 'text',
ADD COLUMN answer_format VARCHAR(50) DEFAULT 'text',
ADD COLUMN answer_metadata JSONB,
ADD COLUMN grading_method VARCHAR(50) DEFAULT 'exact_match',
ADD COLUMN tolerance DECIMAL(10, 6),
ADD COLUMN accepts_equivalent BOOLEAN DEFAULT false;

-- New question formats
-- question_format: 'text', 'latex', 'mathml', 'mixed'
-- answer_format: 'text', 'numeric', 'fraction', 'latex', 'multiple_numeric', 'matrix'
-- grading_method: 'exact_match', 'numeric_tolerance', 'algebraic_equivalence', 'set_comparison', 'gemini_ai'

-- Example rows
INSERT INTO examgenie_questions VALUES (
  'q1',
  'exam1',
  1,
  'Laske: $\frac{1}{2} + \frac{1}{4}$',
  'latex',
  'fraction_input',
  '["3/4"]'::jsonb,
  '3/4',
  'Lisää murto-osat yhteen. Muista yhteinen nimittäjä!',
  2,
  'fraction',
  '{"numerator": 3, "denominator": 4, "accept_equivalent": true}'::jsonb,
  'exact_match',
  null,
  true
);

INSERT INTO examgenie_questions VALUES (
  'q2',
  'exam2',
  1,
  'Ratkaise yhtälö: $2x + 5 = 13$',
  'latex',
  'numeric_input',
  '["4", "x=4", "x = 4"]'::jsonb,
  '4',
  'Eristä x vähentämällä 5 molemmilta puolilta, sitten jaa 2:lla.',
  2,
  'numeric',
  '{"allow_variable_notation": true}'::jsonb,
  'algebraic_equivalence',
  0.01,
  true
);
```

---

## Implementation Roadmap

### Sprint 1: Foundation (Week 1-2)
**Goal:** Basic math question rendering

- [ ] Install KaTeX for LaTeX rendering
- [ ] Update question schema with new fields
- [ ] Add LaTeX support to question display
- [ ] Test rendering on web and mobile
- [ ] Update Gemini prompts to generate LaTeX

**Deliverable:** Questions with math symbols render correctly

---

### Sprint 2: Elementary Math Input (Week 3-4)
**Goal:** Numeric and fraction input

- [ ] Build NumericInput component (web + mobile)
- [ ] Build FractionInput component (web + mobile)
- [ ] Add input validation
- [ ] Implement exact match grading
- [ ] Test with sample elementary questions

**Deliverable:** Students can answer numeric and fraction questions

---

### Sprint 3: Middle School Support (Week 5-7)
**Goal:** Symbol palette and equation builder

- [ ] Build symbol palette UI
- [ ] Integrate MathLive equation editor
- [ ] Add LaTeX preview
- [ ] Implement mathjs for algebraic equivalence
- [ ] Create templates for common equation types

**Deliverable:** Students can solve algebra equations

---

### Sprint 4: High School Support (Week 8-12)
**Goal:** Full LaTeX editor and advanced grading

- [ ] Full MathLive integration
- [ ] Multi-line equation support
- [ ] Matrix/vector input
- [ ] Integrate nerdamer/CAS for symbolic math
- [ ] Gemini-assisted grading for complex answers
- [ ] Graph plotting (optional)

**Deliverable:** Students can solve calculus and trigonometry problems

---

### Sprint 5: Testing & Refinement (Week 13-14)
**Goal:** QA and user feedback

- [ ] User testing with Finnish students
- [ ] Mobile app optimization
- [ ] Performance testing (LaTeX rendering speed)
- [ ] Accessibility improvements
- [ ] Documentation and training materials

**Deliverable:** Production-ready math exam system

---

## Technical Challenges & Solutions

### Challenge 1: LaTeX Syntax Errors
**Problem:** Students may write invalid LaTeX

**Solutions:**
- Visual editor (MathLive) generates valid LaTeX
- Syntax validation before submission
- Graceful error handling (show preview as fallback)
- Common error detection and suggestions

```typescript
function validateLatex(latex: string): { valid: boolean; error?: string } {
  try {
    katex.renderToString(latex, { throwOnError: true });
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: "Virhe kaavassa. Tarkista syntaksi."
    };
  }
}
```

---

### Challenge 2: Mobile Keyboard Conflicts
**Problem:** Math symbols need custom keyboard, conflicts with system keyboard

**Solutions:**
- Custom virtual keyboard overlay
- Toggle between text keyboard and math keyboard
- Tablet mode: Split view (keyboard + editor)
- Progressive enhancement (simpler on small screens)

```typescript
// Adaptive keyboard based on screen size
const useMathKeyboard = window.innerWidth >= 768; // iPad and larger

if (useMathKeyboard) {
  return <MathLiveEditor />;
} else {
  return <SimpleSymbolPalette />;
}
```

---

### Challenge 3: Performance (LaTeX Rendering)
**Problem:** Rendering 15 complex equations may be slow

**Solutions:**
- Lazy loading (render visible questions first)
- Cache rendered equations
- Use KaTeX (faster than MathJax)
- Server-side rendering for initial load

```typescript
// Lazy render with Intersection Observer
const LazyMathQuestion = ({ latex }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {isVisible ? <InlineMath math={latex} /> : <Skeleton />}
    </div>
  );
};
```

---

### Challenge 4: Grading Accuracy
**Problem:** Many equivalent mathematical forms

**Solutions:**
- Multiple acceptable answer formats in database
- Symbolic math libraries for equivalence checking
- Gemini fallback for ambiguous cases
- Partial credit system

```typescript
const GRADING_STRATEGIES = {
  numeric: (student, correct, tolerance) => {
    return Math.abs(student - correct) <= tolerance;
  },

  algebraic: (student, correct) => {
    const simplified = math.simplify(student);
    return simplified.equals(math.simplify(correct));
  },

  set: (studentSet, correctSet) => {
    return studentSet.every(s => correctSet.includes(s)) &&
           correctSet.every(c => studentSet.includes(c));
  },

  gemini: async (question, student, correct) => {
    // AI-powered grading for complex cases
    return await gradeWithGemini(question, student, correct);
  }
};
```

---

## Cost Estimation

### Development Time
- **Tier 1 (Elementary):** 2-3 weeks (1 developer)
- **Tier 2 (Middle School):** 3-4 weeks (1 developer)
- **Tier 3 (High School):** 4-6 weeks (1-2 developers)
- **Testing & QA:** 2 weeks
- **Total:** ~14 weeks (3.5 months)

### Third-Party Libraries (All Free/Open Source)
- **KaTeX:** Free (MIT License)
- **MathLive:** Free (MIT License)
- **Math.js:** Free (Apache 2.0)
- **Nerdamer:** Free (MIT License)
- **Flutter packages:** Free

### Gemini API Costs
- Question generation: Same as current (~$0.001 per exam)
- Math grading: Additional ~$0.0005 per exam (if used)
- **Total:** Still < $0.002 per exam (negligible)

### Infrastructure
- No additional server costs (same Vercel + Supabase)
- Slightly larger bundle size (KaTeX ~150KB, MathLive ~300KB)
- Acceptable for modern devices

---

## Success Metrics

### User Experience
- **Input Time:** Students complete math questions in < 2 minutes
- **Error Rate:** < 5% syntax errors in advanced questions
- **Satisfaction:** 4.5+ rating from teachers
- **Adoption:** 50%+ of math exams use new features

### Technical Performance
- **Rendering Speed:** < 100ms per equation
- **Grading Accuracy:** 95%+ correct equivalence detection
- **Mobile Performance:** 60fps on mid-range devices
- **Crash Rate:** < 0.1%

### Educational Impact
- **Question Variety:** 3x more diverse math question types
- **Grades 7-9:** 80%+ adoption for algebra topics
- **High School:** 60%+ adoption for advanced math

---

## Risk Mitigation

### Risk 1: Complexity Overwhelms Elementary Users
**Mitigation:**
- Start simple (numeric input only)
- Progressive disclosure of advanced features
- Age-appropriate defaults
- Teacher can disable advanced features

### Risk 2: Grading Errors Frustrate Students
**Mitigation:**
- Extensive test suite with edge cases
- Manual review option for teachers
- Student can flag incorrect grading
- Log all grading decisions for analysis

### Risk 3: Mobile Performance Issues
**Mitigation:**
- Performance testing on low-end devices
- Fallback to simpler UI on old devices
- Lazy loading and caching
- Progressive web app optimization

### Risk 4: Teacher Adoption Resistance
**Mitigation:**
- Training materials and tutorials
- Example question banks
- Gradual rollout (opt-in initially)
- Feedback loop for improvements

---

## Competitive Analysis

### Existing Solutions

**Khan Academy:**
- Excellent math rendering
- Custom equation editor
- Instant feedback
- **Limitation:** Not Finnish curriculum-aligned

**Desmos:**
- Best-in-class graphing calculator
- Clean LaTeX rendering
- **Limitation:** Not exam-focused, no grading

**WolframAlpha:**
- Powerful CAS backend
- Step-by-step solutions
- **Limitation:** Too advanced for K-12, expensive

**GeoGebra:**
- Interactive geometry and algebra
- Free and open source
- **Limitation:** Complex UI, steep learning curve

### ExamGenie's Advantage
✅ **Finnish curriculum-aligned**
✅ **Age-appropriate UI for each grade level**
✅ **Integrated with exam workflow** (generation → taking → grading)
✅ **Mobile-first design**
✅ **AI-powered question generation**
✅ **Free for students**

---

## Future Enhancements (Post-MVP)

### Graphing Support
- Plot functions for visual questions
- Interactive graph input (students draw/plot)
- Coordinate geometry problems

### Handwriting Recognition
- Tablet/touchscreen support
- Neural network-based math OCR
- Useful for complex multi-step problems

### Adaptive Difficulty
- AI adjusts question difficulty based on performance
- Personalized practice recommendations
- Learning path optimization

### Collaborative Problem Solving
- Group exams (team-based)
- Peer review of solutions
- Discussion threads for complex problems

### Teacher Analytics
- Common mistake patterns
- Student progress tracking
- Difficulty analysis per topic

---

## Conclusion & Recommendation

### Phased Rollout Strategy

**Phase 1 (Immediate - Tier 1):**
Implement basic math support for elementary school. This has:
- **Highest impact** (largest user base)
- **Lowest complexity**
- **Fastest ROI**

**Phase 2 (3 months - Tier 2):**
Add middle school algebra support after validating elementary implementation.

**Phase 3 (6 months - Tier 3):**
High school advanced math once Tier 1-2 are proven successful.

### Success Criteria for Go/No-Go

**Proceed to Tier 2 if:**
- ✅ 1000+ elementary math exams created
- ✅ Teacher satisfaction > 4.0/5.0
- ✅ < 2% critical bugs
- ✅ Student completion rate > 85%

**Proceed to Tier 3 if:**
- ✅ 500+ middle school exams created
- ✅ Grading accuracy > 95%
- ✅ Mobile performance acceptable (> 30fps)

---

## Next Steps

1. **Stakeholder Review** (1 week)
   - Present plan to teachers
   - Get feedback from Finnish math educators
   - Prioritize features based on curriculum needs

2. **Technical Spike** (1 week)
   - Prototype KaTeX integration
   - Test MathLive on mobile
   - Benchmark performance

3. **Design Mockups** (1 week)
   - UI/UX for fraction input
   - Symbol palette design
   - Mobile keyboard layouts

4. **Development Kickoff** (Week 4)
   - Begin Sprint 1
   - Set up CI/CD for math components
   - Create test exam bank

**Total Time to MVP:** ~8 weeks for Tier 1
**Total Time to Full Implementation:** ~16 weeks for all tiers

---

**Document Version:** 1.0
**Last Updated:** October 2025
**Author:** ExamGenie Development Team
**Status:** Proposal / Planning Phase
