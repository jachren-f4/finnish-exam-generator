/**
 * Test Summary Generation with Exam Questions
 * Tests Gemini's ability to generate both exam questions AND educational summary in one call
 *
 * Expected Output: ~970 words total across 4 structured sections
 * Note: Gemini 2.5 Flash-Lite optimizes for concise responses (~1000 words)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Configuration matching production environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash-lite';
const TEMPERATURE = 0;

// Validate API key
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

// Test configuration
const EXAM_QUESTION_COUNT = 15;
const EXPECTED_SUMMARY_WORDS = 970; // Actual output from Gemini 2.5 Flash-Lite
const SUMMARY_WORD_TOLERANCE = 200; // Allow ±200 words variation
const category = 'core_academics';
const grade = 8;

// Expected word counts per section (based on observed behavior)
const EXPECTED_SECTIONS = {
  introduction: { min: 100, max: 250 },
  key_concepts: { min: 250, max: 500 },
  examples_and_applications: { min: 200, max: 400 },
  summary_conclusion: { min: 100, max: 250 }
};

// Combined prompt: Questions + Summary
// Based on getCategoryAwarePrompt from config.ts, extended with summary generation
const prompt = `Create a text-based exam from educational content for grade ${grade} students.

CRITICAL CONSTRAINT: Students will NOT have access to any visual elements during the exam

Avoid:
- Visual references from the material, like images or page or chapter numbers
- References to graph, table, diagram, or coordinate systems
- Something that is factually untrue
- Something that is impossible to answer without the images
- Questions that aren't explicitly based on the source material

TARGET: Use the same language as the source material. Subject area: ${category}.

TASK 1: Generate exactly ${EXAM_QUESTION_COUNT} questions that test understanding of the educational concepts in the material.

TASK 2: CRITICAL - Generate a comprehensive educational summary divided into structured sections:

Required sections (each in same language as source material):
1. **introduction** (300-400 words): Overview of the topic and why it's important
2. **key_concepts** (800-1000 words): Detailed explanation of main concepts with definitions
3. **examples_and_applications** (600-800 words): Practical examples and real-world applications
4. **summary_conclusion** (300-400 words): Review of key points and takeaways

Total target: Approximately 1000 words across all sections combined.

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
  ],
  "summary": {
    "introduction": "[300-400 word introduction]",
    "key_concepts": "[800-1000 word detailed explanation]",
    "examples_and_applications": "[600-800 word practical examples]",
    "summary_conclusion": "[300-400 word review]",
    "total_word_count": [actual total word count across all sections],
    "language": "[detected language code, e.g. 'fi', 'en', 'sv']"
  }
}

IMPORTANT:
- The correct_answer field must contain the exact text from the options array
- Each summary section should provide comprehensive coverage
- Aim for approximately 1000 words total across all sections
- Include the total_word_count field with the actual combined count
- Include the language field (e.g., 'fi', 'en', 'sv')
- Use the SAME language for questions, explanations, and all summary sections`;

async function countWords(text: string): Promise<number> {
  // Simple word count (split by whitespace)
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

async function validateResponse(parsed: any): Promise<{
  valid: boolean;
  issues: string[];
  stats: {
    questionCount: number;
    summaryWordCount: number;
    summaryLength: number;
    hasAllFields: boolean;
  }
}> {
  const issues: string[] = [];
  let valid = true;

  // Validate questions array
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    issues.push('❌ Missing or invalid questions array');
    valid = false;
  } else if (parsed.questions.length !== EXAM_QUESTION_COUNT) {
    issues.push(`⚠️  Expected ${EXAM_QUESTION_COUNT} questions, got ${parsed.questions.length}`);
    valid = false;
  }

  // Validate summary object (structured format)
  if (!parsed.summary) {
    issues.push('❌ Missing summary object');
    valid = false;
  } else {
    const sections = ['introduction', 'key_concepts', 'examples_and_applications', 'summary_conclusion'];
    const sectionWordCounts: Record<string, number> = {};
    let totalActualWords = 0;

    // Check each section
    for (const section of sections) {
      if (!parsed.summary[section]) {
        issues.push(`❌ Missing summary.${section}`);
        valid = false;
      } else {
        const wordCount = await countWords(parsed.summary[section]);
        sectionWordCounts[section] = wordCount;
        totalActualWords += wordCount;
      }
    }

    // Report section word counts with validation
    issues.push(`\n📊 Section Word Counts:`);

    for (const section of sections) {
      const count = sectionWordCounts[section] || 0;
      const expected = EXPECTED_SECTIONS[section as keyof typeof EXPECTED_SECTIONS];
      const status = (count >= expected.min && count <= expected.max) ? '✅' : '⚠️';
      issues.push(`   ${status} ${section.replace(/_/g, ' ')}: ${count} words (expected: ${expected.min}-${expected.max})`);
    }

    // Validate total word count (allow tolerance range)
    const minTotal = EXPECTED_SUMMARY_WORDS - SUMMARY_WORD_TOLERANCE;
    const maxTotal = EXPECTED_SUMMARY_WORDS + SUMMARY_WORD_TOLERANCE;

    if (totalActualWords < minTotal) {
      issues.push(`⚠️  Total summary too short: ${totalActualWords} words (expected: ${minTotal}-${maxTotal})`);
      valid = false;
    } else if (totalActualWords > maxTotal) {
      issues.push(`⚠️  Total summary too long: ${totalActualWords} words (expected: ${minTotal}-${maxTotal})`);
      valid = false;
    } else {
      issues.push(`✅ Total word count: ${totalActualWords} words (within expected range of ${minTotal}-${maxTotal})`);
    }

    // Check if reported word count matches actual
    if (parsed.summary.total_word_count && Math.abs(parsed.summary.total_word_count - totalActualWords) > 100) {
      issues.push(`⚠️  Reported word count (${parsed.summary.total_word_count}) differs from actual (${totalActualWords})`);
    }

    if (!parsed.summary.language) {
      issues.push('⚠️  Missing summary.language field');
    }
  }

  // Calculate total summary word count from all sections
  let totalSummaryWords = 0;
  let totalSummaryLength = 0;
  const sections = ['introduction', 'key_concepts', 'examples_and_applications', 'summary_conclusion'];

  if (parsed.summary) {
    for (const section of sections) {
      if (parsed.summary[section]) {
        totalSummaryWords += await countWords(parsed.summary[section]);
        totalSummaryLength += parsed.summary[section].length;
      }
    }
  }

  const stats = {
    questionCount: parsed.questions?.length || 0,
    summaryWordCount: totalSummaryWords,
    summaryLength: totalSummaryLength,
    hasAllFields: !!(parsed.questions && parsed.summary &&
                     parsed.summary.introduction &&
                     parsed.summary.key_concepts &&
                     parsed.summary.examples_and_applications &&
                     parsed.summary.summary_conclusion)
  };

  return { valid, issues, stats };
}

async function testSummaryGeneration() {
  console.log('🔧 Initializing Gemini API...');
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: TEMPERATURE
    }
  });

  // Load test images (using physics images from assets)
  const imagesDir = path.join(__dirname, 'assets/images/physics');
  const imageFiles = [
    'kpl11a compr.jpeg',
    'kpl12a compr.jpeg',
    'kpl13a compr.jpeg'
  ];

  const imagePaths = imageFiles.map(file => path.join(imagesDir, file));

  console.log(`📸 Loading ${imagePaths.length} test images:`);

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

  console.log('\n📝 Prompt Configuration:');
  console.log(`   Category: ${category}`);
  console.log(`   Grade: ${grade}`);
  console.log(`   Questions: ${EXAM_QUESTION_COUNT}`);
  console.log(`   Expected summary length: ~${EXPECTED_SUMMARY_WORDS} words (±${SUMMARY_WORD_TOLERANCE})`);
  console.log(`   Prompt size: ${prompt.length} characters`);

  console.log('\n⏳ Calling Gemini API...');
  const startTime = Date.now();

  try {
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = result.response;
    const text = response.text();

    const duration = Date.now() - startTime;

    console.log(`\n✅ Response received in ${duration}ms (${(duration / 1000).toFixed(1)}s)`);

    // Get usage metadata for cost calculation
    const usageMetadata = response.usageMetadata;
    if (usageMetadata) {
      const inputTokens = usageMetadata.promptTokenCount || 0;
      const outputTokens = usageMetadata.candidatesTokenCount || 0;
      const totalTokens = usageMetadata.totalTokenCount || 0;

      // Gemini 2.5 Flash-Lite pricing (2025)
      const inputCost = (inputTokens / 1_000_000) * 0.10;
      const outputCost = (outputTokens / 1_000_000) * 0.40;
      const totalCost = inputCost + outputCost;

      console.log('\n💰 Cost Analysis:');
      console.log(`   Input tokens: ${inputTokens.toLocaleString()}`);
      console.log(`   Output tokens: ${outputTokens.toLocaleString()}`);
      console.log(`   Total tokens: ${totalTokens.toLocaleString()}`);
      console.log(`   Estimated cost: $${totalCost.toFixed(6)}`);
    }

    // Try to parse as JSON
    console.log('\n📊 Parsing response...');
    try {
      // Remove markdown code blocks if present
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanedText);

      console.log('✅ Valid JSON response');

      // Validate response structure
      const validation = await validateResponse(parsed);

      console.log('\n📋 Validation Results:');
      validation.issues.forEach(issue => console.log(`   ${issue}`));

      console.log('\n📊 Statistics:');
      console.log(`   Questions: ${validation.stats.questionCount}`);
      console.log(`   Summary words: ${validation.stats.summaryWordCount}`);
      console.log(`   Summary characters: ${validation.stats.summaryLength}`);
      console.log(`   All fields present: ${validation.stats.hasAllFields ? '✅' : '❌'}`);
      console.log(`   Overall validation: ${validation.valid ? '✅ PASSED' : '❌ FAILED'}`);

      // Show sample question
      if (parsed.questions && parsed.questions.length > 0) {
        const sampleQ = parsed.questions[0];
        console.log('\n📝 Sample Question:');
        console.log(`   ${sampleQ.question}`);
        if (sampleQ.options) {
          sampleQ.options.forEach((opt: string, i: number) => {
            const letter = String.fromCharCode(65 + i);
            const isCorrect = opt === sampleQ.correct_answer ? ' ✓' : '';
            console.log(`   ${letter}) ${opt}${isCorrect}`);
          });
        }
      }

      // Show summary previews
      if (parsed.summary) {
        console.log('\n📄 Summary Previews:');

        if (parsed.summary.introduction) {
          const preview = parsed.summary.introduction.substring(0, 200);
          console.log(`\n   Introduction (first 200 chars):`);
          console.log(`   ${preview}...`);
        }

        if (parsed.summary.key_concepts) {
          const preview = parsed.summary.key_concepts.substring(0, 200);
          console.log(`\n   Key Concepts (first 200 chars):`);
          console.log(`   ${preview}...`);
        }

        console.log(`\n   Language: ${parsed.summary.language || 'not specified'}`);
      }

      // Save full results to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputPath = path.join(__dirname, 'prompttests', `test-summary-${timestamp}.json`);

      // Ensure directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, JSON.stringify({
        test_config: {
          category,
          grade,
          question_count: EXAM_QUESTION_COUNT,
          expected_summary_words: EXPECTED_SUMMARY_WORDS,
          summary_word_tolerance: SUMMARY_WORD_TOLERANCE,
          prompt_size: prompt.length,
          image_count: imagePaths.length,
          model: MODEL_NAME,
          temperature: TEMPERATURE
        },
        performance: {
          duration_ms: duration,
          usage_metadata: usageMetadata
        },
        validation,
        response: parsed
      }, null, 2));

      console.log(`\n💾 Full results saved to: ${path.basename(outputPath)}`);

      // Final summary
      console.log('\n' + '='.repeat(80));
      if (validation.valid) {
        console.log('✅ TEST PASSED - Ready for integration!');
        console.log(`📊 Generated ${validation.stats.questionCount} questions + ${validation.stats.summaryWordCount} word summary`);
        console.log(`💰 Cost: $${usageMetadata ? ((usageMetadata.promptTokenCount / 1_000_000) * 0.10 + (usageMetadata.candidatesTokenCount / 1_000_000) * 0.40).toFixed(6) : 'unknown'}`);
        console.log(`⏱️  Time: ${(duration / 1000).toFixed(1)}s`);
      } else {
        console.log('❌ TEST FAILED - Review issues above');
      }
      console.log('='.repeat(80));

    } catch (parseError) {
      console.error('\n❌ Failed to parse JSON:', parseError);
      console.log('\n📄 Raw response (first 500 chars):');
      console.log(text.substring(0, 500));

      // Save raw response for debugging
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const errorPath = path.join(__dirname, 'prompttests', `test-summary-ERROR-${timestamp}.txt`);
      fs.writeFileSync(errorPath, text);
      console.log(`\n💾 Raw response saved to: ${path.basename(errorPath)}`);
    }

  } catch (error) {
    console.error('\n❌ Gemini API Error:', error);
    throw error;
  }
}

// Run the test
console.log('🚀 Starting Summary Generation Test');
console.log('='.repeat(80));
testSummaryGeneration().catch(console.error);
