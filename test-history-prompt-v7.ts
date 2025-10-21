/**
 * Test Script for V7 History Prompt (Hybrid Summarized Grounding)
 *
 * V7 fixes V6 token overflow by:
 * - Internal fact extraction (no bullet point output)
 * - Token limit guard (under 4000 tokens)
 * - Maintains grounding benefits without verbosity
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY not found in .env.local')
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

/**
 * V7 HYBRID PROMPT - Internal extraction, no verbose output
 */
function getHybridHistoryPrompt(grade: number = 8): string {
  return `SYSTEM INSTRUCTION (prepend this before any user content):
You must treat the uploaded textbook images as your *only factual source*.
Do not rely on your general history knowledge. Use only information visible in the textbook pages.
If something is not visible, skip it.

Keep total output under 4000 tokens. Use concise sentences and limit explanations to 1–2 lines.

---

## 🎓 Task
Create a **history exam for grade ${grade} students** based *only* on the uploaded textbook pages.

---

## 🔍 INTERNAL FACT EXTRACTION (do NOT print)
First, silently read all textbook images and extract:
- main events with dates
- people or groups mentioned
- historical terms defined
- visible causes and consequences

Do NOT list or print these facts. Keep them in memory only.

---

## ✍️ QUESTION GENERATION
Now, using only the information you extracted internally, generate:

- 2 terminology questions ("What does X mean?")
- 6 event questions ("What happened / when / where?")
- 4 cause–consequence questions ("Why / what resulted?")
- 3 people questions ("Who / what did they do?")
→ Total = 15 questions

Every question must be answerable directly from the textbook pages.
If a fact, date, or person is not visible, skip it.

---

## 🎯 ADDITIONAL RULES

### Language
- Auto-detect textbook language and use it everywhere.
- No translation, no mixing.

### Style
- Write like a teacher talking to students.
- Never mention "the text", "material", or "chapter".
- Use natural, clear sentences.

### Terminology Rule
- Only ask meanings of *specialized historical terms* (e.g. hyperinflaatio, sisällissota).
- Never ask about common words (itsenäisyys, demokratia, sota, rauha).

### Validation
- Exactly 2 terminology questions.
- No generic vocabulary or invented names.
- All 15 questions grounded, clear, and answerable from the textbook pages.

### Language-Aware Grounding Rule (CRITICAL)
BEFORE creating each question, detect the textbook language:
- **If German**: ONLY use facts from visible INFO boxes, captions, timeline dates, or explicit definitions. Never use general historical knowledge.
- **If Finnish/Swedish/English**: Use all visible text content from pages.
- **Common rule**: If a date, name, or event is NOT explicitly written in the textbook, skip it entirely.

Examples of what NOT to do:
- ❌ "Wann wurde das Deutsche Reich gegründet? 1871" (if 1871 not visible in text)
- ❌ Questions about countries/people never mentioned in the pages
- ✅ Only use dates from timelines, INFO boxes, or body text

### Self-Check Compression
Before finalizing, if output approaches length limit, shorten explanations but keep correctness.

---

## 🧩 JSON OUTPUT

{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "[Natural question in source language]",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "[Exact match from options]",
      "explanation": "[1–2 sentences, factual and concise]"
    }
  ],
  "summary": {
    "introduction": "[100–200 words – introduce the historical topic from the text]",
    "key_concepts": "[250–400 words – main events, causes, results]",
    "examples_and_applications": "[150–250 words – help students understand significance]",
    "summary_conclusion": "[80–150 words – wrap up clearly]",
    "total_word_count": [number],
    "language": "[ISO 639-1 code]"
  }
}

---

## ⚠️ FINAL CHECKLIST
✅ 15 total questions
✅ 2 terminology exactly
✅ No "material/text" references
✅ No invented facts or external info
✅ All questions from visible textbook content
✅ Natural, student-friendly phrasing
✅ Output under 4000 tokens`
}

function loadTestImages(folderPath: string): Array<{ inlineData: { data: string; mimeType: string } }> {
  const imageParts: Array<{ inlineData: { data: string; mimeType: string } }> = []

  try {
    const files = readdirSync(folderPath)
    const imageFiles = files.filter(f => f.match(/\.(jpg|jpeg|png|webp|heic)$/i))

    console.log(`📁 Found ${imageFiles.length} images in ${folderPath}`)

    for (const file of imageFiles) {
      const filePath = join(folderPath, file)
      const imageBuffer = readFileSync(filePath)
      const base64 = imageBuffer.toString('base64')

      const ext = file.toLowerCase()
      let mimeType = 'image/jpeg'
      if (ext.endsWith('.png')) mimeType = 'image/png'
      else if (ext.endsWith('.webp')) mimeType = 'image/webp'
      else if (ext.endsWith('.heic')) mimeType = 'image/heic'

      imageParts.push({ inlineData: { data: base64, mimeType } })
      console.log(`  ✓ Loaded: ${file}`)
    }

    return imageParts
  } catch (error) {
    console.error(`❌ Error loading images:`, error)
    throw error
  }
}

async function generateHybridHistoryExam(imageParts: Array<{ inlineData: { data: string; mimeType: string } }>) {
  console.log(`\n🧪 Testing V7 Hybrid Summarized Grounding with ${imageParts.length} images...\n`)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      maxOutputTokens: 4000  // Token limit guard
    }
  })

  const prompt = getHybridHistoryPrompt(8)
  const startTime = Date.now()

  try {
    const result = await model.generateContent([prompt, ...imageParts])
    const duration = Date.now() - startTime
    const response = result.response
    const text = response.text()

    console.log(`✅ Generation completed in ${(duration / 1000).toFixed(2)}s\n`)

    let parsedResponse
    try {
      parsedResponse = JSON.parse(text)
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response')
      writeFileSync('test-output-history-v7-raw.txt', text)
      throw parseError
    }

    // Analyze
    if (parsedResponse.questions) {
      const questions = parsedResponse.questions
      console.log(`📝 Generated ${questions.length} questions\n`)

      let terminology = 0, events = 0, causes = 0, people = 0
      const terminologyQuestions: string[] = []

      questions.forEach((q: any) => {
        const text = q.question.toLowerCase()
        if (text.includes('mitä tarkoittaa') || text.includes('mitä tarkoitti') ||
            text.includes('what does') || text.includes('what is')) {
          terminology++
          terminologyQuestions.push(q.question)
        } else if (text.includes('miksi') || text.includes('why') ||
                   text.includes('seurauksi') || text.includes('consequence')) {
          causes++
        } else if (text.includes('kuka') || text.includes('ketkä') || text.includes('who')) {
          people++
        } else {
          events++
        }
      })

      console.log('📈 Question Distribution:')
      console.log(`  Terminology: ${terminology} (target: EXACTLY 2)`)
      console.log(`  Events: ${events} (target: 6)`)
      console.log(`  Causes/Results: ${causes} (target: 4)`)
      console.log(`  People: ${people} (target: 3)`)
      console.log(`  Total: ${questions.length}/15\n`)

      if (terminology === 2) {
        console.log('  ✅ PERFECT: Exactly 2 terminology questions!')
      } else {
        console.log(`  ⚠️  Got ${terminology} terminology questions (target: 2)`)
      }

      if (terminologyQuestions.length > 0) {
        console.log('\n📚 Terminology Questions:')
        terminologyQuestions.forEach((q, idx) => console.log(`  ${idx + 1}. ${q}`))
      }

      console.log('\n📋 All Questions:')
      questions.forEach((q: any, idx: number) => {
        console.log(`  ${idx + 1}. ${q.question}`)
      })
    }

    const output = {
      test_metadata: {
        timestamp: new Date().toISOString(),
        version: 'v7-hybrid-summarized-grounding',
        prompt_source: 'V7 - Internal Extraction + Token Guard',
        model: 'gemini-2.0-flash-exp',
        temperature: 0,
        maxOutputTokens: 4000,
        duration_ms: duration
      },
      prompt_used: prompt,
      gemini_response: parsedResponse
    }

    writeFileSync('test-output-history-v7.json', JSON.stringify(output, null, 2))
    console.log(`\n💾 Saved to: test-output-history-v7.json\n`)

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

async function main() {
  console.log('🏛️  V7 HISTORY PROMPT TESTER (Hybrid Summarized Grounding)')
  console.log('===========================================================\n')

  try {
    const imageParts = loadTestImages('assets/images/history_8th_compr')
    await generateHybridHistoryExam(imageParts)
    console.log('✅ Test completed!\n')
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

main()
