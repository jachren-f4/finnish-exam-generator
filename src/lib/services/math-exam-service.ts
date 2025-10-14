/**
 * Math Exam Service - Specialized service for mathematics exam generation
 *
 * Features:
 * - V1 math prompt with forbidden error patterns
 * - Temperature retry logic (0 → 0.3 → 0.5)
 * - Infinite loop detection
 * - 3-level validation (structural, quality, mathematical)
 * - LaTeX notation support
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getGeminiApiKey, GEMINI_CONFIG, MATH_EXAM_CONFIG } from '../config'
import { safeJsonParse } from '../utils/json-handler'
import { createUsageMetadata } from '../utils/cost-calculator'

// ============================================================================
// INTERFACES
// ============================================================================

export interface MathQuestion {
  id: number
  type: string  // "multiple_choice" (math only uses this)
  question: string  // With LaTeX notation
  options: string[]  // Exactly 4 options
  correct_answer: string  // Must match one option exactly
  explanation: string  // Max 500 chars
}

export interface MathExamGenerationOptions {
  images: ImagePart[]  // Base64 encoded images
  grade: number  // 1-9 (Finnish grades)
  language: string  // ISO 639-1 code (e.g., 'fi', 'en')
  processingId: string  // For logging
}

export interface MathExamResult {
  success: boolean

  // Success fields
  rawText?: string  // JSON response from Gemini
  questions?: MathQuestion[]
  topic?: string
  grade?: number
  processingTime?: number
  temperatureUsed?: number
  validationScore?: number
  geminiUsage?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
    estimatedCost: number
    inputCost: number
    outputCost: number
    model: string
  }

  // Error fields
  error?: string
  details?: string
}

interface ImagePart {
  inlineData: {
    data: string  // Base64
    mimeType: string
  }
}

interface ValidationResult {
  score: number  // 0-100
  passed: boolean  // score >= 90
  errors: string[]
  warnings: string[]
}

// ============================================================================
// MATH EXAM SERVICE
// ============================================================================

export class MathExamService {
  /**
   * Generate math exam from textbook images
   * Uses V1 prompt with temperature retry and validation
   */
  static async generateMathExam(options: MathExamGenerationOptions): Promise<MathExamResult> {
    const { images, grade, language, processingId } = options

    console.log('[Math Service] Starting math exam generation')
    console.log('[Math Service] Grade:', grade)
    console.log('[Math Service] Language:', language)
    console.log('[Math Service] Images:', images.length)
    console.log('[Math Service] Processing ID:', processingId)

    try {
      // Step 1: Get math prompt
      const prompt = this.getMathPrompt(grade, language)
      console.log('[Math Service] Prompt length:', prompt.length, 'characters')

      // Step 2: Call Gemini with temperature retry
      const geminiResult = await this.callGeminiWithRetry(prompt, images, processingId)

      if (!geminiResult) {
        return {
          success: false,
          error: 'Math exam generation failed',
          details: 'All temperature retry attempts failed (infinite loops or API errors)'
        }
      }

      console.log(`[Math Service] ✅ Success with temperature ${geminiResult.temperature}`)

      // Step 3: Parse JSON response
      const parseResult = safeJsonParse(geminiResult.text)

      if (!parseResult.success) {
        return {
          success: false,
          error: 'Failed to parse Gemini response',
          details: `JSON parse error: ${parseResult.error}`
        }
      }

      const examData = parseResult.data as { questions: MathQuestion[]; topic?: string; grade?: number }

      if (!examData.questions || examData.questions.length === 0) {
        return {
          success: false,
          error: 'No questions generated',
          details: 'Gemini returned valid JSON but with no questions'
        }
      }

      console.log('[Math Service] Parsed', examData.questions.length, 'questions')

      // Step 4: Validate exam quality
      const validation = this.validateMathExam(examData.questions)

      console.log(`[Math Service] Validation score: ${validation.score}/100`)

      if (!validation.passed) {
        console.error('[Math Service] ❌ Validation failed:', validation.errors)
        return {
          success: false,
          error: 'Math exam validation failed',
          details: `Score: ${validation.score}/100. Errors: ${validation.errors.join(', ')}`
        }
      }

      if (validation.warnings.length > 0) {
        console.warn('[Math Service] ⚠️  Warnings:', validation.warnings)
      }

      // Step 5: Calculate usage metadata
      const usage = createUsageMetadata(prompt, geminiResult.text, undefined)

      // Step 6: Return success result
      return {
        success: true,
        rawText: JSON.stringify(examData, null, 2),
        questions: examData.questions,
        topic: examData.topic,
        grade: examData.grade || grade,
        processingTime: geminiResult.processingTime,
        temperatureUsed: geminiResult.temperature,
        validationScore: validation.score,
        geminiUsage: usage
      }

    } catch (error) {
      console.error('[Math Service] Unexpected error:', error)
      return {
        success: false,
        error: 'Math exam generation error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get math exam generation prompt (V1)
   * Includes forbidden error patterns and self-validation
   */
  private static getMathPrompt(grade: number, language: string = 'fi'): string {
    const EXAM_QUESTION_COUNT = MATH_EXAM_CONFIG.DEFAULT_QUESTION_COUNT

    return `ROLE: You are an expert mathematics teacher creating exam questions for grade ${grade} students.

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

CRITICAL VALIDATION RULES:
These errors will cause AUTOMATIC REJECTION - verify before finalizing each question:

❌ FORBIDDEN ERROR 1: Duplicate options
   - Bad: options = ["$y^{37}$", "$y^{31 \\\\cdot 6}$", "$y^0$", "$y^{37}$"]
   - Fix: Verify all 4 options are UNIQUE strings

❌ FORBIDDEN ERROR 2: "Closest answer" logic
   - Bad explanation: "oikea vastaus on 0,25... Koska 0,5 on lähin vastaus, valitaan se"
   - Fix: If NO option matches your calculation, SKIP the question entirely. NEVER choose "closest"

❌ FORBIDDEN ERROR 3: Wrong formula calculations (STEP-BY-STEP VERIFICATION REQUIRED)

   Geometry sector area: MUST use (angle/360) × π × r²
   Geometry arc length: MUST use (angle/360) × 2π × r

   CRITICAL: After stating the formula, verify EACH ARITHMETIC STEP:

   ✅ CORRECT EXAMPLE (r=87cm, angle=90°):
   Formula: (90/360) × π × 87²
   Step 1: 87² = 7569 ✓
   Step 2: 90/360 = 0.25 ✓
   Step 3: 0.25 × π = 0.7854 ✓
   Step 4: 0.7854 × 7569 = 5944.7 cm² ✓

   ❌ WRONG (this error appears in failed exams):
   Formula: (90/360) × π × 87² = (1/4) × π × 7569 ≈ 18960 cm² ← INCORRECT ARITHMETIC

   VERIFICATION RULE:
   Before finalizing ANY geometry answer, manually verify:
   - For r=87, angle=90°: answer MUST be ~5945 cm² (NOT 18960)
   - For r=5.3, angle=56°: answer MUST be ~13.7 cm² (NOT 19.8)
   - If your calculated value is 3× expected, STOP and recalculate

❌ FORBIDDEN ERROR 4: Visual references
   - Never write: "kuva", "sivu", "taulukko", "kaavio" in questions

SELF-VALIDATION CHECKLIST:
After generating EACH question, complete this checklist:

□ Step 1: Calculate answer independently and verify it's mathematically correct
□ Step 2: For geometry sector problems, verify EACH arithmetic step:
   - Compute r² correctly
   - Compute angle/360 as decimal
   - Multiply step-by-step: (angle/360) × π × r²
   - If r=87 and angle=90°, answer MUST be ~5945, verify this explicitly
□ Step 3: Verify correct_answer EXACTLY matches one option (character-for-character)
□ Step 4: Confirm all 4 options are UNIQUE (no duplicates)
□ Step 5: Ensure ONLY ONE option is mathematically correct
□ Step 6: Check explanation does NOT contain: "oikea vastaus", "lähin vastaus", "valitaan"
□ Step 7: Verify no visual references in question text
□ Step 8: If calculated value seems too large (3×+ expected), RECALCULATE before finalizing

IF ANY VALIDATION FAILS:
- STOP generation of that question immediately
- Move to next question
- DO NOT try to "fix" by choosing wrong answer

Begin generating the pedagogically sound exam now.`
  }

  /**
   * Call Gemini with progressive temperature retry
   */
  private static async callGeminiWithRetry(
    prompt: string,
    images: ImagePart[],
    processingId: string
  ): Promise<{ text: string; temperature: number; processingTime: number } | null> {

    const genAI = new GoogleGenerativeAI(getGeminiApiKey())
    const temperatures = MATH_EXAM_CONFIG.TEMPERATURE_RETRY_STRATEGY // [0, 0.3, 0.5]
    const maxAttempts = MATH_EXAM_CONFIG.MAX_RETRY_ATTEMPTS // 3

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const currentTemp = temperatures[attempt]
      console.log(`[Math Service] Attempt ${attempt + 1}/${maxAttempts} (temperature: ${currentTemp})`)

      // Create model with current temperature
      const model = genAI.getGenerativeModel({
        model: GEMINI_CONFIG.MODEL_NAME,
        generationConfig: {
          temperature: currentTemp,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192
        }
      })

      try {
        const startTime = Date.now()
        const result = await model.generateContent([prompt, ...images])
        const text = result.response.text()
        const processingTime = Date.now() - startTime

        console.log(`[Math Service] Response received: ${text.length} chars in ${processingTime}ms`)

        // Check for infinite loop BEFORE parsing
        if (this.detectInfiniteLoop(text)) {
          console.log(`[Math Service] ⚠️  Infinite loop detected`)
          if (attempt < maxAttempts - 1) {
            console.log(`[Math Service] Retrying with temperature ${temperatures[attempt + 1]}`)
            continue
          }
          return null // All attempts failed
        }

        // Try to parse to verify it's valid JSON before returning
        const parseResult = safeJsonParse(text)
        if (!parseResult.success) {
          console.log(`[Math Service] ⚠️  JSON parse failed: ${parseResult.error}`)
          if (attempt < maxAttempts - 1) {
            console.log(`[Math Service] Retrying with temperature ${temperatures[attempt + 1]}`)
            continue
          }
          return null
        }

        return { text, temperature: currentTemp, processingTime }

      } catch (error) {
        console.error(`[Math Service] Attempt ${attempt + 1} failed:`, error)
        if (attempt === maxAttempts - 1) {
          return null
        }
      }
    }

    return null
  }

  /**
   * Detects if Gemini's response contains infinite loop repetition
   * Common with temperature 0 on certain math topics
   */
  private static detectInfiniteLoop(text: string): boolean {
    const config = MATH_EXAM_CONFIG.INFINITE_LOOP_DETECTION

    // Check 1: Massive output
    if (text.length > config.MAX_CHARS) {
      console.log(`  📏 Loop detected: Response exceeds ${config.MAX_CHARS} characters`)
      return true
    }

    // Check 2: Repeated phrases (same phrase 5+ times in a row)
    const phrases = text.match(/([^\n]{20,})\1{4,}/g)
    if (phrases && phrases.length > 0) {
      console.log('  🔁 Loop detected: Repeated phrase pattern found')
      return true
    }

    // Check 3: Known loop phrases
    const knownLoops = ['ja tehtävässä on useita potensseja', 'ja tehtävässä', 'Tässä tapauksessa']
    for (const phrase of knownLoops) {
      const count = (text.match(new RegExp(phrase, 'g')) || []).length
      if (count > config.KNOWN_LOOP_PHRASE_THRESHOLD) {
        console.log(`  🔁 Loop detected: "${phrase}" appears ${count} times`)
        return true
      }
    }

    return false
  }

  /**
   * Validate math exam quality
   * Threshold: 90+ points to pass
   */
  private static validateMathExam(questions: MathQuestion[]): ValidationResult {
    const result: ValidationResult = {
      score: 0,
      passed: false,
      errors: [],
      warnings: []
    }

    let structuralScore = 75 // Start with max
    let qualityScore = 45
    let mathematicalScore = 15

    // Level 1: Structural validation
    questions.forEach((q, idx) => {
      // Check required fields
      if (!q.id || !q.question || !q.options || !q.correct_answer || !q.explanation) {
        result.errors.push(`Q${idx + 1}: Missing required field`)
        structuralScore -= 5
      }

      // Check option count
      if (q.options && q.options.length !== 4) {
        result.errors.push(`Q${idx + 1}: Must have exactly 4 options (has ${q.options.length})`)
        structuralScore -= 5
      }

      // Check for duplicate options
      if (q.options) {
        const uniqueOptions = new Set(q.options)
        if (uniqueOptions.size !== q.options.length) {
          result.errors.push(`Q${idx + 1}: Duplicate options detected`)
          structuralScore -= 5
        }
      }
    })

    // Level 2: Quality validation
    const selfAdmittedErrors = [
      'oikea vastaus on',
      'lähin vastaus',
      'valitaan se',
      'Tehtävässä on virheellinen',
      'Huom:',
      'Korjataan',
      'Oletetaan'
    ]

    questions.forEach((q, idx) => {
      const explanation = q.explanation?.toLowerCase() || ''

      for (const phrase of selfAdmittedErrors) {
        if (explanation.includes(phrase.toLowerCase())) {
          result.errors.push(`Q${idx + 1}: AI admitted answer is wrong: "${phrase}"`)
          qualityScore -= 15  // Major deduction
        }
      }

      // Check for visual references
      const visualKeywords = ['kuva', 'sivu', 'taulukko', 'kaavio', 'kuvaaja', 'koordinaatisto']
      for (const keyword of visualKeywords) {
        if (q.question.toLowerCase().includes(keyword)) {
          result.warnings.push(`Q${idx + 1}: Visual reference detected: "${keyword}"`)
          qualityScore -= 5
        }
      }

      // Check explanation length
      if (q.explanation && q.explanation.length > 500) {
        result.warnings.push(`Q${idx + 1}: Explanation too long: ${q.explanation.length} chars (max 500)`)
        qualityScore -= 2
      }
    })

    // Level 3: Mathematical validation
    questions.forEach((q, idx) => {
      // Check correct_answer is in options
      if (q.options && !q.options.includes(q.correct_answer)) {
        result.errors.push(`Q${idx + 1}: correct_answer "${q.correct_answer}" not in options`)
        mathematicalScore -= 5
      }

      // Check Finnish language (at least one Finnish character)
      const finnishChars = /[äöåÄÖÅ]/
      if (!finnishChars.test(q.question + q.explanation)) {
        result.warnings.push(`Q${idx + 1}: Missing Finnish characters`)
        mathematicalScore -= 2
      }

      // Check LaTeX syntax (basic validation)
      const latexMatches = q.question.match(/\$[^$]+\$/g)
      if (latexMatches) {
        latexMatches.forEach(latex => {
          // Check for malformed fractions
          if (latex.includes('\\frac{') && !latex.includes('}')) {
            result.warnings.push(`Q${idx + 1}: Malformed LaTeX fraction syntax`)
            mathematicalScore -= 1
          }
        })
      }
    })

    // Calculate final score
    result.score = Math.max(0, structuralScore + qualityScore + mathematicalScore)
    result.passed = result.score >= MATH_EXAM_CONFIG.VALIDATION_THRESHOLD

    return result
  }
}
