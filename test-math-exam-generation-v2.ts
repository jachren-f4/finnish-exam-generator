/**
 * Math Exam Generation Test Script - V2 (Professional Optimized Prompt)
 * Tests Gemini with math textbook images and generates styled HTML preview
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { safeJsonParse } from './src/lib/utils/json-handler';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Configuration matching staging environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash-lite';
const TEMPERATURE = 0;

// Validate API key
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

// Math-specific exam generation prompt - V2 (Professional Optimized)
const EXAM_QUESTION_COUNT = 15;
const grade = 8;

const mathPrompt = `# 🧮 ExamGenie – Math Exam Generation (v2)

## ROLE
You are an **expert mathematics teacher** creating *original* exam questions for **Grade ${grade} students** in Finnish.
Your goal: produce clear, pedagogically sound multiple-choice questions that test true understanding.

---

## CONTEXT
You are analyzing textbook images showing mathematical material.
The content may include:
- Algebraic expressions and equations
- Rational expressions (fractions with variables)
- Exponents and powers
- Geometry and measurement
- Word problems with real-world context

---

## 🧠 STAGE 1 – Content Analysis
Before creating questions, perform an **internal analysis** of the images.

1. **Detect topic:** Identify the specific mathematical area (e.g. "rational expressions", "exponents", "geometry").
2. **Assess difficulty:** Estimate the real difficulty level (easy / medium / hard).
3. **Identify problem type:** computational / simplification / word / conceptual.
4. **Remember:** *You are not copying exercises*, only understanding what they teach.

---

## 🚫 DO NOT COPY
Never reproduce textbook sub-exercises (a, b, c, d).
Instead, **create new, original questions** testing the *same skill at the same difficulty*.

**Avoid:**
- Purely mechanical calculations with no reasoning
- Multiple-correct-answer items
- Questions where formula syntax equals the answer (e.g. "Calculate $10^1$")

---

## 🧩 STAGE 2 – Question Generation
Produce **${EXAM_QUESTION_COUNT} questions total** in these categories:

| Type | Count | Purpose | Example |
|------|--------|----------|---------|
| **Computational** | 6 | Pure numerical calculation | "Laske $10^3$ → 1000" |
| **Formula/Simplification** | 4 | Apply or simplify correctly | "Yksinkertaista $\\\\frac{b^{12}}{b^4}$ → $b^8$" |
| **Word Problems** | 3 | Realistic numeric applications | Money, growth, geometry, etc. |
| **Conceptual** | 2 | Reasoning or understanding | "Miksi $a^0 = 1$?" |

**Within each category:**
- Vary sentence structure and examples.
- Do not start every explanation with the same phrase.
- Use different everyday contexts when possible.

---

## ✍️ FORMATTING RULES

### Mathematical Notation
- Use \`$...$\` only for mathematical expressions.
- Plain numbers and units stay outside math mode (e.g. \`8,9 m\`).
- LaTeX rules:
  - \`$\\\\cdot$\` for multiplication
  - \`$\\\\frac{a}{b}$\` for fractions
  - \`$\\\\pi$\`, \`$\\\\alpha$\`, \`$\\\\beta$\` for Greek letters
  - \`°\` for degrees
- In JSON strings, **escape backslashes twice** (\`\\\\frac\` → \`\\\\\\\\frac\`).

---

## 🎯 ANSWER & DISTRACTOR DESIGN

- "Calculate" → numeric options
- "Simplify" → simplified expressions
- Only **one correct option**
- Wrong options = *common student errors*

**Examples**
- Exponents: \`$(-2)^3 = -8$\` → wrong "8", "−6"
- Fractions: \`$\\\\frac{x}{6} - \\\\frac{5}{3}$\` → wrong \`$\\\\frac{x-5}{3}$\`
- Geometry: forgetting to divide by 360 or using the wrong formula

---

## 🧩 EXPLANATIONS
Each explanation = **1–3 sentences / max 500 chars**.
Structure every explanation as:

> Formula + one short example + one common error

Add stylistic variation (e.g., "Tässä käytetään…", "Oikea kaava on…", "Yleinen virhe on…").

If ambiguity or uncertainty is detected → **skip that question**.

---

## ✅ OUTPUT FORMAT

Return **valid JSON**:

\`\`\`json
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Selkeä kysymys LaTeX-notaatiolla",
      "options": [
        "Ensimmäinen vaihtoehto",
        "Toinen vaihtoehto",
        "Kolmas vaihtoehto",
        "Neljäs vaihtoehto"
      ],
      "correct_answer": "Ensimmäinen vaihtoehto",
      "explanation": "Tiivis selitys suomeksi (1–3 virkettä)."
    }
  ],
  "topic": "Havaittu aihe",
  "grade": ${grade}
}
\`\`\`

---

## 🔍 VALIDATION & QUALITY CHECKLIST

| Rule | Description |
|------|--------------|
| ✅ Unique options | No duplicates in the list |
| ✅ Single correct answer | One option only |
| ✅ Mathematically valid | Verify each step |
| ✅ No visual references | Don't mention "kuva", "sivu", "taulukko" |
| ✅ Progressive difficulty | Mix of easy → medium → hard |
| ✅ Finnish language | All text and explanations in Finnish |

---

## 🧮 GEOMETRY VERIFICATION EXAMPLES

For sector area problems, **manually confirm steps**:

\`\`\`
Formula: (angle/360) × π × r²
Example: r = 87 cm, angle = 90°
Step 1: 87² = 7569
Step 2: 90/360 = 0.25
Step 3: 0.25 × π = 0.7854
Step 4: 0.7854 × 7569 = 5944.7 cm² ✅
\`\`\`
If the final value deviates > 3× expected → **recalculate**.

---

## 🧠 SELF-CHECK AFTER EACH QUESTION
- [ ] Computation verified independently
- [ ] One correct answer, three distractors
- [ ] Explanation under 500 chars
- [ ] No repetition in wording
- [ ] No "closest answer" logic
- [ ] No visual references
- [ ] JSON syntax valid

---

## 🧩 FAIL-SAFE RULES
If any validation step fails:
- Stop generating that question.
- Skip and move to the next one.
- Never adjust by choosing an incorrect answer.

---

## 🪄 STYLE VARIATION HINT (Prevents Repetition)
Use alternating phrasing in Finnish explanations and questions:
- "Tässä käytetään kaavaa…"
- "Sovelletaan periaatetta…"
- "Koska kulma on puolet täyskulmasta…"
- "Tyypillinen virhe on unohtaa…"

This stylistic diversity prevents loop behavior and keeps the model stable even at low temperatures.

---

## 🔚 FINAL INSTRUCTION
Generate the **complete ${EXAM_QUESTION_COUNT}-question JSON output** now, strictly following all schema and validation rules,
while maintaining **variation in structure, tone, and phrasing** between questions.`;

interface MathQuestion {
  id: number;
  type: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface MathExamResponse {
  questions: MathQuestion[];
  topic?: string;
  grade?: number;
}

/**
 * Detects if Gemini's response contains infinite loop repetition
 */
function detectInfiniteLoop(text: string): boolean {
  // Check for massive output (>50K chars suggests runaway generation)
  if (text.length > 50000) {
    console.log('  📏 Loop detected: Response exceeds 50K characters');
    return true;
  }

  // Check for phrase repetition (same phrase 5+ times in a row)
  const phrases = text.match(/([^\n]{20,})\1{4,}/g);
  if (phrases && phrases.length > 0) {
    console.log('  🔁 Loop detected: Repeated phrase pattern found');
    return true;
  }

  // Check for specific known loop phrases
  const knownLoops = [
    'ja tehtävässä on useita potensseja',
    'ja tehtävässä',
    'Tässä tapauksessa'
  ];

  for (const phrase of knownLoops) {
    const count = (text.match(new RegExp(phrase, 'g')) || []).length;
    if (count > 10) {
      console.log(`  🔁 Loop detected: "${phrase}" appears ${count} times`);
      return true;
    }
  }

  return false;
}

async function testMathExamGeneration() {
  console.log('🔧 Initializing Gemini API for math exam generation (V2)...');
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

  // Load math textbook image (from CLI argument or default)
  const imageFileName = process.argv[2] || 'potenssi.JPG';
  const imagePath = path.join(__dirname, 'assets/images/math8thgrade', imageFileName);

  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Test image not found: ${imagePath}`);
    console.error(`Usage: npx tsx test-math-exam-generation-v2.ts [image-filename]`);
    process.exit(1);
  }

  console.log(`📸 Loading math textbook image: ${path.basename(imagePath)}`);
  const imageBuffer = fs.readFileSync(imagePath);
  const imageBase64 = imageBuffer.toString('base64');

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType: 'image/jpeg'
    }
  };

  console.log('\n📝 Math Exam Prompt (V2 - Professional Optimized):');
  console.log('─'.repeat(80));
  console.log(mathPrompt);
  console.log('─'.repeat(80));

  // Retry logic with progressive temperature increases
  const maxAttempts = 3;
  const temperatures = [0, 0.3, 0.5];
  let parsed: MathExamResponse | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const currentTemp = temperatures[attempt];
    console.log(`\n🔄 Attempt ${attempt + 1}/${maxAttempts} (temperature: ${currentTemp})`);

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: currentTemp,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192
      }
    });

    try {
      console.log('⏳ Calling Gemini API...');
      const startTime = Date.now();

      const result = await model.generateContent([mathPrompt, imagePart]);
      const response = result.response;
      const text = response.text();

      const duration = Date.now() - startTime;
      console.log(`✅ Response received in ${duration}ms (${text.length} chars)`);

      // Check for infinite loop BEFORE parsing
      if (detectInfiniteLoop(text)) {
        console.log(`⚠️  Infinite loop detected in attempt ${attempt + 1}`);
        if (attempt < maxAttempts - 1) {
          console.log(`🔄 Retrying with temperature ${temperatures[attempt + 1]}...`);
          continue;
        } else {
          fs.writeFileSync('debug-response-v2.txt', text);
          throw new Error('All retry attempts failed due to infinite loops');
        }
      }

      console.log('📄 Response preview:');
      console.log('─'.repeat(80));
      console.log(text.substring(0, 500) + '...');
      console.log('─'.repeat(80));

      // Parse JSON using ExamGenie's robust multi-strategy parser
      console.log('\n🔍 Attempting JSON parse with multi-strategy parser...');
      const parseResult = safeJsonParse(text);
      console.log(`Parse result - Success: ${parseResult.success}, Method: ${parseResult.method}`);

      if (!parseResult.success) {
        console.log(`❌ JSON parse failed in attempt ${attempt + 1}: ${parseResult.error}`);
        if (attempt < maxAttempts - 1) {
          console.log(`🔄 Retrying with temperature ${temperatures[attempt + 1]}...`);
          continue;
        }
        // Save debug on final failure
        console.log('\n⚠️  Saving full response to debug-response-v2.txt for inspection...');
        fs.writeFileSync('debug-response-v2.txt', text);
        console.log('✅ Debug file saved');
        throw new Error('Failed to parse JSON after all attempts');
      }

      // Success! Use this result
      console.log(`\n✅ Success on attempt ${attempt + 1} (temperature: ${currentTemp})`);
      parsed = parseResult.data as MathExamResponse;
      console.log(`📊 Question count: ${parsed.questions?.length || 0}`);
      console.log(`📚 Topic: ${parsed.topic || 'Not specified'}`);
      break;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (attempt === maxAttempts - 1) {
        console.error('\n❌ All retry attempts failed');
        throw error;
      }
      console.log(`⚠️  Attempt ${attempt + 1} failed: ${errorMessage}`);
    }
  }

  // Generate output files if we got a valid result
  if (parsed && parsed.questions) {
    // Validate and analyze questions
    const stats = validateMathQuestions(parsed.questions);
    printStatistics(stats);

    // Generate output filenames based on input image with v2 suffix
    const baseName = path.basename(imagePath, path.extname(imagePath));
    const htmlFileName = `math-exam-preview-${baseName}-v2.html`;
    const jsonFileName = `math-exam-output-${baseName}-v2.json`;

    // Generate HTML preview
    const htmlContent = generateHTML(parsed);
    fs.writeFileSync(htmlFileName, htmlContent);
    console.log(`\n✅ HTML preview saved to: ${htmlFileName}`);

    // Save JSON output
    fs.writeFileSync(jsonFileName, JSON.stringify(parsed, null, 2));
    console.log(`✅ JSON output saved to: ${jsonFileName}`);
  } else {
    throw new Error('Failed to generate exam after all retry attempts');
  }
}

interface ValidationStats {
  totalQuestions: number;
  latexUsage: number[];
  visualReferences: number;
  validAnswerFormat: number;
  finnishLanguage: number;
  issues: string[];
}

function validateMathQuestions(questions: MathQuestion[]): ValidationStats {
  const stats: ValidationStats = {
    totalQuestions: questions.length,
    latexUsage: [],
    visualReferences: 0,
    validAnswerFormat: 0,
    finnishLanguage: 0,
    issues: []
  };

  const visualKeywords = ['kuva', 'sivu', 'kaavio', 'taulukko', 'kuvaaja', 'koordinaatisto'];
  const finnishChars = /[äöåÄÖÅ]/;

  questions.forEach((q, idx) => {
    // Count LaTeX usage
    const latexMatches = (q.question.match(/\$[^$]+\$/g) || []).length;
    const optionsLatex = q.options.reduce((sum, opt) =>
      sum + (opt.match(/\$[^$]+\$/g) || []).length, 0
    );
    stats.latexUsage.push(latexMatches + optionsLatex);

    // Check for visual references
    const hasVisualRef = visualKeywords.some(kw =>
      q.question.toLowerCase().includes(kw)
    );
    if (hasVisualRef) {
      stats.visualReferences++;
      stats.issues.push(`Q${q.id}: Visual reference detected`);
    }

    // Validate answer format
    if (q.options.includes(q.correct_answer)) {
      stats.validAnswerFormat++;
    } else {
      stats.issues.push(`Q${q.id}: correct_answer "${q.correct_answer}" not in options`);
    }

    // Check Finnish language
    if (finnishChars.test(q.question)) {
      stats.finnishLanguage++;
    }
  });

  return stats;
}

function printStatistics(stats: ValidationStats) {
  console.log('\n📊 Validation Statistics:');
  console.log('─'.repeat(80));
  console.log(`Total questions: ${stats.totalQuestions}`);
  console.log(`LaTeX usage: ${stats.latexUsage.reduce((a, b) => a + b, 0)} instances total`);
  console.log(`Average LaTeX per question: ${(stats.latexUsage.reduce((a, b) => a + b, 0) / stats.totalQuestions).toFixed(1)}`);
  console.log(`Visual references: ${stats.visualReferences} ⚠️`);
  console.log(`Valid answer format: ${stats.validAnswerFormat}/${stats.totalQuestions}`);
  console.log(`Finnish language: ${stats.finnishLanguage}/${stats.totalQuestions}`);

  if (stats.issues.length > 0) {
    console.log(`\n⚠️  Issues found: ${stats.issues.length}`);
    stats.issues.forEach(issue => console.log(`   ${issue}`));
  } else {
    console.log('\n✅ No issues found!');
  }
  console.log('─'.repeat(80));
}

function generateHTML(examData: MathExamResponse): string {
  const questions = examData.questions;

  const questionsHTML = questions.map((q, idx) => {
    const optionsHTML = q.options.map((option, optIdx) => {
      const letter = String.fromCharCode(65 + optIdx);
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
        <div class="options">
          ${optionsHTML}
        </div>
        <div class="explanation">
          <strong>Selitys:</strong> ${q.explanation}
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Math Exam Preview V2 - ExamGenie</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #ffffff;
      color: #000000;
      padding: 20px;
      line-height: 1.6;
    }

    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 1px solid #e0e0e0;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 24px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .logo {
      width: 40px;
      height: 40px;
      background: #000000;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
    }

    .question-card {
      max-width: 600px;
      margin: 0 auto 40px;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .question-number {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }

    .progress-dots {
      display: flex;
      gap: 6px;
      margin-bottom: 20px;
      justify-content: center;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #e0e0e0;
    }

    .dot.active {
      background: #000000;
    }

    .question-text {
      font-size: 20px;
      font-weight: 500;
      margin-bottom: 24px;
      color: #000000;
    }

    .options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .option {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      background: #ffffff;
      cursor: pointer;
      transition: all 0.2s;
    }

    .option:hover {
      border-color: #000000;
    }

    .option.correct {
      background: #d4edda;
      border-color: #28a745;
    }

    .radio-circle {
      width: 20px;
      height: 20px;
      border: 2px solid #666;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .option.correct .radio-circle {
      border-color: #28a745;
      background: #28a745;
      position: relative;
    }

    .option.correct .radio-circle::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 12px;
      font-weight: bold;
    }

    .option-text {
      flex: 1;
      font-size: 16px;
      color: #000000;
    }

    .explanation {
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      font-size: 14px;
      color: #333;
      border-left: 3px solid #000000;
    }

    .explanation strong {
      display: block;
      margin-bottom: 8px;
      color: #000000;
    }

    .footer {
      text-align: center;
      padding: 40px 20px;
      color: #666;
      font-size: 14px;
    }

    /* Mobile responsive */
    @media (max-width: 640px) {
      body {
        padding: 10px;
      }

      .question-card {
        padding: 20px;
      }

      .question-text {
        font-size: 18px;
      }

      .option {
        padding: 12px 16px;
      }

      .option-text {
        font-size: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>
      <span class="logo">🎓</span>
      ExamGenie - Matematiikan Koe (V2)
    </h1>
  </div>

  ${questionsHTML}

  <div class="footer">
    Generated by ExamGenie Math Exam Test Script V2 (Professional Optimized Prompt)<br>
    Topic: ${examData.topic || 'Mathematics'} | Grade: ${examData.grade || 8}
  </div>

  <script>
    // Render LaTeX with KaTeX
    document.addEventListener("DOMContentLoaded", function() {
      renderMathInElement(document.body, {
        delimiters: [
          {left: "$$", right: "$$", display: true},
          {left: "$", right: "$", display: false}
        ],
        throwOnError: false
      });
    });
  </script>
</body>
</html>`;
}

// Run the test
testMathExamGeneration().catch(console.error);
