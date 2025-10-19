/**
 * Test Script for History Exam Generation v2
 *
 * Tests improved history prompt with terminology limits
 * This uses the EXACT same prompt as config.ts with added enforcement
 *
 * Usage:
 * 1. Place your test images in: assets/images/history_8th_compr/
 * 2. Run: npx tsx test-history-prompt-v2.ts
 * 3. Review output in: test-output-history-v2.json
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
 * EXACT COPY of getHistoryPrompt from config.ts
 * WITH ADDED TERMINOLOGY ENFORCEMENT
 */
function getHistoryPrompt(grade: number = 8): string {
  const EXAM_QUESTION_COUNT = 15

  return `Create a history exam for grade ${grade} elementary/middle school students.

🎯 PRIMARY OBJECTIVE: Create clear, direct questions about the historical content in the textbook.

⚠️ CRITICAL LANGUAGE REQUIREMENT:
- Use the SAME language as the textbook
- Auto-detect the language from the images
- ALL content MUST be in the detected language (Finnish, Swedish, English, German, etc.)

📚 ELEMENTARY SCHOOL QUESTION STYLE:
✅ Write questions naturally and directly - like a teacher would ask in class
✅ Use simple, clear language that students understand
✅ Avoid academic phrases like "according to the material" or "the text states"
✅ Make questions conversational and age-appropriate

CRITICAL RULES:
1. ✅ Questions MUST focus on the MAIN TOPICS and EVENTS in the textbook
2. ✅ Questions MUST be factually accurate (verify dates, names, events)
3. ✅ Questions should sound natural, not academic or formal
4. ❌ AVOID generic vocabulary questions unless the term is central to the topic
5. ❌ NEVER include facts not present in the textbook
6. ❌ NEVER use phrases like "materiaalin mukaan", "tekstissä mainitaan", "materiaaliin viitaten"

CONTENT ANALYSIS FIRST:
Before generating questions, read the textbook carefully:
- What is the main historical event/period/concept?
- What is the central narrative or story?
- Who are the main people/groups involved?
- What happened (chronological events)?
- When did it happen (dates/periods)?
- Why did it happen (causes)?
- What were the results/consequences?

QUESTION DISTRIBUTION:
1. **Main Events** (40%): What happened? When? Key turning points?
2. **Causes & Results** (30%): Why did it happen? What were the consequences?
3. **Key People & Groups** (20%): Who was involved? What did they do?
4. **Important Terms** (10%): Only terms central to understanding the topic

⚠️ CRITICAL - ENFORCE QUESTION DISTRIBUTION:
Before finalizing your exam, COUNT each question type:
□ You MUST have at least 6 questions about main events, causes, or key people
□ You MUST NOT have more than 2-3 terminology questions (13-20% maximum)
□ If you have too many "What does X mean?" questions, REPLACE them with event/cause questions
□ Prioritize WHAT HAPPENED over definitions

⚠️ CRITICAL - CONTENT BALANCE (avoid timeline over-reliance):
□ Do NOT generate more than 3-4 questions from timeline pages alone
□ Prioritize questions from MAIN CHAPTER TEXT over timeline events
□ If you see multiple pages discussing a topic in detail, generate 2-3 questions about it
□ Do NOT ignore entire chapters in favor of timeline dates
□ Balance coverage across all major sections of the textbook

NATURAL QUESTION STYLE - Write questions directly:
✅ Ask "Who was involved?" not "Who was involved according to the text?"
✅ Ask "When did [event] happen?" not "When did [event] happen according to the material?"
✅ Ask "Why did [event] happen?" not "What does the text say about why [event] happened?"
✅ Ask "Who was [person]?" not "What does the material say about [person]?"
✅ Ask "What does [term] mean?" not "What does the text define [term] as?" (only if central concept)

❌ NEVER USE THESE PHRASES IN QUESTIONS:
❌ "according to the material", "the text states", "the material says"
❌ "referring to the material", "based on what you read"
❌ "as mentioned in the text", "as described in the material"

Write questions as if you're a teacher asking students directly - no references to the textbook.

FORBIDDEN:
❌ Generic vocabulary questions not tied to the topic
❌ Facts not in the textbook
❌ Visual references ("in the image", "on page X")
❌ Outside knowledge questions
❌ Academic or formal phrasing

FACTUAL ACCURACY REQUIREMENTS:
Before finalizing EACH question:
□ Verify dates are exactly right
□ Verify names are spelled correctly
□ Verify the fact is clearly in the textbook
□ If uncertain about ANY fact, SKIP that question
□ If the textbook doesn't clearly state something, DON'T ask about it

CRITICAL CONSTRAINT: Students will NOT have access to any visual elements during the exam

Generate exactly ${EXAM_QUESTION_COUNT} questions following this JSON format:

{
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
      "explanation": "[1-2 sentence explanation in SAME language as source material]"
    }
  ],
  "summary": {
    "introduction": "[100-250 word introduction to the SPECIFIC topic in the SAME language as source material]",
    "key_concepts": "[250-500 word explanation focusing on the MAIN NARRATIVE in the SAME language]",
    "examples_and_applications": "[200-400 word section on understanding this historical topic in the SAME language]",
    "summary_conclusion": "[100-250 word conclusion in the SAME language]",
    "total_word_count": [approximate word count],
    "language": "[ISO 639-1 code - e.g., 'fi' for Finnish, 'en' for English, 'sv' for Swedish]"
  }
}

SUMMARY REQUIREMENTS:
- Write in the SAME language as the source material
- Target audience: Grade ${grade} students
- Total length: ~1000 words
- Structure: 4 sections as specified in the JSON format
- Educational tone: clear, pedagogical, age-appropriate
- Focus on the SPECIFIC historical topic from the material (not generic history concepts)
- Use proper formatting: **bold** for key terms, numbered lists where appropriate

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

IMPORTANT:
- The correct_answer field must contain the exact text from the options array
- The summary must be in the SAME language as the questions and source material
- Do not reference visual elements in the summary either

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
  grade: number = 8
) {
  console.log(`\n🧪 Testing history prompt v2 with ${imageParts.length} images...`)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0, // Deterministic for accuracy
      responseMimeType: 'application/json'
    }
  })

  const prompt = getHistoryPrompt(grade)

  console.log('\n📋 Prompt improvements:')
  console.log('  - Exact copy of config.ts prompt')
  console.log('  - Added terminology enforcement (max 2-3 questions)')
  console.log('  - Must have 6+ event/cause/figure questions\n')

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
      writeFileSync('test-output-history-v2-raw.txt', text)
      console.log('Raw response saved to: test-output-history-v2-raw.txt')
      throw parseError
    }

    // Analyze question distribution
    console.log('\n📊 QUESTION ANALYSIS:')

    if (parsedResponse.questions) {
      const questions = parsedResponse.questions
      console.log(`\n📝 Generated ${questions.length} questions`)

      // Analyze question types based on content
      let mainEventCount = 0
      let causeConsequenceCount = 0
      let keyFigureCount = 0
      let terminologyCount = 0

      questions.forEach((q: any) => {
        const text = q.question.toLowerCase()
        if (text.includes('mitä tarkoittaa') || text.includes('what does') ||
            text.includes('what is') || text.includes('mitä oli')) {
          terminologyCount++
        } else if (text.includes('miksi') || text.includes('why')) {
          causeConsequenceCount++
        } else if (text.includes('kuka') || text.includes('ketkä') || text.includes('who')) {
          keyFigureCount++
        } else {
          mainEventCount++
        }
      })

      console.log('\n📈 Question Type Distribution:')
      console.log(`  Main Events: ${mainEventCount} (${((mainEventCount/15)*100).toFixed(0)}%) - Target: 6+ (40%)`)
      console.log(`  Causes/Consequences: ${causeConsequenceCount} (${((causeConsequenceCount/15)*100).toFixed(0)}%) - Target: 4-5 (30%)`)
      console.log(`  Key Figures: ${keyFigureCount} (${((keyFigureCount/15)*100).toFixed(0)}%) - Target: 3 (20%)`)
      console.log(`  Terminology: ${terminologyCount} (${((terminologyCount/15)*100).toFixed(0)}%) - Target: 2-3 (10-20%)`)

      const focusedQuestions = mainEventCount + causeConsequenceCount + keyFigureCount
      console.log(`\n  🎯 Focused questions (non-terminology): ${focusedQuestions}/15 (${((focusedQuestions/15)*100).toFixed(0)}%)`)

      if (terminologyCount <= 3) {
        console.log('  ✅ PASS: Terminology questions within limit (≤3)')
      } else {
        console.log(`  ⚠️  FAIL: Too many terminology questions (${terminologyCount} > 3)`)
      }

      if (focusedQuestions >= 9) {
        console.log('  ✅ PASS: ≥60% questions focus on events/causes/figures')
      } else {
        console.log(`  ⚠️  FAIL: <60% questions focus on content (${focusedQuestions}/15)`)
      }

      // Sample first 3 questions
      console.log('\n📋 Sample Questions:')
      questions.slice(0, 3).forEach((q: any, idx: number) => {
        console.log(`\n  ${idx + 1}. ${q.question}`)
      })
    }

    // Save output
    const output = {
      test_metadata: {
        timestamp: new Date().toISOString(),
        version: 'v2',
        model: 'gemini-2.0-flash-exp',
        temperature: 0,
        grade: grade,
        image_count: imageParts.length,
        duration_ms: duration,
        improvements: [
          'Exact copy of config.ts prompt structure',
          'Added terminology enforcement (max 2-3 questions)',
          'Must have 6+ event/cause/figure questions'
        ]
      },
      prompt_used: prompt,
      gemini_response: parsedResponse,
      usage_metadata: response.usageMetadata
    }

    const outputPath = 'test-output-history-v2.json'
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
  console.log('🏛️  HISTORY EXAM PROMPT TESTER V2')
  console.log('==================================\n')

  // Configuration
  const IMAGE_FOLDER = 'assets/images/history_8th_compr'
  const GRADE = 8

  console.log(`📚 Configuration:`)
  console.log(`  Grade: ${GRADE}`)
  console.log(`  Image folder: ${IMAGE_FOLDER}`)
  console.log(`  Model: gemini-2.0-flash-exp`)
  console.log(`  Temperature: 0 (deterministic)`)
  console.log(`  Prompt: Exact copy of config.ts + terminology limits\n`)

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
    console.log('  1. Review test-output-history-v2.json')
    console.log('  2. Check terminology question count (should be ≤3)')
    console.log('  3. Verify focused questions ≥9 (60%)')
    console.log('  4. If passing, update config.ts with this prompt\n')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
main()
