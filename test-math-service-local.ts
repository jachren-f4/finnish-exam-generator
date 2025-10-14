/**
 * Test script for standalone Math Exam Service
 * Tests the math service in isolation before integration
 */

// Load environment variables FIRST (before any imports that depend on them)
require('dotenv').config({ path: '.env.local' })

import { MathExamService } from './src/lib/services/math-exam-service'
import fs from 'fs'
import path from 'path'

async function testMathService() {
  console.log('=== Math Service Standalone Test ===\n')

  // Load test image (potenssi.JPG - exponents topic)
  const imagePath = path.join(process.cwd(), 'assets/images/math8thgrade/potenssi.JPG')

  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Test image not found: ${imagePath}`)
    process.exit(1)
  }

  const imageBuffer = fs.readFileSync(imagePath)
  const base64Image = imageBuffer.toString('base64')

  console.log(`📄 Loaded test image: ${path.basename(imagePath)}`)
  console.log(`📊 Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB\n`)

  // Test math exam generation
  console.log('🧮 Generating math exam...\n')
  const startTime = Date.now()

  const result = await MathExamService.generateMathExam({
    images: [{
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg'
      }
    }],
    grade: 8,
    language: 'fi',
    processingId: 'test-math-service-local'
  })

  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2)

  // Check result
  if (!result.success) {
    console.error(`❌ Math exam generation failed: ${result.error}`)
    if (result.details) {
      console.error(`   Details: ${result.details}`)
    }
    process.exit(1)
  }

  // Verify results
  console.log('✅ Math exam generated successfully!\n')
  console.log('=== RESULTS ===')
  console.log(`⏱️  Processing time: ${result.processingTime}ms (${elapsedTime}s total)`)
  console.log(`🌡️  Temperature used: ${result.temperatureUsed}`)
  console.log(`📝 Questions generated: ${result.questions.length}`)
  console.log(`🎯 Validation score: ${result.validationScore}/100`)
  console.log(`📖 Topic: ${result.topic}`)
  console.log(`🎓 Grade level: ${result.grade}\n`)

  // Usage metadata
  if (result.geminiUsage) {
    const usage = result.geminiUsage
    console.log('=== GEMINI USAGE ===')
    console.log(`📥 Input tokens: ${usage.inputTokens || 'N/A'}`)
    console.log(`📤 Output tokens: ${usage.outputTokens || 'N/A'}`)
    console.log(`💰 Input cost: $${(usage.inputCost || 0).toFixed(4)}`)
    console.log(`💰 Output cost: $${(usage.outputCost || 0).toFixed(4)}`)
    console.log(`💰 Total cost: $${(usage.totalCost || 0).toFixed(4)}\n`)
  }

  // Verify requirements
  let testsPassed = true

  // Test 1: Question count
  if (result.questions.length !== 15) {
    console.error(`❌ Expected 15 questions, got ${result.questions.length}`)
    testsPassed = false
  } else {
    console.log('✅ Question count: 15')
  }

  // Test 2: Validation score
  if (result.validationScore < 90) {
    console.error(`❌ Validation score below threshold: ${result.validationScore}/100`)
    testsPassed = false
  } else {
    console.log(`✅ Validation score: ${result.validationScore}/100 (>= 90)`)
  }

  // Test 3: LaTeX notation present
  const hasLatex = result.questions.some(q =>
    q.question.includes('$') ||
    q.correct_answer?.includes('$') ||
    q.options?.some(opt => opt.includes('$'))
  )
  if (hasLatex) {
    console.log('✅ LaTeX notation detected in questions')
  } else {
    console.warn('⚠️  No LaTeX notation found (may be normal for some topics)')
  }

  // Show sample questions
  console.log('\n=== SAMPLE QUESTIONS ===')
  result.questions.slice(0, 3).forEach((q, idx) => {
    console.log(`\nQuestion ${idx + 1} [${q.type}]:`)
    console.log(`Q: ${q.question}`)
    if (q.options) {
      q.options.forEach((opt, i) => console.log(`   ${String.fromCharCode(65 + i)}) ${opt}`))
    }
    console.log(`✓ Answer: ${q.correct_answer}`)
  })

  // Final result
  console.log('\n=== TEST SUMMARY ===')
  if (testsPassed) {
    console.log('✅ All tests passed! Math service is ready for integration.')
    process.exit(0)
  } else {
    console.error('❌ Some tests failed. Review output above.')
    process.exit(1)
  }
}

// Run test
testMathService().catch(error => {
  console.error('❌ Test failed with error:', error)
  process.exit(1)
})
