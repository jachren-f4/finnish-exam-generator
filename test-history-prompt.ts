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
function getHistoryPrompt(grade: number = 5): string {
  return `You are creating a history exam for grade ${grade} students based on educational material.

🎯 PRIMARY OBJECTIVE: Test understanding of the SPECIFIC historical content shown in the material.

⚠️ CRITICAL LANGUAGE REQUIREMENT:
- Use the SAME language as the source material
- Auto-detect the language from the textbook images
- ALL questions, options, explanations, and summary MUST be in the detected language
- Do NOT default to English if material is in another language (Finnish, Swedish, German, etc.)

CRITICAL RULES:
1. ✅ Questions MUST focus on the MAIN TOPICS and EVENTS described in the material
2. ✅ Questions MUST test comprehension of the SPECIFIC narrative/story presented
3. ✅ Questions MUST be factually accurate (verify dates, names, events)
4. ❌ AVOID generic vocabulary/definition questions unless the term is central to understanding the topic
5. ❌ NEVER include facts not present in the source material
6. ❌ NEVER make assumptions about content not shown

CONTENT ANALYSIS PROCESS:
Before generating questions, analyze the material:

Step 1: IDENTIFY THE MAIN TOPIC
- What historical event/period/concept is this about?
- What is the central narrative or story?

Step 2: EXTRACT KEY FACTS
- Who are the main people/groups involved?
- What happened (chronological events)?
- When did it happen (dates/periods)?
- Where did it happen (locations)?
- Why did it happen (causes)?
- What were the results/consequences?

Step 3: IDENTIFY SUPPORTING CONCEPTS
- What terms/vocabulary are explained?
- What context is provided?
- What perspectives are presented?

QUESTION PRIORITY (focus on these in order):
1. **Main Events** (40%): What happened? Chronology, key turning points
2. **Causes & Consequences** (30%): Why did it happen? What resulted?
3. **Key Figures & Groups** (20%): Who was involved? What roles did they play?
4. **Context & Terms** (10%): Supporting vocabulary ONLY if central to understanding

FORBIDDEN QUESTION TYPES:
❌ Generic definitions not tied to the specific topic (e.g., "What is democracy?")
❌ Questions about concepts mentioned only briefly
❌ Historical facts NOT present in the material
❌ "Which of these is true?" questions without clear focus
❌ Questions requiring outside knowledge beyond the material

GOOD QUESTION EXAMPLES:
✅ "What were the main causes of [the event] according to the material?"
✅ "Which groups/people were involved in [the event]?"
✅ "When did [the event] take place?"
✅ "What was the outcome of [the event]?"
✅ "Why did [cause] lead to [consequence]?"
✅ "How did [person/group] contribute to [event]?"

BAD QUESTION EXAMPLES:
❌ "What does 'democracy' mean?" (too generic unless central to the narrative)
❌ "What is a political system?" (generic definition)
❌ "What is international cooperation?" (not about the main topic)
❌ "What is the capital of [country]?" (random fact, not from material)

FACTUAL ACCURACY REQUIREMENTS:
Before finalizing EACH question:
□ Verify dates are correct
□ Verify names are spelled correctly
□ Verify cause-effect relationships are accurate
□ Verify the fact appears in the source material
□ If uncertain about ANY fact, SKIP that question
□ If material doesn't clearly state something, DON'T ask about it

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
4. Common patterns to help detect:
   - Finnish: "Suomen sisällissota", "vuonna", "punaisten", "valkoisten"
   - Swedish: "finska inbördeskriget", "år", "röda", "vita"
   - English: "civil war", "year", "reds", "whites"
   - German: "Bürgerkrieg", "Jahr", "Roten", "Weißen"

QUALITY CHECKLIST (verify before finalizing):
□ At least 60% of questions focus on main events, causes, or key figures
□ Generic definition questions are < 20% of total
□ All facts are present in the source material
□ All dates, names, events verified for accuracy
□ Questions follow logical progression through the topic
□ No references to images, pages, or visual elements
□ Summary focuses on the specific topic (not generic history concepts)
□ ALL questions are in the SAME language as the source material
□ ALL options are in the SAME language as the source material
□ ALL explanations are in the SAME language as the source material
□ Summary sections are in the SAME language as the source material

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
  const IMAGE_FOLDER = 'assets/images/history-test'
  const GRADE = 5

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
