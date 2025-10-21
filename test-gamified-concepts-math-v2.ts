/**
 * Test Gamified Key Concepts Generation - Mathematics Edition V2
 * TWO-STAGE APPROACH to avoid token overflow:
 *
 * Stage 1: Generate standard math exam (questions + audio summary)
 * Stage 2: Extract key concepts from questions (separate API call)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash-lite';
const TEMPERATURE = 0;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const IMAGE_COUNT = 3;
const EXPECTED_KEY_CONCEPTS = IMAGE_COUNT * 3; // 9 concepts
const grade = 8;

// ==================== STAGE 1: MATH EXAM GENERATION ====================

const mathExamPrompt = `# Mathematics Exam Generator

🔴 CRITICAL: Keep total output under 3000 tokens.
Use VERY brief explanations. Be concise.

Generate a mathematics exam for grade ${grade} Finnish students from textbook images.

## Output Structure

Return ONLY valid JSON (no markdown):

\`\`\`json
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Math problem with LaTeX: $x^2 = 25$",
      "options": ["$x=5$", "$x=-5$", "$x=\\pm 5$", "$x=25$"],
      "correct_answer": "$x=\\pm 5$",
      "explanation": "Brief 1-2 sentence explanation with LaTeX OK"
    }
    // ... 15 questions total
  ],
  "audio_summary": {
    "introduction": "Spoken Finnish (no LaTeX), 60 words",
    "key_ideas": "Spoken Finnish explaining concepts, 150 words",
    "application": "Real-world examples, 60 words",
    "conclusion": "Encouraging message, 30 words",
    "total_word_count": 300,
    "language": "fi"
  }
}
\`\`\`

## Question Rules
- Generate 15 multiple choice questions
- Use LaTeX notation in questions: $x^2$, $\\frac{1}{2}$, etc.
- VERY brief explanations (1 sentence max, 10-15 words)
- Mix: 5 algebra, 4 geometry, 4 numbers, 2 word problems
- Keep concise to stay under 3000 tokens total

## Audio Summary Rules
- SPOKEN NOTATION ONLY (no LaTeX symbols)
- "x toiseen" NOT "$x^2$"
- "puolikas" or "yksi per kaksi" NOT "$\\frac{1}{2}$"
- Target 250 words total (very brief)
- Each section: 50/120/50/30 words

🔴 CRITICAL REMINDER: Total output must be under 3000 tokens.
Use minimal words. Be extremely concise.

Generate the exam now.`;

// ==================== STAGE 2: KEY CONCEPTS EXTRACTION ====================

const keyConceptsPrompt = (questions: any[]) => `# Key Concepts Extraction

Extract ${EXPECTED_KEY_CONCEPTS} key mathematical concepts from these exam questions.

## Questions Provided
${JSON.stringify(questions.slice(0, 5), null, 2)}
... (${questions.length} questions total)

## Output Structure

Return ONLY valid JSON array:

\`\`\`json
{
  "key_concepts": [
    {
      "concept_name": "Yhtälön ratkaiseminen",
      "definition": "SPOKEN notation only, 50-70 words explaining concept clearly",
      "difficulty": "foundational",
      "category": "Algebra",
      "related_question_ids": [1, 4, 7],
      "badge_title": "Yhtälömestari",
      "mini_game_hint": "Etsi tuntematon luku"
    }
    // ... exactly ${EXPECTED_KEY_CONCEPTS} concepts
  ],
  "gamification": {
    "completion_message": "Loistavaa! Hallitset matematiikan perusteet!",
    "boss_question_open": "Selitä, miten yhtälöt ja geometria liittyvät toisiinsa.",
    "boss_question_multiple_choice": {
      "question": "Mikä yhdistää yhtälöt ja geometrian?",
      "options": ["Molemmat käyttävät lukuja", "Molemmat etsivät tuntemattomia", "Molemmat ovat matematiikkaa", "Molemmat käyttävät kaavoja"],
      "correct_answer": "Molemmat käyttävät kaavoja"
    },
    "reward_text": "Matematiikan Mestari!"
  }
}
\`\`\`

## Critical Rules
1. **Spoken notation ONLY**: "x toiseen" NOT "$x^2$"
2. **Concise definitions**: 50-70 words each
3. **Link to questions**: Each concept references 1-3 question IDs
4. **Exactly ${EXPECTED_KEY_CONCEPTS} concepts**: Images × 3 formula
5. **Categories**: Algebra, Geometry, Numbers, Problem Solving
6. **Brief gamification**: Short messages

Extract concepts now.`;

// ==================== EXECUTION ====================

async function runTwoStageTest() {
  console.log('🚀 Starting Two-Stage Math + Key Concepts Test');
  console.log('='.repeat(80));

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { temperature: TEMPERATURE }
  });

  // Load images
  const imagesDir = path.join(__dirname, 'assets/images/math_8th_grade');
  const imageFiles = fs.readdirSync(imagesDir)
    .filter(file => /\.(jpg|jpeg|png)$/i.test(file))
    .slice(0, IMAGE_COUNT);

  console.log(`📸 Loading ${imageFiles.length} images:`);
  imageFiles.forEach(f => console.log(`   - ${f}`));
  console.log('');

  const imageParts = imageFiles.map(filename => {
    const filePath = path.join(imagesDir, filename);
    const imageData = fs.readFileSync(filePath);
    return {
      inlineData: {
        data: imageData.toString('base64'),
        mimeType: filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
      }
    };
  });

  // ==================== STAGE 1 ====================
  console.log('📝 STAGE 1: Generating math exam (questions + audio)...');
  const stage1Start = Date.now();

  const stage1Result = await model.generateContent([mathExamPrompt, ...imageParts]);
  const stage1Duration = Date.now() - stage1Start;
  const stage1Response = stage1Result.response;

  console.log(`✅ Stage 1 completed in ${(stage1Duration / 1000).toFixed(1)}s\n`);

  if (stage1Response.usageMetadata) {
    const u = stage1Response.usageMetadata;
    console.log('💰 Stage 1 Tokens:');
    console.log(`   Input: ${(u.promptTokenCount || 0).toLocaleString()}`);
    console.log(`   Output: ${(u.candidatesTokenCount || 0).toLocaleString()}`);
    console.log(`   Total: ${(u.totalTokenCount || 0).toLocaleString()}`);

    const cost = ((u.promptTokenCount || 0) / 1_000_000) * 0.075 +
                 ((u.candidatesTokenCount || 0) / 1_000_000) * 0.30;
    console.log(`   Cost: $${cost.toFixed(6)}\n`);
  }

  // Parse Stage 1
  let examData;
  const stage1Text = stage1Response.text();

  try {
    examData = JSON.parse(stage1Text);
  } catch (e) {
    const jsonMatch = stage1Text.match(/```json\n([\s\S]*?)\n```/) || stage1Text.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      examData = JSON.parse(jsonMatch[1]);
    } else {
      console.error('❌ Stage 1 failed to parse JSON');
      console.error('First 500 chars:', stage1Text.substring(0, 500));
      throw e;
    }
  }

  console.log('✅ Stage 1 parsed successfully');
  console.log(`   Questions: ${examData.questions?.length || 0}`);
  console.log(`   Audio summary: ${examData.audio_summary?.total_word_count || 0} words\n`);

  // ==================== STAGE 2 ====================
  console.log('📝 STAGE 2: Extracting key concepts from questions...');
  const stage2Start = Date.now();

  const conceptPrompt = keyConceptsPrompt(examData.questions || []);
  const stage2Result = await model.generateContent(conceptPrompt);
  const stage2Duration = Date.now() - stage2Start;
  const stage2Response = stage2Result.response;

  console.log(`✅ Stage 2 completed in ${(stage2Duration / 1000).toFixed(1)}s\n`);

  if (stage2Response.usageMetadata) {
    const u = stage2Response.usageMetadata;
    console.log('💰 Stage 2 Tokens:');
    console.log(`   Input: ${(u.promptTokenCount || 0).toLocaleString()}`);
    console.log(`   Output: ${(u.candidatesTokenCount || 0).toLocaleString()}`);
    console.log(`   Total: ${(u.totalTokenCount || 0).toLocaleString()}`);

    const cost = ((u.promptTokenCount || 0) / 1_000_000) * 0.075 +
                 ((u.candidatesTokenCount || 0) / 1_000_000) * 0.30;
    console.log(`   Cost: $${cost.toFixed(6)}\n`);
  }

  // Parse Stage 2
  let conceptsData;
  const stage2Text = stage2Response.text();

  try {
    conceptsData = JSON.parse(stage2Text);
  } catch (e) {
    const jsonMatch = stage2Text.match(/```json\n([\s\S]*?)\n```/) || stage2Text.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      conceptsData = JSON.parse(jsonMatch[1]);
    } else {
      console.error('❌ Stage 2 failed to parse JSON');
      console.error('First 500 chars:', stage2Text.substring(0, 500));
      throw e;
    }
  }

  console.log('✅ Stage 2 parsed successfully');
  console.log(`   Key concepts: ${conceptsData.key_concepts?.length || 0}`);
  console.log(`   Gamification: ${conceptsData.gamification ? '✅' : '❌'}\n`);

  // ==================== COMBINE & VALIDATE ====================
  const combined = {
    questions: examData.questions,
    audio_summary: examData.audio_summary,
    key_concepts: conceptsData.key_concepts,
    gamification: conceptsData.gamification
  };

  // Validation
  console.log('📊 Validation:');

  const questionCount = combined.questions?.length || 0;
  const audioWords = combined.audio_summary?.total_word_count || 0;
  const conceptCount = combined.key_concepts?.length || 0;

  console.log(`   ✅ Questions: ${questionCount} (expected: 15)`);
  console.log(`   ${audioWords >= 250 && audioWords <= 350 ? '✅' : '⚠️'}  Audio summary: ${audioWords} words (target: 300)`);
  console.log(`   ${conceptCount === EXPECTED_KEY_CONCEPTS ? '✅' : '❌'} Key concepts: ${conceptCount} (expected: ${EXPECTED_KEY_CONCEPTS})`);
  console.log(`   ${combined.gamification ? '✅' : '❌'} Gamification complete\n`);

  // Check for LaTeX in audio/concepts
  const audioText = JSON.stringify(combined.audio_summary);
  const conceptsText = combined.key_concepts?.map((c: any) => c.definition).join(' ') || '';
  const latexPattern = /\$[^$]+\$|\\\w+{/g;

  const audioHasLatex = latexPattern.test(audioText);
  const conceptsHaveLatex = latexPattern.test(conceptsText);

  console.log(`   ${!audioHasLatex ? '✅' : '❌'} Audio uses spoken notation (no LaTeX)`);
  console.log(`   ${!conceptsHaveLatex ? '✅' : '❌'} Concepts use spoken notation (no LaTeX)\n`);

  // Sample outputs
  if (combined.questions?.[0]) {
    const q = combined.questions[0];
    console.log('📝 Sample Question:');
    console.log(`   ${q.question}`);
    console.log(`   Answer: ${q.correct_answer}\n`);
  }

  if (combined.key_concepts?.[0]) {
    const c = combined.key_concepts[0];
    console.log('🎓 Sample Concept:');
    console.log(`   Name: ${c.concept_name}`);
    console.log(`   Definition: ${c.definition.substring(0, 100)}...`);
    console.log(`   Category: ${c.category}, Difficulty: ${c.difficulty}\n`);
  }

  // Combined costs
  const stage1Cost = ((stage1Response.usageMetadata?.promptTokenCount || 0) / 1_000_000) * 0.075 +
                     ((stage1Response.usageMetadata?.candidatesTokenCount || 0) / 1_000_000) * 0.30;
  const stage2Cost = ((stage2Response.usageMetadata?.promptTokenCount || 0) / 1_000_000) * 0.075 +
                     ((stage2Response.usageMetadata?.candidatesTokenCount || 0) / 1_000_000) * 0.30;
  const totalCost = stage1Cost + stage2Cost;
  const totalTime = (stage1Duration + stage2Duration) / 1000;

  console.log('='.repeat(80));
  console.log('💰 TOTAL COST ANALYSIS:');
  console.log(`   Stage 1 (Exam): $${stage1Cost.toFixed(6)}`);
  console.log(`   Stage 2 (Concepts): $${stage2Cost.toFixed(6)}`);
  console.log(`   Combined Total: $${totalCost.toFixed(6)}`);
  console.log(`   vs Single-Call Math (overflow): $0.019853`);
  console.log(`   Savings: $${(0.019853 - totalCost).toFixed(6)}\n`);

  console.log(`⏱️  TOTAL TIME: ${totalTime.toFixed(1)}s`);
  console.log(`   Stage 1: ${(stage1Duration / 1000).toFixed(1)}s`);
  console.log(`   Stage 2: ${(stage2Duration / 1000).toFixed(1)}s\n`);

  // Save results
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const outputPath = path.join('prompttests', `test-math-concepts-v2-${timestamp}.json`);

  const output = {
    test_config: {
      approach: 'two-stage',
      image_count: IMAGE_COUNT,
      expected_concepts: EXPECTED_KEY_CONCEPTS,
      model: MODEL_NAME,
      temperature: TEMPERATURE
    },
    performance: {
      stage1_duration_ms: stage1Duration,
      stage2_duration_ms: stage2Duration,
      total_duration_ms: stage1Duration + stage2Duration,
      stage1_tokens: stage1Response.usageMetadata,
      stage2_tokens: stage2Response.usageMetadata,
      stage1_cost: stage1Cost,
      stage2_cost: stage2Cost,
      total_cost: totalCost
    },
    validation: {
      questions: questionCount === 15,
      audio_words: audioWords >= 250 && audioWords <= 350,
      concept_count: conceptCount === EXPECTED_KEY_CONCEPTS,
      gamification: !!combined.gamification,
      audio_spoken_notation: !audioHasLatex,
      concepts_spoken_notation: !conceptsHaveLatex
    },
    response: combined
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`💾 Results saved: ${outputPath}\n`);

  const allValid = questionCount === 15 &&
                   audioWords >= 250 && audioWords <= 350 &&
                   conceptCount === EXPECTED_KEY_CONCEPTS &&
                   combined.gamification &&
                   !audioHasLatex &&
                   !conceptsHaveLatex;

  console.log('='.repeat(80));
  if (allValid) {
    console.log('✅ TWO-STAGE TEST PASSED!');
    console.log('   Math token overflow SOLVED with separate API calls');
  } else {
    console.log('⚠️  TWO-STAGE TEST COMPLETED WITH WARNINGS');
    console.log('   Review validation results above');
  }
  console.log('='.repeat(80));
}

runTwoStageTest().catch(console.error);
