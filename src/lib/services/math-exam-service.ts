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

export interface GuidedReflection {
  question: string
  pause_seconds: number
  short_answer: string
}

export interface AudioSummary {
  overview: string
  key_ideas: string
  applications: string
  common_mistakes: string
  guided_reflections: GuidedReflection[]
  total_word_count: number
  estimated_duration_seconds: number
  language: string  // ISO 639-1 code
}

export interface KeyConcept {
  concept_name: string
  definition: string
  difficulty: 'foundational' | 'intermediate' | 'advanced'
  category: string
  related_question_ids: number[]
  badge_title: string
  mini_game_hint: string
}

export interface Gamification {
  completion_message: string
  boss_question_open: string
  boss_question_multiple_choice: {
    question: string
    options: string[]
    correct_answer: string
  }
  reward_text: string
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
  audioSummary?: AudioSummary  // Audio summary for TTS
  keyConcepts?: KeyConcept[]  // NEW: Gamified key concepts
  gamification?: Gamification  // NEW: Gamification data
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

      const examData = parseResult.data as {
        questions: MathQuestion[]
        audio_summary?: AudioSummary
        topic?: string
        grade?: number
      }

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

      // Step 5: Create usage metadata from cumulative retry costs
      const usage = {
        promptTokenCount: geminiResult.cumulativeUsage.promptTokenCount,
        candidatesTokenCount: geminiResult.cumulativeUsage.candidatesTokenCount,
        totalTokenCount: geminiResult.cumulativeUsage.totalTokenCount,
        estimatedCost: geminiResult.cumulativeUsage.estimatedCost,
        inputCost: (geminiResult.cumulativeUsage.promptTokenCount / 1_000_000) * GEMINI_CONFIG.PRICING.INPUT_COST_PER_1M,
        outputCost: (geminiResult.cumulativeUsage.candidatesTokenCount / 1_000_000) * GEMINI_CONFIG.PRICING.OUTPUT_COST_PER_1M,
        model: GEMINI_CONFIG.MODEL_NAME,
        // Math-specific metadata
        mathRetryAttempts: geminiResult.cumulativeUsage.attemptsCount,
        temperatureUsed: geminiResult.temperature
      }

      // Step 6: Extract key concepts (Stage 2)
      console.log('[Math Service] Extracting key concepts (Stage 2)...')
      const conceptsResult = await this.extractKeyConcepts(
        examData.questions,
        images.length,
        language
      )

      let keyConcepts: KeyConcept[] | undefined
      let gamification: Gamification | undefined

      if (conceptsResult) {
        keyConcepts = conceptsResult.key_concepts
        gamification = conceptsResult.gamification
        console.log(`[Math Service] ✅ Extracted ${keyConcepts.length} key concepts`)
      } else {
        console.warn('[Math Service] ⚠️  Key concepts extraction failed (non-critical)')
      }

      // Step 7: Return success result
      return {
        success: true,
        rawText: JSON.stringify(examData, null, 2),
        questions: examData.questions,
        audioSummary: examData.audio_summary,
        keyConcepts,  // NEW
        gamification,  // NEW
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
   * Accumulates costs from ALL attempts (including failed ones) for accurate cost tracking
   */
  private static async callGeminiWithRetry(
    prompt: string,
    images: ImagePart[],
    processingId: string
  ): Promise<{
    text: string;
    temperature: number;
    processingTime: number;
    cumulativeUsage: {
      promptTokenCount: number;
      candidatesTokenCount: number;
      totalTokenCount: number;
      estimatedCost: number;
      attemptsCount: number;
    }
  } | null> {

    const genAI = new GoogleGenerativeAI(getGeminiApiKey())
    const temperatures = MATH_EXAM_CONFIG.TEMPERATURE_RETRY_STRATEGY // [0, 0.3, 0.5]
    const maxAttempts = MATH_EXAM_CONFIG.MAX_RETRY_ATTEMPTS // 3

    // Accumulate costs across ALL attempts (successful and failed)
    let cumulativePromptTokens = 0
    let cumulativeCandidatesTokens = 0
    let cumulativeCost = 0
    let attemptCount = 0
    let totalProcessingTime = 0

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
        const attemptTime = Date.now() - startTime
        totalProcessingTime += attemptTime

        console.log(`[Math Service] Response received: ${text.length} chars in ${attemptTime}ms`)

        // Capture usage from this attempt (even if it fails validation)
        const usage = result.response.usageMetadata
        if (usage) {
          const promptTokens = usage.promptTokenCount || 0
          const candidatesTokens = usage.candidatesTokenCount || 0
          const inputCost = (promptTokens / 1_000_000) * GEMINI_CONFIG.PRICING.INPUT_COST_PER_1M
          const outputCost = (candidatesTokens / 1_000_000) * GEMINI_CONFIG.PRICING.OUTPUT_COST_PER_1M

          cumulativePromptTokens += promptTokens
          cumulativeCandidatesTokens += candidatesTokens
          cumulativeCost += (inputCost + outputCost)
          attemptCount++

          console.log(`[Math Service] Attempt ${attempt + 1} cost: $${(inputCost + outputCost).toFixed(6)} (${promptTokens + candidatesTokens} tokens)`)
        }

        // Check for infinite loop BEFORE parsing
        if (this.detectInfiniteLoop(text)) {
          console.log(`[Math Service] ⚠️  Infinite loop detected - cost accumulated, trying next temperature`)
          if (attempt < maxAttempts - 1) {
            console.log(`[Math Service] Retrying with temperature ${temperatures[attempt + 1]}`)
            continue
          }
          return null // All attempts failed
        }

        // Try to parse to verify it's valid JSON before returning
        const parseResult = safeJsonParse(text)
        if (!parseResult.success) {
          console.log(`[Math Service] ⚠️  JSON parse failed - cost accumulated, trying next temperature`)
          if (attempt < maxAttempts - 1) {
            console.log(`[Math Service] Retrying with temperature ${temperatures[attempt + 1]}`)
            continue
          }
          return null
        }

        // SUCCESS - return with cumulative usage from all attempts
        console.log(`[Math Service] ✅ Success! Total cost from ${attemptCount} attempt(s): $${cumulativeCost.toFixed(6)}`)

        return {
          text,
          temperature: currentTemp,
          processingTime: totalProcessingTime,
          cumulativeUsage: {
            promptTokenCount: cumulativePromptTokens,
            candidatesTokenCount: cumulativeCandidatesTokens,
            totalTokenCount: cumulativePromptTokens + cumulativeCandidatesTokens,
            estimatedCost: cumulativeCost,
            attemptsCount: attemptCount
          }
        }

      } catch (error) {
        console.error(`[Math Service] Attempt ${attempt + 1} failed:`, error)
        // Note: Cost not tracked for hard API errors (network failures, etc.)
        if (attempt === maxAttempts - 1) {
          return null
        }
      }
    }

    return null
  }

  /**
   * Extract key concepts from generated math questions (Stage 2 of two-stage approach)
   * Uses a lightweight prompt to avoid token overflow
   */
  private static async extractKeyConcepts(
    questions: MathQuestion[],
    imageCount: number,
    language: string
  ): Promise<{ key_concepts: KeyConcept[]; gamification: Gamification } | null> {

    const expectedConcepts = imageCount * 3

    const prompt = `Extract ${expectedConcepts} key mathematical concepts from these questions.

CRITICAL: Use SPOKEN NOTATION (no LaTeX) in definitions.
- "x toiseen" NOT "$x^2$"
- "puolikas" or "yksi per kaksi" NOT "$\\frac{1}{2}$"
- "neliöjuuri" NOT "$\\sqrt{}$"

Questions:
${JSON.stringify(questions.slice(0, 5), null, 2)}
... (${questions.length} total questions)

Return ONLY valid JSON (no markdown):
{
  "key_concepts": [
    {
      "concept_name": "2-4 words (${language})",
      "definition": "SPOKEN notation only, 50-70 words max",
      "difficulty": "foundational" | "intermediate" | "advanced",
      "category": "Algebra" | "Geometry" | "Numbers" | "Problem Solving",
      "related_question_ids": [1, 3, 7],
      "badge_title": "2-3 words (${language})",
      "mini_game_hint": "8-12 words (${language})"
    }
  ],
  "gamification": {
    "completion_message": "Brief congratulations (${language})",
    "boss_question_open": "Synthesis question (${language})",
    "boss_question_multiple_choice": {
      "question": "MC question (${language})",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "One of A/B/C/D"
    },
    "reward_text": "5-10 words (${language})"
  }
}

CRITICAL: Exactly ${expectedConcepts} concepts. NO LaTeX in definitions.`

    const genAI = new GoogleGenerativeAI(getGeminiApiKey())
    const model = genAI.getGenerativeModel({
      model: GEMINI_CONFIG.MODEL_NAME,
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 2048  // Lightweight call
      }
    })

    try {
      console.log('[Math Service] [Stage 2] Extracting key concepts...')
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      console.log('[Math Service] [Stage 2] Response received:', text.length, 'chars')

      const parseResult = safeJsonParse(text)
      if (!parseResult.success) {
        console.error('[Math Service] [Stage 2] Failed to parse concepts:', parseResult.error)
        return null
      }

      const data = parseResult.data as { key_concepts: KeyConcept[]; gamification: Gamification }
      console.log('[Math Service] [Stage 2] ✅ Extracted', data.key_concepts?.length || 0, 'concepts')

      return data
    } catch (error) {
      console.error('[Math Service] [Stage 2] Concept extraction error:', error)
      return null
    }
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
