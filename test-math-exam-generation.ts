/**
 * Math Exam Generation Test Script
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

// Math-specific exam generation prompt
const EXAM_QUESTION_COUNT = 15;
const grade = 8;

const mathPrompt = `ROLE: You are an expert mathematics teacher creating exam questions for grade ${grade} students.

CONTEXT: You are analyzing textbook images containing mathematical content. The images may show:
- Algebraic expressions and equations
- Rational expressions (fractions with variables)
- Exponential expressions and powers
- Geometric problems and measurements
- Word problems with real-world context

CRITICAL - CONTENT ANALYSIS:
Before generating questions, analyze the material shown:
1. **Detect the topic**: Identify the specific mathematical concepts (e.g., "rational expressions", "exponents", "linear equations", "geometry")
2. **Assess difficulty**: Note the actual complexity level shown in the images
3. **Identify problem types**: computational, simplification, word problems, conceptual understanding

CRITICAL - DO NOT COPY EXERCISES DIRECTLY:
The textbook shows sub-exercises labeled (a, b, c, d). DO NOT convert these directly into multiple choice questions.
Instead, CREATE NEW ORIGINAL questions that test the SAME SKILLS at the SAME DIFFICULTY LEVEL.

FORBIDDEN (poor pedagogy):
❌ Question: "Calculate $10^1$" with answer "$10^1$" (this is nonsense - answer must be the VALUE)
❌ Directly copying sub-parts (a, b, c, d) from textbook as separate questions
❌ Questions where multiple options are correct
❌ Pure mechanical calculation without understanding

TASK: Generate ${EXAM_QUESTION_COUNT} exam questions following this distribution:

QUESTION TYPE DISTRIBUTION:
1. Computational questions (6): Ask for NUMERICAL VALUE answers
   - Example: "Calculate $10^3$" → Answer: "1000" (NOT "$10^3$")
   - For geometry: "Calculate the sector area..." → Answer: "19.8 cm²"

2. Formula application / Simplification questions (4): **ADAPT TO CONTENT**
   - For algebra/exponents: "Simplify $a^3 \\\\cdot a^5$" → Answer: "$a^8$" (wrap in $ delimiters)
   - For division: "Simplify $\\\\frac{b^{12}}{b^4}$" → Options: "$b^8$", "$b^{16}$", "$b^3$", "$\\\\frac{1}{b^8}$"
   - For geometry: "Apply the sector area formula to find..." → Answer: numerical result
   - For equations: "Solve for x in..." → Answer: "$x = 5$"

3. Word problems (3): Real-world applications
   - Population growth, money/interest, technology, scientific notation
   - For geometry: angle of view, circular arc measurements, practical applications
   - Must require calculation, not just pattern recognition

4. Conceptual questions (2): Test understanding (adapt to topic)
   - For exponents: "Why is any number to the power of 0 equal to 1?"
   - For fractions: "Why must fractions have a common denominator before adding?"
   - For geometry: "Which formula correctly calculates sector area?" or "Explain the relationship between arc length and central angle"

ANSWER FORMAT RULES:
- For "Calculate" questions: Options MUST be NUMBERS
- For "Simplify" questions: Options MUST be SIMPLIFIED expressions
- Wrong options should represent COMMON STUDENT ERRORS

GOOD DISTRACTORS (represent common student errors):
Exponents: $(-2)^3 = -8$ → wrong: "8" (forgot sign), "-6" (multiplied not exponentiated)
Fractions: "$\\\\frac{x}{6} - \\\\frac{5}{3}$" → wrong: "$\\\\frac{x-5}{3}$" (subtracted denominators)
Geometry: Sector area 19,6 cm² → wrong: 39,2 cm² (forgot sector fraction), 31,4 cm² (confused with arc)
NOTE: Wrap all \\\\frac, \\\\cdot in $...$

MATHEMATICAL NOTATION:
- Math mode ($...$) for EXPRESSIONS ONLY, not plain decimals: "8,9 m" not "$8,9 m$"
- LaTeX commands MUST wrap in $...$: "$\\\\frac{1}{b^8}$" renders, "\\\\frac{1}{b^8}" shows raw code
- Operators: $\\\\cdot$ (multiply), $\\\\frac{a}{b}$ (fractions), $\\\\alpha$/$\\\\beta$/$\\\\pi$ (Greek), ° (degrees)

JSON ESCAPING: Double all backslashes in JSON strings. Example: LaTeX \\\\frac becomes JSON \\\\\\\\frac which renders as "$\\\\frac{1}{2}$"

OUTPUT FORMAT:
You MUST respond with valid JSON following this schema:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Clear question with LaTeX notation",
      "options": [
        "First option",
        "Second option",
        "Third option",
        "Fourth option"
      ],
      "correct_answer": "First option",
      "explanation": "CONCISE explanation in Finnish (1-3 sentences max) covering why this is correct and common errors"
    }
  ],
  "topic": "Detected mathematics topic",
  "grade": ${grade}
}

EXPLANATIONS: Max 3 sentences/500 chars. State formula + ONE example + ONE common error. No repetition/loops. If ambiguity detected, skip to next question.

QUALITY REQUIREMENTS:
□ Questions test understanding, not just memorization
□ Mix of computational and conceptual questions
□ Progressive difficulty (easy → medium → hard)
□ Each question tests a DIFFERENT skill or concept
□ Only ONE correct answer per question
□ correct_answer EXACTLY matches one option
□ All questions in Finnish (detected from source)
□ No references to images or page numbers
□ Clear and unambiguous wording

SELF-VALIDATION:
After generating each question:
1. Verify the answer is mathematically correct
2. Check that "Calculate" questions have numerical answers
3. Ensure "Simplify" questions have simplified expressions
4. Confirm LaTeX syntax is valid (balanced delimiters)
5. Verify correct_answer exactly matches one option
6. Check distractors represent realistic errors
7. CRITICAL: Ensure ONLY ONE option is mathematically correct
   - For simplification questions, verify other options don't simplify to the same result
   - Example: Don't include both "$a^3 \\\\cdot a^2$" and "$a^8 \\\\div a^3$" if both equal "$a^5$"
   - If you detect multiple correct answers, STOP and regenerate that question with different distractors

Begin generating the pedagogically sound exam now.`;

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
  console.log('🔧 Initializing Gemini API for math exam generation...');
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

  // Load math textbook image
  const imagePath = path.join(__dirname, 'assets/images/math8thgrade/potenssi.JPG');

  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Test image not found: ${imagePath}`);
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

  console.log('\n📝 Math Exam Prompt:');
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
          fs.writeFileSync('debug-response.txt', text);
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
        console.log('\n⚠️  Saving full response to debug-response.txt for inspection...');
        fs.writeFileSync('debug-response.txt', text);
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

    // Generate HTML preview
    const htmlContent = generateHTML(parsed);
    fs.writeFileSync('math-exam-preview-potenssi-optimized.html', htmlContent);
    console.log('\n✅ HTML preview saved to: math-exam-preview-potenssi-optimized.html');

    // Save JSON output
    fs.writeFileSync('math-exam-output-potenssi-optimized.json', JSON.stringify(parsed, null, 2));
    console.log('✅ JSON output saved to: math-exam-output-potenssi-optimized.json');
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
  <title>Math Exam Preview - ExamGenie</title>
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
      ExamGenie - Matematiikan Koe
    </h1>
  </div>

  ${questionsHTML}

  <div class="footer">
    Generated by ExamGenie Math Exam Test Script<br>
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
