/**
 * Prompt Optimization Testing Script
 * Tests different prompt variants and analyzes quality
 */

import { getPromptVariant } from './src/lib/config-test-variants'
import { processImagesWithGemini } from './src/lib/gemini'
import * as fs from 'fs/promises'
import * as path from 'path'

interface QualityMetrics {
  languageAccuracy: 'PASS' | 'FAIL'
  answerFormat: 'PASS' | 'FAIL'
  answerLeakage: 'PASS' | 'WARNING' | 'FAIL'
  verbatimCopying: 'PASS' | 'WARNING' | 'FAIL'
  textBasedViolations: 'PASS' | 'FAIL'
  grammarQuality: 'PASS' | 'WARNING' | 'FAIL'
  questionIndependence: 'PASS' | 'WARNING' | 'FAIL'
  issues: string[]
}

interface TestResult {
  variant: string
  promptSize: number
  questions: any[]
  metrics: QualityMetrics
  timestamp: string
}

async function analyzeQuestionQuality(question: any, sourceLanguage: string): Promise<{
  metrics: Partial<QualityMetrics>
  issues: string[]
}> {
  const issues: string[] = []
  const metrics: Partial<QualityMetrics> = {}

  // 1. Language Accuracy Check
  const questionText = question.question || ''
  const hasNonEnglish = /[äöåÄÖÅáéíóúàèìòùâêîôûãõñç]/i.test(questionText)

  if (sourceLanguage === 'fi') {
    if (!hasNonEnglish && questionText.length > 0) {
      metrics.languageAccuracy = 'FAIL'
      issues.push(`Q${question.id}: Language mismatch - Finnish source but English question: "${questionText.substring(0, 50)}..."`)
    } else {
      metrics.languageAccuracy = 'PASS'
    }
  }

  // 2. Answer Format Check
  const correctAnswer = question.correct_answer || ''
  const isLetterFormat = /^[A-D]$/i.test(correctAnswer.trim())

  if (isLetterFormat) {
    metrics.answerFormat = 'FAIL'
    issues.push(`Q${question.id}: Letter format detected - correct_answer: "${correctAnswer}" (should be actual text)`)
  } else if (Array.isArray(question.options) && !question.options.includes(correctAnswer)) {
    metrics.answerFormat = 'FAIL'
    issues.push(`Q${question.id}: correct_answer "${correctAnswer}" not found in options: ${JSON.stringify(question.options)}`)
  } else {
    metrics.answerFormat = 'PASS'
  }

  // 3. Answer Leakage Check
  const questionLower = questionText.toLowerCase()
  const answerLower = correctAnswer.toLowerCase()

  // Check for "because/since/so" clauses
  const leakagePatterns = [
    /koska|sillä|joten|siksi/i, // Finnish
    /because|since|so that|therefore/i // English
  ]

  let hasLeakage = false
  for (const pattern of leakagePatterns) {
    if (pattern.test(questionText)) {
      // Check if answer appears after the clause
      const parts = questionText.split(pattern)
      if (parts.length > 1 && parts[1].toLowerCase().includes(answerLower.substring(0, 5))) {
        hasLeakage = true
        break
      }
    }
  }

  if (hasLeakage) {
    metrics.answerLeakage = 'FAIL'
    issues.push(`Q${question.id}: Answer leakage detected in question`)
  } else if (leakagePatterns.some(p => p.test(questionText))) {
    metrics.answerLeakage = 'WARNING'
    issues.push(`Q${question.id}: Contains explanatory clause (because/since/so) - potential leakage risk`)
  } else {
    metrics.answerLeakage = 'PASS'
  }

  // 4. Text-Based Violations Check
  const violationPatterns = [
    /kuva(ssa|n|sta)?|diagram|picture|image|photo/i,
    /sivu(lla|n|sta)?|page \d+/i,
    /katso|see (above|below|diagram|image)/i,
    /yllä|alla|above|below/i
  ]

  const hasViolation = violationPatterns.some(p => p.test(questionText))
  if (hasViolation) {
    metrics.textBasedViolations = 'FAIL'
    issues.push(`Q${question.id}: References visual/positional elements: "${questionText.substring(0, 50)}..."`)
  } else {
    metrics.textBasedViolations = 'PASS'
  }

  // 5. Verbatim Copying Check (basic - checks for very long questions that might be copied)
  if (questionText.length > 200) {
    metrics.verbatimCopying = 'WARNING'
    issues.push(`Q${question.id}: Very long question (${questionText.length} chars) - possible verbatim copy`)
  } else {
    metrics.verbatimCopying = 'PASS'
  }

  // 6. Grammar Quality (basic - checks for incomplete sentences)
  const hasEndPunctuation = /[.!?]$/.test(questionText.trim())
  const startsWithCapital = /^[A-ZÄÖÅ]/.test(questionText.trim())

  if (!hasEndPunctuation || !startsWithCapital) {
    metrics.grammarQuality = 'WARNING'
    issues.push(`Q${question.id}: Grammar issue - missing punctuation or capitalization`)
  } else {
    metrics.grammarQuality = 'PASS'
  }

  metrics.questionIndependence = 'PASS' // Default - hard to check programmatically

  return { metrics, issues }
}

async function testPromptVariant(
  variantName: 'variant1' | 'variant2' | 'variant3',
  imagePath: string,
  sourceLanguage: string = 'fi'
): Promise<TestResult> {
  console.log(`\n========================================`)
  console.log(`Testing ${variantName.toUpperCase()}`)
  console.log(`========================================\n`)

  // Get the prompt
  const prompt = getPromptVariant(variantName, 'core_academics', 5)
  console.log(`Prompt size: ${prompt.length} characters\n`)

  // Prepare image
  const imageBuffer = await fs.readFile(imagePath)
  const base64Data = imageBuffer.toString('base64')
  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: 'image/jpeg'
    }
  }

  // Process with Gemini
  console.log('Calling Gemini API...')
  const fileMetadata = {
    id: 'test-image',
    filename: path.basename(imagePath),
    mimeType: 'image/jpeg',
    size: imageBuffer.length
  }

  const results = await processImagesWithGemini([fileMetadata], prompt)
  const result = results[0]

  // Parse questions
  let questions: any[] = []
  try {
    const parsed = JSON.parse(result.rawText)
    questions = parsed.questions || []
  } catch (e) {
    console.error('Failed to parse Gemini response:', e)
    throw new Error('JSON parsing failed')
  }

  console.log(`Generated ${questions.length} questions\n`)

  // Analyze each question
  const allIssues: string[] = []
  const metricsArray: Partial<QualityMetrics>[] = []

  for (const question of questions) {
    const { metrics, issues } = await analyzeQuestionQuality(question, sourceLanguage)
    metricsArray.push(metrics)
    allIssues.push(...issues)
  }

  // Aggregate metrics
  const aggregated: QualityMetrics = {
    languageAccuracy: metricsArray.every(m => m.languageAccuracy === 'PASS') ? 'PASS' : 'FAIL',
    answerFormat: metricsArray.every(m => m.answerFormat === 'PASS') ? 'PASS' : 'FAIL',
    answerLeakage: metricsArray.every(m => m.answerLeakage === 'PASS') ? 'PASS' :
                   metricsArray.some(m => m.answerLeakage === 'FAIL') ? 'FAIL' : 'WARNING',
    verbatimCopying: metricsArray.every(m => m.verbatimCopying === 'PASS') ? 'PASS' : 'WARNING',
    textBasedViolations: metricsArray.every(m => m.textBasedViolations === 'PASS') ? 'PASS' : 'FAIL',
    grammarQuality: metricsArray.every(m => m.grammarQuality === 'PASS') ? 'PASS' : 'WARNING',
    questionIndependence: 'PASS', // Default
    issues: allIssues
  }

  // Print results
  console.log('=== QUALITY METRICS ===')
  console.log(`Language Accuracy:       ${aggregated.languageAccuracy}`)
  console.log(`Answer Format:           ${aggregated.answerFormat}`)
  console.log(`Answer Leakage:          ${aggregated.answerLeakage}`)
  console.log(`Verbatim Copying:        ${aggregated.verbatimCopying}`)
  console.log(`Text-Based Violations:   ${aggregated.textBasedViolations}`)
  console.log(`Grammar Quality:         ${aggregated.grammarQuality}`)
  console.log(`Question Independence:   ${aggregated.questionIndependence}`)

  if (allIssues.length > 0) {
    console.log(`\n=== ISSUES FOUND (${allIssues.length}) ===`)
    allIssues.forEach(issue => console.log(`  ${issue}`))
  }

  const timestamp = new Date().toISOString()

  return {
    variant: variantName,
    promptSize: prompt.length,
    questions,
    metrics: aggregated,
    timestamp
  }
}

async function main() {
  const imagePath = path.join(process.cwd(), 'photo1.jpg')

  // Test all variants
  const results: TestResult[] = []

  for (const variant of ['variant1', 'variant2', 'variant3'] as const) {
    try {
      const result = await testPromptVariant(variant, imagePath, 'fi')
      results.push(result)

      // Save detailed results
      const outputDir = path.join(process.cwd(), 'prompttests')
      await fs.mkdir(outputDir, { recursive: true })

      const filename = `test-${variant}-${Date.now()}.json`
      await fs.writeFile(
        path.join(outputDir, filename),
        JSON.stringify(result, null, 2)
      )

      console.log(`\nResults saved to: ${filename}\n`)

    } catch (error) {
      console.error(`Error testing ${variant}:`, error)
    }
  }

  // Generate comparison report
  console.log('\n========================================')
  console.log('FINAL COMPARISON')
  console.log('========================================\n')

  results.forEach(r => {
    console.log(`${r.variant.toUpperCase()}: ${r.promptSize} chars`)
    console.log(`  Language: ${r.metrics.languageAccuracy}`)
    console.log(`  Format: ${r.metrics.answerFormat}`)
    console.log(`  Leakage: ${r.metrics.answerLeakage}`)
    console.log(`  Issues: ${r.metrics.issues.length}`)
    console.log()
  })
}

main().catch(console.error)
