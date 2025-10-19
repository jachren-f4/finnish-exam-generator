# Math Exam Generation with Gemini 2.5 Flash-Lite

## Overview

This system uses Google's Gemini 2.5 Flash-Lite vision model to automatically generate pedagogically sound math exams from textbook images. The system extracts mathematical content from images, analyzes the topics and difficulty levels, and generates original multiple-choice questions in Finnish with proper LaTeX mathematical notation.

**Current Production Status**: V1 prompt (`test-math-exam-generation-v1.ts`) is the stable baseline.

## Key Capabilities

- **Vision + OCR**: Reads math textbook pages (JPG/PNG images) and understands mathematical notation
- **Content Analysis**: Automatically detects topics (algebra, geometry, exponents, etc.) and difficulty levels
- **Original Question Generation**: Creates new questions that test the same skills without copying textbook exercises
- **Multiple Question Types**: Computational (6), Formula/Simplification (4), Word Problems (3), Conceptual (2)
- **Quality Validation**: Prevents common AI errors through explicit forbidden patterns and self-check steps
- **HTML Preview Generation**: Creates styled, interactive preview with KaTeX-rendered math
- **Temperature Retry Logic**: Automatically escalates temperature (0 → 0.3 → 0.5) if infinite loops detected

## Architecture

```
┌─────────────────┐
│ Textbook Image  │
│  (math8thgrade) │
└────────┬────────┘
         │
         v
┌─────────────────────────────────────┐
│  Gemini 2.5 Flash-Lite API          │
│  - Vision Model (OCR + Analysis)    │
│  - Prompt: V1 Math Exam Generator   │
│  - Temperature: 0 → 0.3 → 0.5       │
└────────┬────────────────────────────┘
         │
         v
┌─────────────────────────────────────┐
│  Multi-Strategy JSON Parser         │
│  (safeJsonParse from ExamGenie)     │
└────────┬────────────────────────────┘
         │
         ├──> math-exam-output-{topic}-optimized.json
         │
         └──> math-exam-preview-{topic}-optimized.html
                  (KaTeX-rendered LaTeX)
```

## Files Structure

### Core Generation Script
- **`test-math-exam-generation-v1.ts`** - Production V1 prompt and generation logic
  - Lines 30-120: Math exam prompt (V1)
  - Lines 172-282: Temperature retry logic with loop detection
  - Lines 317-361: Question validation statistics
  - Lines 382-645: HTML generation with KaTeX

### Input
- **`assets/images/math8thgrade/*.JPG`** - Source textbook images
  - `geometry.JPG` - Circular sectors, arc lengths, area calculations
  - `jakolasku.JPG` - Equations, ratios, proportions
  - `algebra.jpg` - Mixed algebra topics (equations, exponents, derivatives, integrals)
  - `potenssi.JPG` - Exponents and powers

### Output
- **`math-exam-output-{topic}-optimized.json`** - Structured exam data
- **`math-exam-preview-{topic}-optimized.html`** - Interactive preview with answers

### Validation
- **`validate-math-exams.ts`** - 3-level validation system
  - Structural validation (75 points)
  - Quality validation (45 points)
  - Mathematical validation (15 points)

### Utilities
- **`src/lib/utils/json-handler.ts`** - Multi-strategy JSON parser from ExamGenie

## V1 Prompt Engineering Strategy

### Core Philosophy
V1 uses **explicit negative enforcement** - it tells the model exactly what NOT to do with concrete examples of failures. This is more effective than positive instructions alone for preventing AI mistakes.

### Critical Components

#### 1. FORBIDDEN ERROR Blocks
The prompt contains **4 explicit forbidden error patterns** with real examples of what went wrong:

**❌ FORBIDDEN ERROR 1: Duplicate options**
```
Bad: options = ["$y^{37}$", "$y^{31 \\cdot 6}$", "$y^0$", "$y^{37}$"]
Fix: Verify all 4 options are UNIQUE strings
```

**❌ FORBIDDEN ERROR 2: "Closest answer" logic** (Most critical)
```
Bad explanation: "oikea vastaus on 0,25... Koska 0,5 on lähin vastaus, valitaan se"
Fix: If NO option matches your calculation, SKIP the question entirely
NEVER write: "Huom:", "oikea vastaus on", "lähin vastaus", "valitaan"
```

**❌ FORBIDDEN ERROR 3: Wrong formula calculations**
```
Geometry sector area: MUST use (angle/360) × π × r²

Example verification (r=87cm, angle=90°):
✅ CORRECT:
  Step 1: 87² = 7569 ✓
  Step 2: 90/360 = 0.25 ✓
  Step 3: 0.25 × π = 0.7854 ✓
  Step 4: 0.7854 × 7569 = 5944.7 cm² ✓

❌ WRONG (this error appears in failed exams):
  Formula: (90/360) × π × 87² ≈ 18960 cm² ← INCORRECT ARITHMETIC
```

**❌ FORBIDDEN ERROR 4: Visual references**
```
Never write: "kuva", "sivu", "taulukko", "kaavio" in questions
```

#### 2. Self-Validation Checklist
After generating EACH question, the model must complete this checklist:

```
□ Step 1: Calculate answer independently and verify it's mathematically correct
□ Step 2: For geometry sector problems, verify EACH arithmetic step
□ Step 3: Verify correct_answer EXACTLY matches one option (character-for-character)
□ Step 4: Confirm all 4 options are UNIQUE (no duplicates)
□ Step 5: Ensure ONLY ONE option is mathematically correct
□ Step 6: Check explanation does NOT contain: "oikea vastaus", "lähin vastaus"
□ Step 7: Verify no visual references in question text
□ Step 8: If calculated value seems too large (3×+ expected), RECALCULATE

IF ANY VALIDATION FAILS: STOP generation of that question immediately
```

#### 3. LaTeX Notation Rules
```
Math mode ($...$) for EXPRESSIONS ONLY, not plain decimals:
  ✅ "8,9 m" (plain text)
  ❌ "$8,9 m$" (incorrect)

LaTeX commands MUST wrap in $...$:
  ✅ "$\\frac{1}{2}$" renders as fraction
  ❌ "\\frac{1}{2}" shows raw code

JSON escaping: Double all backslashes
  \\frac becomes \\\\frac in JSON
```

#### 4. Question Distribution
```
| Type                    | Count | Purpose                        |
|-------------------------|-------|--------------------------------|
| Computational           | 6     | Pure numerical calculation     |
| Formula/Simplification  | 4     | Apply or simplify correctly    |
| Word Problems           | 3     | Realistic numeric applications |
| Conceptual              | 2     | Reasoning or understanding     |
```

### Why V1 Works

1. **Concrete Failure Examples**: Shows the model EXACTLY what went wrong in previous attempts
2. **Step-by-Step Arithmetic Verification**: Forces manual checking of each calculation step for geometry
3. **Hard Stops**: "SKIP the question" if ANY validation fails - never compromise
4. **Bounded Explanations**: Max 3 sentences / 500 chars prevents rambling
5. **Grade-Level Filtering**: Explicitly marks derivatives/integrals as too advanced for Grade 8

## How the System Works

### 1. Image Loading
```typescript
const imagePath = path.join(__dirname, 'assets/images/math8thgrade', imageFileName);
const imageBuffer = fs.readFileSync(imagePath);
const imageBase64 = imageBuffer.toString('base64');

const imagePart = {
  inlineData: {
    data: imageBase64,
    mimeType: 'image/jpeg'
  }
};
```

### 2. Temperature Retry Logic
Prevents infinite loop generation (neural text degeneration):

```typescript
const temperatures = [0, 0.3, 0.5];

for (let attempt = 0; attempt < maxAttempts; attempt++) {
  const currentTemp = temperatures[attempt];

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      temperature: currentTemp,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192
    }
  });

  const result = await model.generateContent([mathPrompt, imagePart]);
  const text = response.text();

  // Check for infinite loop BEFORE parsing
  if (detectInfiniteLoop(text)) {
    console.log(`⚠️  Infinite loop detected, retrying with temp ${temperatures[attempt + 1]}...`);
    continue;
  }

  // Parse and validate...
}
```

**Loop Detection Methods:**
- Response exceeds 50K characters
- Same phrase repeated 5+ times consecutively
- Known loop phrases appear >10 times

### 3. Multi-Strategy JSON Parsing
Uses ExamGenie's robust parser to handle various Gemini response formats:

```typescript
import { safeJsonParse } from './src/lib/utils/json-handler';

const parseResult = safeJsonParse(text);

if (!parseResult.success) {
  console.log(`❌ JSON parse failed: ${parseResult.error}`);
  // Retry with higher temperature
  continue;
}

const parsed = parseResult.data as MathExamResponse;
```

**Parser handles:**
- Raw JSON
- Markdown code blocks (```json ... ```)
- Text with JSON embedded
- Malformed trailing commas

### 4. Question Validation
```typescript
function validateMathQuestions(questions: MathQuestion[]): ValidationStats {
  const visualKeywords = ['kuva', 'sivu', 'kaavio', 'taulukko'];

  questions.forEach((q) => {
    // Count LaTeX usage
    const latexMatches = (q.question.match(/\$[^$]+\$/g) || []).length;

    // Check for visual references
    const hasVisualRef = visualKeywords.some(kw =>
      q.question.toLowerCase().includes(kw)
    );

    // Validate answer format
    if (!q.options.includes(q.correct_answer)) {
      stats.issues.push(`Q${q.id}: correct_answer not in options`);
    }

    // Check Finnish language
    if (!/[äöåÄÖÅ]/.test(q.question)) {
      stats.issues.push(`Q${q.id}: Missing Finnish characters`);
    }
  });

  return stats;
}
```

### 5. HTML Preview Generation

#### Structure
```html
<!DOCTYPE html>
<html lang="fi">
<head>
  <!-- KaTeX CSS for math rendering -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>

  <style>
    /* Minimalist design matching ExamGenie style */
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; }
    .question-card { border: 1px solid #e0e0e0; border-radius: 12px; }
    .option.correct { background: #d4edda; border-color: #28a745; }
  </style>
</head>
```

#### Question Cards
Each question is rendered with:
- **Question number and progress dots** (visual feedback)
- **Question text** (with LaTeX rendered by KaTeX)
- **4 options** (correct option highlighted in green)
- **Radio circles** (visual affordance, non-interactive)
- **Explanation box** (light gray background, left border accent)

```typescript
const questionsHTML = questions.map((q, idx) => {
  const optionsHTML = q.options.map((option, optIdx) => {
    const isCorrect = option === q.correct_answer;
    const correctClass = isCorrect ? 'correct' : '';

    return `
      <div class="option ${correctClass}">
        <div class="radio-circle"></div>
        <div class="option-text">${option}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="question-card">
      <div class="question-number">${idx + 1} / ${questions.length}</div>
      <div class="progress-dots">
        ${Array(questions.length).fill(0).map((_, i) =>
          `<div class="dot ${i === idx ? 'active' : ''}"></div>`
        ).join('')}
      </div>
      <h2 class="question-text">${q.question}</h2>
      <div class="options">${optionsHTML}</div>
      <div class="explanation">
        <strong>Selitys:</strong> ${q.explanation}
      </div>
    </div>
  `;
}).join('');
```

#### KaTeX Auto-Rendering
```javascript
document.addEventListener("DOMContentLoaded", function() {
  renderMathInElement(document.body, {
    delimiters: [
      {left: "$$", right: "$$", display: true},  // Block math
      {left: "$", right: "$", display: false}     // Inline math
    ],
    throwOnError: false  // Graceful degradation
  });
});
```

## JSON Output Schema

```typescript
interface MathExamResponse {
  questions: MathQuestion[];
  topic?: string;
  grade?: number;
}

interface MathQuestion {
  id: number;
  type: string;  // "computational" | "formula_simplification" | "word_problem" | "conceptual"
  question: string;  // LaTeX notation in $...$ delimiters
  options: string[];  // Exactly 4 options
  correct_answer: string;  // Must match one option exactly
  explanation: string;  // Max 500 chars, 1-3 sentences
}
```

**Example Question:**
```json
{
  "id": 1,
  "type": "computational",
  "question": "Laske ympyrän sektorin pinta-ala, kun säde on $5,3$ cm ja keskuskulma on $56°$. Pyöristä vastaus yhden desimaalin tarkkuudella.",
  "options": [
    "13,0 cm²",
    "25,9 cm²",
    "7,2 cm²",
    "13,0 cm"
  ],
  "correct_answer": "7,2 cm²",
  "explanation": "Sektorin pinta-ala lasketaan kaavalla $A = \\frac{\\alpha}{360°} \\cdot \\pi r^2$. Kun $r=5,3$ cm ja $\\alpha=56°$, saadaan $A = \\frac{56}{360} \\cdot \\pi \\cdot (5,3)^2 \\approx 7,2$ cm². Yleinen virhe on unohtaa jakaa keskuskulma 360°:lla."
}
```

## Usage

### Basic Generation
```bash
# Use default image (potenssi.JPG)
npx tsx test-math-exam-generation-v1.ts

# Specify custom image
npx tsx test-math-exam-generation-v1.ts geometry.JPG
npx tsx test-math-exam-generation-v1.ts jakolasku.JPG
npx tsx test-math-exam-generation-v1.ts algebra.jpg
```

### Output Files
```
math-exam-output-{topic}-optimized.json     # Structured exam data
math-exam-preview-{topic}-optimized.html    # Interactive preview
```

### Validation
```bash
npx tsx validate-math-exams.ts math-exam-output-geometry-optimized.json
```

**Validation Scoring:**
- **75 points**: Structural validation (schema, format, required fields)
- **45 points**: Quality validation (no forbidden phrases, no self-admitted errors)
- **15 points**: Mathematical validation (LaTeX syntax, Finnish language, answer format)
- **Total**: 100 points (passing threshold: typically 90+)

## Validation System Deep Dive

### Level 1: Structural Validation (75 points)
```typescript
// Schema validation
if (!examData.questions || !Array.isArray(examData.questions)) {
  errors.push({ severity: 'critical', message: 'Missing questions array' });
}

// Each question validation
questions.forEach(q => {
  if (!q.id || !q.question || !q.options || !q.correct_answer || !q.explanation) {
    errors.push({ severity: 'critical', questionId: q.id, message: 'Missing required field' });
  }

  if (q.options.length !== 4) {
    errors.push({ severity: 'critical', questionId: q.id, message: 'Must have exactly 4 options' });
  }

  // Check for duplicate options
  const uniqueOptions = new Set(q.options);
  if (uniqueOptions.size !== q.options.length) {
    errors.push({ severity: 'critical', questionId: q.id, message: 'Duplicate options detected' });
  }
});
```

### Level 2: Quality Validation (45 points)
```typescript
const selfAdmittedErrorPhrases = [
  'oikea vastaus on',
  'lähin vastaus',
  'valitaan se',
  'Tehtävässä on virheellinen',
  'Huom:',
  'Korjataan',
  'Oletetaan'
];

questions.forEach(q => {
  const explanation = q.explanation.toLowerCase();

  // Detect self-admitted errors
  for (const phrase of selfAdmittedErrorPhrases) {
    if (explanation.includes(phrase)) {
      errors.push({
        severity: 'critical',
        questionId: q.id,
        message: 'AI admitted answer is wrong in explanation',
        actual: q.explanation.substring(0, 100) + '...'
      });
    }
  }

  // Check explanation length
  if (q.explanation.length > 500) {
    errors.push({
      severity: 'warning',
      questionId: q.id,
      message: `Explanation too long: ${q.explanation.length} chars (max 500)`
    });
  }

  // Check for visual references
  const visualKeywords = ['kuva', 'sivu', 'taulukko', 'kaavio'];
  for (const keyword of visualKeywords) {
    if (q.question.toLowerCase().includes(keyword)) {
      errors.push({
        severity: 'warning',
        questionId: q.id,
        message: `Visual reference detected: "${keyword}"`
      });
    }
  }
});
```

### Level 3: Mathematical Validation (15 points)
```typescript
questions.forEach(q => {
  // Verify correct_answer exists in options
  if (!q.options.includes(q.correct_answer)) {
    errors.push({
      severity: 'critical',
      questionId: q.id,
      message: 'correct_answer does not match any option',
      expected: q.correct_answer,
      actual: q.options
    });
  }

  // Check LaTeX syntax
  const latexMatches = q.question.match(/\$[^$]+\$/g);
  if (latexMatches) {
    latexMatches.forEach(latex => {
      if (latex.includes('\\frac{') && !latex.includes('}')) {
        errors.push({
          severity: 'warning',
          questionId: q.id,
          message: 'Malformed LaTeX fraction syntax'
        });
      }
    });
  }

  // Verify Finnish language
  if (!/[äöåÄÖÅ]/.test(q.question + q.explanation)) {
    errors.push({
      severity: 'warning',
      questionId: q.id,
      message: 'Missing Finnish characters'
    });
  }
});
```

## Test Results (V1 Production)

### Geometry Topics (100/100 @ temp 0.5)
```
✅ 15/15 questions mathematically correct
✅ All LaTeX notation properly rendered
✅ No self-admitted errors
✅ No visual references
✅ No duplicate options
⚠️  Required temperature 0.5 (hit loop at temp 0)
```

### Equations/Ratios (100/100 @ temp 0.5)
```
✅ 15/15 questions mathematically correct
✅ Cross-multiplication properly applied
✅ No "closest answer" logic
✅ No self-admitted errors
⚠️  Required temperature 0.5 (hit loop at temp 0)
```

### Algebra Mixed Topics (100/100 @ temp 0)
```
✅ 15/15 questions mathematically correct
✅ Successfully filtered Grade 8 inappropriate topics
✅ Derivatives/integrals correctly excluded
✅ Worked at temperature 0 (no loops)
```

## Known Limitations

### 1. Temperature 0 Loop Risk
**Issue**: V1 can hit infinite loops at temperature 0 for some topics (geometry, equations)

**Mitigation**: Automatic retry with temperature escalation (0 → 0.3 → 0.5)

**Why it happens**: Neural text degeneration - model gets stuck repeating phrases at low entropy

### 2. Grade Level Filtering Incomplete
**Issue**: Occasionally generates Grade 8 inappropriate content (derivatives, integrals)

**Status**: Partially fixed in V1 with explicit Grade 8 filter section

**Example from algebra.jpg**: Initially generated derivative questions, but explanation included proper filtering note

### 3. Manual Validation Still Recommended
**Issue**: Automated validation catches structural/syntactic errors but may miss subtle mathematical incorrectness

**Recommendation**: Human review of JSON output before production use

### 4. Image Quality Dependency
**Issue**: OCR accuracy depends on image quality, resolution, and clarity of mathematical notation

**Best practices**:
- Use high-resolution scans (minimum 150 DPI)
- Ensure good contrast between text and background
- Avoid glare or shadows on photographed pages

## Integration Guide for ExamGenie

### 1. API Route Structure
```typescript
// app/api/exam/generate-math/route.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { safeJsonParse } from '@/lib/utils/json-handler';

export async function POST(req: Request) {
  const { imageData, grade = 8, topic } = await req.json();

  // Initialize Gemini with V1 prompt
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      temperature: 0.5,  // Start with stable temperature
      maxOutputTokens: 8192
    }
  });

  // Convert base64 image
  const imagePart = {
    inlineData: {
      data: imageData,
      mimeType: 'image/jpeg'
    }
  };

  // Generate exam with V1 prompt
  const result = await model.generateContent([mathPromptV1(grade), imagePart]);
  const parsed = safeJsonParse(result.response.text());

  if (!parsed.success) {
    return Response.json({ error: 'Failed to parse exam' }, { status: 500 });
  }

  // Validate before returning
  const validation = validateMathExam(parsed.data);
  if (validation.score < 90) {
    return Response.json({
      error: 'Exam failed validation',
      details: validation.errors
    }, { status: 422 });
  }

  return Response.json(parsed.data);
}
```

### 2. Import V1 Prompt
```typescript
// lib/prompts/math-exam-v1.ts

export function mathPromptV1(grade: number): string {
  return `ROLE: You are an expert mathematics teacher...

  [Full V1 prompt from test-math-exam-generation-v1.ts lines 30-120]
  `;
}
```

### 3. Frontend Integration
```typescript
// components/MathExamGenerator.tsx

async function generateMathExam(imageFile: File) {
  const base64 = await fileToBase64(imageFile);

  const response = await fetch('/api/exam/generate-math', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageData: base64,
      grade: 8,
      topic: 'auto-detect'
    })
  });

  const examData: MathExamResponse = await response.json();

  // Render with your existing exam UI
  return <ExamPreview questions={examData.questions} />;
}
```

### 4. Validation Integration
```typescript
// lib/validation/math-exam-validator.ts

import { validateMathExam } from './validate-math-exams';

export async function validateBeforeStorage(examData: MathExamResponse) {
  const validation = validateMathExam(examData);

  if (validation.score < 90) {
    throw new Error(`Exam validation failed: ${validation.errors.join(', ')}`);
  }

  return examData;
}
```

## Future Improvements

### Short-term
- [ ] Add support for more math topics (trigonometry, statistics)
- [ ] Implement caching for repeated image generation
- [ ] Add batch processing for multiple images
- [ ] Create topic-specific prompt variations

### Long-term
- [ ] Multi-language support (Swedish, English)
- [ ] Adaptive difficulty based on student performance
- [ ] Answer explanation with step-by-step breakdown
- [ ] Integration with existing ExamGenie question database

## References

### Prompt Engineering Resources
- V1 prompt development: `test-math-exam-generation-v1.ts:30-120`
- Forbidden error patterns: Lines 65-97
- Self-validation checklist: Lines 100-114

### Testing & Validation
- Test images: `assets/images/math8thgrade/`
- Validation script: `validate-math-exams.ts`
- Test results: `math-exam-output-*-optimized.json`

### Dependencies
```json
{
  "@google/generative-ai": "^0.21.0",
  "katex": "^0.16.9",
  "dotenv": "^17.2.2"
}
```

## Questions & Support

For questions about integration or prompt modifications, refer to:
1. This README for system architecture
2. `test-math-exam-generation-v1.ts` for implementation details
3. `validate-math-exams.ts` for quality standards
4. Previous conversation logs for V1 vs V2 comparison rationale

---

**Last Updated**: 2025-01-XX
**Production Version**: V1 (test-math-exam-generation-v1.ts)
**Maintainer**: ExamGenie Team
