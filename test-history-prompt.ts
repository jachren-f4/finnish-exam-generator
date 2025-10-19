/**
 * Test Script for History Exam Generation
 *
 * Tests improved history-specific prompt that:
 * - Focuses on MAIN TOPICS from source material
 * - Avoids generic definition questions
 * - Tests comprehension of specific historical events/narratives
 * - Validates factual accuracy
 *
 * Usage:
 * 1. Place your test images in: assets/images/history-test/
 * 2. Run: npx tsx test-history-prompt.ts
 * 3. Review output in: test-output-history.json
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY not found in .env.local')
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

/**
 * IMPROVED HISTORY PROMPT
 *
 * Key improvements:
 * 1. Emphasizes extracting SPECIFIC content from material
 * 2. Forbids generic definition questions
 * 3. Requires questions about main narrative/events
 * 4. Demands factual accuracy verification
 */
function getHistoryPrompt(grade: number = 8): string {
  return `You are creating a history exam for grade ${grade} elementary/middle school students.

🎯 PRIMARY OBJECTIVE: Create clear, direct questions about the historical content in the textbook.

⚠️ CRITICAL LANGUAGE REQUIREMENT:
- Use the SAME language as the textbook
- Auto-detect the language from the images
- ALL content MUST be in the detected language (Finnish, Swedish, English, German, etc.)

📚 ELEMENTARY SCHOOL QUESTION STYLE:
✅ Write questions naturally and directly
✅ Ask simple, clear questions that a student would understand
✅ Avoid academic phrases like "according to the material" or "the text states"
✅ Make questions conversational and age-appropriate

CONTENT ANALYSIS:
First, read the textbook carefully and identify:
- What historical event/period is covered?
- Who are the main people/groups?
- What happened (key events in order)?
- When did it happen?
- Why did it happen?
- What were the results?

QUESTION DISTRIBUTION:
1. **Main Events** (40%): What happened? When? Key turning points?
2. **Causes & Results** (30%): Why did it happen? What were the consequences?
3. **Key People & Groups** (20%): Who was involved? What did they do?
4. **Important Terms** (10%): Only terms central to understanding the topic

QUESTION STYLE - NATURAL AND DIRECT:
✅ "Ketkä olivat sisällissodan osapuolet?"
✅ "Milloin tapahtui suuri lama?"
✅ "Miksi sodan jälkeen syntyi uusia valtioita?"
✅ "Kuka oli Saksan johtaja 1930-luvulla?"
✅ "Mitä tarkoittaa 'hyperinflaatio'?" (only if central concept)

❌ AVOID THESE AWKWARD PHRASES:
❌ "materiaalin mukaan" (according to the material)
❌ "tekstissä mainitaan" (the text mentions)
❌ "materiaaliin viitaten" (referring to the material)
❌ "lukemasi perusteella" (based on what you read)

Just ask directly what happened, who did it, when, why, etc.

FORBIDDEN:
❌ Generic vocabulary questions not tied to the topic
❌ Facts not in the textbook
❌ Visual references ("in the image", "on page X")
❌ Outside knowledge questions

FACTUAL ACCURACY:
Before finalizing each question:
□ Verify dates are exactly right
□ Verify names are spelled correctly
□ Verify the fact is clearly in the textbook
□ If unsure about anything, SKIP that question

Generate exactly 15 questions following this JSON format:

{
  "content_analysis": {
    "main_topic": "[1-sentence description of the primary historical topic]",
    "key_events": ["event 1", "event 2", "event 3"],
    "key_figures": ["person/group 1", "person/group 2"],
    "time_period": "[dates/era covered]",
    "main_narrative": "[2-3 sentence summary of the story/content]"
  },
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "[Question about SPECIFIC content - in SAME language as source material]",
      "options": [
        "[Option A in source language]",
        "[Option B in source language]",
        "[Option C in source language]",
        "[Option D in source language]"
      ],
      "correct_answer": "[Exact match from options - in source language]",
      "explanation": "[1-2 sentence explanation in SAME language as source material]",
      "question_category": "[main_event|cause_consequence|key_figure|context_term]",
      "source_verification": "[Brief note confirming this fact is in the material]"
    }
  ],
  "summary": {
    "introduction": "[100-250 word introduction to the SPECIFIC topic in the SAME language as source material]",
    "key_concepts": "[250-500 word explanation focusing on the MAIN NARRATIVE in the SAME language]",
    "examples_and_applications": "[200-400 word section on understanding this historical topic in the SAME language]",
    "summary_conclusion": "[100-250 word conclusion in the SAME language]",
    "total_word_count": [approximate word count],
    "language": "[ISO 639-1 code - e.g., 'fi' for Finnish, 'en' for English, 'sv' for Swedish]"
  },
  "quality_metrics": {
    "main_event_questions": [count],
    "cause_consequence_questions": [count],
    "key_figure_questions": [count],
    "context_term_questions": [count],
    "generic_definition_questions": [count - should be 0 or minimal],
    "factual_accuracy_verified": true
  }
}

CRITICAL - LANGUAGE DETECTION:
1. Examine the textbook images carefully
2. Identify the source language (Finnish, Swedish, English, German, etc.)
3. Generate ALL content in that detected language
4. Match the language naturally - if the textbook is in Finnish, write in Finnish; if Swedish, write in Swedish, etc.

QUALITY CHECKLIST (verify before finalizing):
□ At least 60% of questions focus on main events, causes, or key figures
□ Generic definition questions are < 20% of total
□ All facts are present in the textbook
□ All dates, names, events verified for accuracy
□ Questions are natural and direct (no "according to the material" phrases)
□ Questions are conversational and age-appropriate for elementary/middle school
□ No references to images, pages, or visual elements
□ Summary focuses on the specific historical topic
□ ALL content is in the SAME language as the textbook
□ Questions sound like something a teacher would naturally ask

Begin analysis and question generation now.`
}

/**
 * Load images from test folder
 */
function loadTestImages(folderPath: string): Array<{ inlineData: { data: string; mimeType: string } }> {
  const imageParts: Array<{ inlineData: { data: string; mimeType: string } }> = []

  try {
    const files = readdirSync(folderPath)
    const imageFiles = files.filter(f =>
      f.match(/\.(jpg|jpeg|png|webp|heic)$/i)
    )

    console.log(`📁 Found ${imageFiles.length} images in ${folderPath}`)

    for (const file of imageFiles) {
      const filePath = join(folderPath, file)
      const imageBuffer = readFileSync(filePath)
      const base64 = imageBuffer.toString('base64')

      // Determine mime type
      const ext = file.toLowerCase()
      let mimeType = 'image/jpeg'
      if (ext.endsWith('.png')) mimeType = 'image/png'
      else if (ext.endsWith('.webp')) mimeType = 'image/webp'
      else if (ext.endsWith('.heic')) mimeType = 'image/heic'

      imageParts.push({
        inlineData: {
          data: base64,
          mimeType
        }
      })

      console.log(`  ✓ Loaded: ${file} (${mimeType})`)
    }

    return imageParts
  } catch (error) {
    console.error(`❌ Error loading images from ${folderPath}:`, error)
    throw error
  }
}

/**
 * Generate history exam with improved prompt
 */
async function generateHistoryExam(
  imageParts: Array<{ inlineData: { data: string; mimeType: string } }>,
  grade: number = 5
) {
  console.log(`\n🧪 Testing history prompt with ${imageParts.length} images...`)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0, // Deterministic for accuracy
      responseMimeType: 'application/json'
    }
  })

  const prompt = getHistoryPrompt(grade)

  console.log('\n📋 Prompt length:', prompt.length, 'characters')
  console.log('🎯 Key requirements:')
  console.log('  - Focus on main topics from material')
  console.log('  - Avoid generic definitions')
  console.log('  - Verify factual accuracy')
  console.log('  - 60%+ questions on events/causes/figures\n')

  const startTime = Date.now()

  try {
    const result = await model.generateContent([
      prompt,
      ...imageParts
    ])

    const duration = Date.now() - startTime
    const response = result.response
    const text = response.text()

    console.log(`✅ Generation completed in ${(duration / 1000).toFixed(2)}s`)

    // Parse and validate JSON
    let parsedResponse
    try {
      parsedResponse = JSON.parse(text)
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response')
      writeFileSync('test-output-history-raw.txt', text)
      console.log('Raw response saved to: test-output-history-raw.txt')
      throw parseError
    }

    // Analyze quality metrics
    console.log('\n📊 QUALITY ANALYSIS:')

    if (parsedResponse.content_analysis) {
      console.log('\n🎯 Content Analysis:')
      console.log(`  Main Topic: ${parsedResponse.content_analysis.main_topic}`)
      console.log(`  Time Period: ${parsedResponse.content_analysis.time_period}`)
      console.log(`  Key Events: ${parsedResponse.content_analysis.key_events?.length || 0}`)
      console.log(`  Key Figures: ${parsedResponse.content_analysis.key_figures?.length || 0}`)
    }

    if (parsedResponse.quality_metrics) {
      const metrics = parsedResponse.quality_metrics
      console.log('\n📈 Question Distribution:')
      console.log(`  Main Events: ${metrics.main_event_questions || 0}`)
      console.log(`  Causes/Consequences: ${metrics.cause_consequence_questions || 0}`)
      console.log(`  Key Figures: ${metrics.key_figure_questions || 0}`)
      console.log(`  Context/Terms: ${metrics.context_term_questions || 0}`)
      console.log(`  Generic Definitions: ${metrics.generic_definition_questions || 0}`)

      const focusedQuestions = (metrics.main_event_questions || 0) +
                              (metrics.cause_consequence_questions || 0) +
                              (metrics.key_figure_questions || 0)
      const percentage = ((focusedQuestions / 15) * 100).toFixed(1)
      console.log(`\n  🎯 Focused questions: ${focusedQuestions}/15 (${percentage}%)`)

      if (focusedQuestions >= 9) {
        console.log('  ✅ PASS: ≥60% questions focus on main content')
      } else {
        console.log('  ⚠️  FAIL: <60% questions focus on main content')
      }
    }

    if (parsedResponse.questions) {
      console.log(`\n📝 Generated ${parsedResponse.questions.length} questions`)

      // Sample first 3 questions
      console.log('\n📋 Sample Questions:')
      parsedResponse.questions.slice(0, 3).forEach((q: any, idx: number) => {
        console.log(`\n  ${idx + 1}. ${q.question}`)
        console.log(`     Category: ${q.question_category || 'unknown'}`)
        console.log(`     Answer: ${q.correct_answer}`)
      })
    }

    // Save output
    const output = {
      test_metadata: {
        timestamp: new Date().toISOString(),
        model: 'gemini-2.0-flash-exp',
        temperature: 0,
        grade: grade,
        image_count: imageParts.length,
        duration_ms: duration
      },
      prompt_used: prompt,
      gemini_response: parsedResponse,
      usage_metadata: response.usageMetadata
    }

    const outputPath = 'test-output-history.json'
    writeFileSync(outputPath, JSON.stringify(output, null, 2))
    console.log(`\n💾 Full output saved to: ${outputPath}`)

    return parsedResponse

  } catch (error) {
    console.error('❌ Error generating exam:', error)
    throw error
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🏛️  HISTORY EXAM PROMPT TESTER')
  console.log('================================\n')

  // Configuration
  const IMAGE_FOLDER = 'assets/images/history_8th_compr'
  const GRADE = 8

  console.log(`📚 Configuration:`)
  console.log(`  Grade: ${GRADE}`)
  console.log(`  Image folder: ${IMAGE_FOLDER}`)
  console.log(`  Model: gemini-2.0-flash-exp`)
  console.log(`  Temperature: 0 (deterministic)\n`)

  try {
    // Load test images
    const imageParts = loadTestImages(IMAGE_FOLDER)

    if (imageParts.length === 0) {
      throw new Error(`No images found in ${IMAGE_FOLDER}. Please add test images.`)
    }

    // Generate exam
    await generateHistoryExam(imageParts, GRADE)

    console.log('\n✅ Test completed successfully!')
    console.log('\n📋 Next Steps:')
    console.log('  1. Review test-output-history.json')
    console.log('  2. Check content_analysis section')
    console.log('  3. Verify questions focus on main topics')
    console.log('  4. Validate factual accuracy of questions')
    console.log('  5. Compare with original exam to see improvements\n')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
main()
