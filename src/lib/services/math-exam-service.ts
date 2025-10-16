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
import { getGeminiApiKey, GEMINI_CONFIG, MATH_EXAM_CONFIG, PROMPTS } from '../config'
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
      const prompt = PROMPTS.getMathPrompt(grade, language)
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
