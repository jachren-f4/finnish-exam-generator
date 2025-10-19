/**
 * Test Script for History Exam Generation v3 - CLEAN SLATE
 *
 * Starting fresh with a simpler, more direct prompt
 * Focus: Front-load critical rules, remove redundancy
 *
 * Usage:
 * 1. Place your test images in: assets/images/history_8th_compr/
 * 2. Run: npx tsx test-history-prompt-v3.ts
 * 3. Review output in: test-output-history-v3.json
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
 * CLEAN SLATE HISTORY PROMPT v3
 * Principles: Simple, direct, front-loaded critical rules
 */
function getHistoryPrompt(grade: number = 8): string {
  const EXAM_QUESTION_COUNT = 15

  return `You are creating a history exam for grade ${grade} students.

🎯 CRITICAL RULES - READ FIRST:

1️⃣ QUESTION TYPES - Generate EXACTLY:
   - 2 terminology questions ("What does X mean?") - NO MORE, NO LESS
   - 6+ event questions ("What happened? When? Where?")
   - 4+ cause/consequence questions ("Why? What were the results?")
   - 2+ people questions ("Who? What did they do?")

2️⃣ NATURAL STYLE - Write like a teacher talking to students:
   ✅ "When did Finland become independent?"
   ❌ "When did Finland become independent according to the material?"

   NEVER use: "materiaalin mukaan", "tekstissä mainitaan", "materiaaliin viitaten"

3️⃣ TERMINOLOGY RULES:
   - ONLY ask "What does X mean?" for historical terms (hyperinflation, civil war, prohibition)
   - NEVER ask about common words (independence, democracy, war, peace)
   - If you wrote 3+ terminology questions, DELETE the generic ones

4️⃣ CONTENT FOCUS:
   - Read the FULL textbook, not just timeline pages
   - Ask about events in main chapters, not only dates
   - Balance questions across all major topics
   - TIMELINE RULE: If using a timeline date, ask about the EVENT shown for that date (not other events)

5️⃣ LANGUAGE:
   - Auto-detect language from textbook images
   - Write ALL content in the same language as the textbook

---

📚 CONTENT ANALYSIS:

Before writing questions, identify:
- Main historical event/period (the chapter topic)
- Key people and groups involved
- What happened (chronological events)
- Why it happened (causes)
- What resulted (consequences)
- Important specialized terms (2-3 maximum)

---

✍️ QUESTION WRITING GUIDELINES:

GOOD QUESTIONS:
✅ "What happened in Finland in 1918?" (event)
✅ "Why did the civil war start?" (cause)
✅ "Who were the opposing sides?" (people)
✅ "What does 'hyperinflation' mean?" (specialized term)

BAD QUESTIONS:
❌ "What does 'independence' mean?" (common word)
❌ "What does the text say about X?" (refers to material)
❌ "According to the material, when...?" (awkward phrase)
❌ "What is democracy?" (too generic)

---

🔍 BEFORE FINALIZING:

Count your questions:
- Terminology ("What does X mean?"): Should be EXACTLY 2
- Event/Cause/People: Should be 13+
- Generic vocabulary: Should be ZERO

If you have 3+ terminology questions → DELETE the most generic ones
If you have 0-1 terminology questions → ADD one specialized term

---

📋 OUTPUT FORMAT:

Generate exactly ${EXAM_QUESTION_COUNT} questions in this JSON format:

{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "[Natural question in source language]",
      "options": [
        "[Option A in source language]",
        "[Option B in source language]",
        "[Option C in source language]",
        "[Option D in source language]"
      ],
      "correct_answer": "[Exact match from options]",
      "explanation": "[1-2 sentences in source language]"
    }
  ],
  "summary": {
    "introduction": "[100-250 words introducing the specific historical topic]",
    "key_concepts": "[250-500 words explaining the main narrative]",
    "examples_and_applications": "[200-400 words on understanding this topic]",
    "summary_conclusion": "[100-250 words conclusion]",
    "total_word_count": [number],
    "language": "[ISO 639-1 code: fi, en, sv, de, etc.]"
  }
}

---

⚠️ FINAL REMINDERS:

- EXACTLY 2 terminology questions (not 3, not 5, not 8)
- NO references to "the material" or "the text"
- NO generic vocabulary questions
- Focus on main chapters, not just timelines
- Natural, conversational style
- All content in the same language as textbook

Begin generating the exam now.`
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
 * Generate history exam with V3 prompt
 */
async function generateHistoryExam(
  imageParts: Array<{ inlineData: { data: string; mimeType: string } }>,
  grade: number = 8
) {
  console.log(`\n🧪 Testing history prompt v3 (CLEAN SLATE) with ${imageParts.length} images...`)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json'
    }
  })

  const prompt = getHistoryPrompt(grade)

  console.log('\n📋 V3 Improvements:')
  console.log('  - Clean slate: simplified structure')
  console.log('  - Front-loaded critical rules')
  console.log('  - EXACTLY 2 terminology questions (not "2-3")')
  console.log('  - Removed checkbox overload')
  console.log('  - Direct commands, fewer nested rules\n')

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
      writeFileSync('test-output-history-v3-raw.txt', text)
      console.log('Raw response saved to: test-output-history-v3-raw.txt')
      throw parseError
    }

    // Analyze question distribution
    console.log('\n📊 QUESTION ANALYSIS:')

    if (parsedResponse.questions) {
      const questions = parsedResponse.questions
      console.log(`\n📝 Generated ${questions.length} questions`)

      // Analyze question types
      let mainEventCount = 0
      let causeConsequenceCount = 0
      let keyFigureCount = 0
      let terminologyCount = 0

      const terminologyQuestions: string[] = []

      questions.forEach((q: any) => {
        const text = q.question.toLowerCase()
        if (text.includes('mitä tarkoittaa') || text.includes('mitä tarkoitti') ||
            text.includes('what does') || text.includes('what is') ||
            text.includes('mitä oli') || text.includes('mikä oli')) {
          terminologyCount++
          terminologyQuestions.push(q.question)
        } else if (text.includes('miksi') || text.includes('why') ||
                   text.includes('seurauksi') || text.includes('consequence')) {
          causeConsequenceCount++
        } else if (text.includes('kuka') || text.includes('ketkä') || text.includes('who')) {
          keyFigureCount++
        } else {
          mainEventCount++
        }
      })

      console.log('\n📈 Question Type Distribution:')
      console.log(`  Main Events: ${mainEventCount} (${((mainEventCount/15)*100).toFixed(0)}%) - Target: 6+ (40%)`)
      console.log(`  Causes/Consequences: ${causeConsequenceCount} (${((causeConsequenceCount/15)*100).toFixed(0)}%) - Target: 4+ (27%)`)
      console.log(`  Key Figures: ${keyFigureCount} (${((keyFigureCount/15)*100).toFixed(0)}%) - Target: 2+ (13%)`)
      console.log(`  Terminology: ${terminologyCount} (${((terminologyCount/15)*100).toFixed(0)}%) - Target: EXACTLY 2 (13%)`)

      const focusedQuestions = mainEventCount + causeConsequenceCount + keyFigureCount
      console.log(`\n  🎯 Focused questions (non-terminology): ${focusedQuestions}/15 (${((focusedQuestions/15)*100).toFixed(0)}%)`)

      if (terminologyCount === 2) {
        console.log('  ✅ PERFECT: Exactly 2 terminology questions!')
      } else if (terminologyCount <= 3) {
        console.log(`  ⚠️  CLOSE: ${terminologyCount} terminology questions (target: 2)`)
      } else {
        console.log(`  ❌ FAIL: Too many terminology questions (${terminologyCount} > 2)`)
      }

      if (focusedQuestions >= 9) {
        console.log('  ✅ PASS: ≥60% questions focus on events/causes/figures')
      } else {
        console.log(`  ⚠️  FAIL: <60% questions focus on content (${focusedQuestions}/15)`)
      }

      // Show terminology questions
      if (terminologyQuestions.length > 0) {
        console.log('\n📚 Terminology Questions Generated:')
        terminologyQuestions.forEach((q, idx) => {
          console.log(`  ${idx + 1}. ${q}`)
        })
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
        version: 'v3-clean-slate',
        model: 'gemini-2.0-flash-exp',
        temperature: 0,
        grade: grade,
        image_count: imageParts.length,
        duration_ms: duration,
        improvements: [
          'Clean slate: simplified prompt structure',
          'Front-loaded critical rules (EXACTLY 2 terminology)',
          'Removed checkbox overload',
          'Direct commands instead of nested rules',
          'Under 100 lines total'
        ]
      },
      prompt_used: prompt,
      gemini_response: parsedResponse,
      usage_metadata: response.usageMetadata
    }

    const outputPath = 'test-output-history-v3.json'
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
  console.log('🏛️  HISTORY EXAM PROMPT TESTER V3 - CLEAN SLATE')
  console.log('==============================================\n')

  // Configuration
  const IMAGE_FOLDER = 'assets/images/history_8th_compr'
  const GRADE = 8

  console.log(`📚 Configuration:`)
  console.log(`  Grade: ${GRADE}`)
  console.log(`  Image folder: ${IMAGE_FOLDER}`)
  console.log(`  Model: gemini-2.0-flash-exp`)
  console.log(`  Temperature: 0 (deterministic)`)
  console.log(`  Prompt: V3 Clean Slate (simplified, direct)\n`)

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
    console.log('  1. Review test-output-history-v3.json')
    console.log('  2. Check if terminology count is EXACTLY 2')
    console.log('  3. Verify focused questions ≥13 (87%)')
    console.log('  4. If passing, update config.ts with V3 prompt\n')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
main()
