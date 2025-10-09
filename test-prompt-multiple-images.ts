/**
 * Test Gemini with multiple images from same textbook
 * Hypothesis: More content = better question diversity, fewer graph-dependent questions
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Configuration matching staging environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash-lite';
const TEMPERATURE = 0;

// Validate API key
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

// Prompt from config.ts getCategoryAwarePrompt
const EXAM_QUESTION_COUNT = 15;
const category = 'core_academics';
const grade = 8;

const prompt = `Create a text-based exam from educational content for grade ${grade} students.

CRITICAL CONSTRAINT: Students will NOT have access to any visual elements during the exam

Avoid:
- Visual references from the material, like images or page or chapter numbers
- References to graph, table, diagram, or coordinate systems
- Something that is factually untrue
- Something that is impossible to answer without the images
- Questions that aren't explicitly based on the source material

TARGET: Use the same language as the source material. Subject area: core academics.

TASK: Generate exactly ${EXAM_QUESTION_COUNT} questions that test understanding of the educational concepts in the material.

REQUIRED FORMAT:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "[Question text in same language as source material]",
      "options": ["[Option A]", "[Option B]", "[Option C]", "[Option D]"],
      "correct_answer": "[Exact match from options array]",
      "explanation": "[Brief explanation in same language]"
    }
  ]
}

IMPORTANT: The correct_answer field must contain the exact text from the options array.`;

async function testGeminiCallMultipleImages() {
  console.log('🔧 Initializing Gemini API...');
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: TEMPERATURE
    }
  });

  // Load all 7 physics images
  const imagePaths = [
    '/Users/joakimachren/Desktop/gemini-ocr/assets/images/physics/kpl11a compr.jpeg',
    '/Users/joakimachren/Desktop/gemini-ocr/assets/images/physics/kpl12a compr.jpeg',
    '/Users/joakimachren/Desktop/gemini-ocr/assets/images/physics/kpl13a compr.jpeg',
    '/Users/joakimachren/Desktop/gemini-ocr/assets/images/physics/kpl13b compr.jpeg',
    '/Users/joakimachren/Desktop/gemini-ocr/assets/images/physics/kpl14 compr.jpeg',
    '/Users/joakimachren/Desktop/gemini-ocr/assets/images/physics/kpl15a compr.jpeg',
    '/Users/joakimachren/Desktop/gemini-ocr/assets/images/physics/kpl15b compr.jpeg',
  ];

  console.log(`📸 Loading ${imagePaths.length} images...`);

  const imageParts = imagePaths.map(imagePath => {
    console.log(`   - ${path.basename(imagePath)}`);
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');

    return {
      inlineData: {
        data: imageBase64,
        mimeType: 'image/jpeg'
      }
    };
  });

  console.log('\n📝 Prompt:');
  console.log('─'.repeat(80));
  console.log(prompt);
  console.log('─'.repeat(80));

  console.log(`\n⏳ Calling Gemini API with ${imagePaths.length} images...`);
  const startTime = Date.now();

  try {
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = result.response;
    const text = response.text();

    const duration = Date.now() - startTime;

    console.log(`\n✅ Response received in ${duration}ms`);
    console.log('\n📄 Raw Response:');
    console.log('─'.repeat(80));
    console.log(text);
    console.log('─'.repeat(80));

    // Try to parse as JSON
    try {
      // Remove markdown code blocks if present
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanedText);

      console.log('\n✅ Valid JSON response');
      console.log(`📊 Question count: ${parsed.questions?.length || 0}`);

      if (parsed.questions) {
        // Count graph-related questions
        const graphKeywords = ['kuvaaja', 'koordinaatisto', 'taulukko', 'kaavio', 'akseli'];
        let graphQuestions = 0;

        console.log('\n📋 Generated Questions:');
        parsed.questions.forEach((q: any, idx: number) => {
          const hasGraphRef = graphKeywords.some(keyword =>
            q.question.toLowerCase().includes(keyword.toLowerCase())
          );

          if (hasGraphRef) {
            graphQuestions++;
            console.log(`\n${idx + 1}. ${q.question} ⚠️ [GRAPH REFERENCE]`);
          } else {
            console.log(`\n${idx + 1}. ${q.question}`);
          }

          console.log(`   Type: ${q.type}`);
          if (q.options) {
            q.options.forEach((opt: string, i: number) => {
              const letter = String.fromCharCode(65 + i);
              const isCorrect = opt === q.correct_answer ? ' ✓' : '';
              console.log(`   ${letter}) ${opt}${isCorrect}`);
            });
          }
        });

        console.log(`\n📊 Analysis:`);
        console.log(`   Total questions: ${parsed.questions.length}`);
        console.log(`   Graph-dependent: ${graphQuestions} (${Math.round(graphQuestions / parsed.questions.length * 100)}%)`);
        console.log(`   Content-based: ${parsed.questions.length - graphQuestions} (${Math.round((parsed.questions.length - graphQuestions) / parsed.questions.length * 100)}%)`);
      }

      // Save to file
      const outputPath = path.join(__dirname, 'test-output-multiple-images.json');
      fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2));
      console.log(`\n💾 Full response saved to: ${outputPath}`);

    } catch (parseError) {
      console.error('\n❌ Failed to parse JSON:', parseError);
      console.log('Raw text:', text);
    }

  } catch (error) {
    console.error('\n❌ Gemini API Error:', error);
    throw error;
  }
}

// Run the test
testGeminiCallMultipleImages().catch(console.error);
