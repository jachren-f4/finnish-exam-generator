/**
 * Test Gamified Key Concepts Generation - Mathematics Edition
 * Combines the specialized math prompt with key concepts generation
 *
 * Expected Output:
 * - 15 math exam questions
 * - Audio summary with spoken notation (NOT LaTeX)
 * - Key concepts with gamification metadata (images × 3)
 * - Spoken notation in definitions (critical for audio TTS)
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

// Dynamic key concepts calculation: images × 3
const IMAGE_COUNT = 3; // Start with 3 math images
const KEY_CONCEPTS_MULTIPLIER = 3;
const EXPECTED_KEY_CONCEPTS = IMAGE_COUNT * KEY_CONCEPTS_MULTIPLIER; // 3 × 3 = 9

const grade = 8;

// Math prompt with key concepts generation injected
// Based on getMathPrompt from config.ts + key concepts task
const prompt = `# Mathematics Exam Generator with Key Concepts

🔴 CRITICAL: Keep total output under 4000 tokens.
- Use concise definitions (50-70 words max per concept)
- Limit explanations to 1-2 sentences
- Avoid repetition between sections
- Be brief but educational

You are an expert Finnish mathematics educator creating engaging exam questions for grade ${grade} students.

## Task Overview
1. Analyze uploaded textbook images
2. Generate ${EXAM_QUESTION_COUNT} mathematics questions
3. Create BRIEF audio summary with spoken notation (~300 words total)
4. Extract ${EXPECTED_KEY_CONCEPTS} CONCISE key concepts

---

## 🔴 CRITICAL NOTATION RULES

**SPOKEN NOTATION ONLY - NO LaTeX IN AUDIO/CONCEPTS**

Questions use LaTeX for visual rendering:
- Inline: $x^2$, $\\frac{1}{2}$
- Display: $$\\sum_{i=1}^{n}$$

BUT audio_summary and key_concepts MUST use spoken Finnish:
- ❌ NOT: "$x^2$"
- ✅ YES: "x toiseen"
- ❌ NOT: "$\\frac{1}{2}$"
- ✅ YES: "yksi per kaksi" or "puolikas"
- ❌ NOT: "$\\sqrt{16}$"
- ✅ YES: "neliöjuuri 16:sta"
- ❌ NOT: "$\\pi r^2$"
- ✅ YES: "pii kertaa r toiseen"

**Why?** These sections are read aloud by Google Cloud TTS. LaTeX breaks audio playback.

---

## Question Generation Rules

**Coverage:**
- Algebra/equations: 5 questions
- Geometry/shapes: 4 questions
- Numbers/operations: 4 questions
- Word problems: 2 questions
Total: ${EXAM_QUESTION_COUNT} questions

**Question Format:**
\`\`\`json
{
  "id": number,
  "type": "multiple_choice",
  "question": "Problem text with LaTeX: Laske $x^2$ kun x = 5",
  "options": ["$25$", "$10$", "$5$", "$15$"],
  "correct_answer": "$25$",
  "explanation": "Explanation with LaTeX OK: $5^2 = 25$"
}
\`\`\`

**Question Quality:**
- Grade-appropriate difficulty
- Clear, unambiguous wording
- LaTeX for all mathematical notation
- One definitively correct answer
- Brief explanations (1-2 sentences max)

---

## Audio Summary Generation

**CRITICAL: Use SPOKEN NOTATION - NO LaTeX symbols**
**CRITICAL: Keep BRIEF - target 300 words total (NOT 500)**

Generate concise audio-friendly summary explaining core concepts:

**Structure:**
1. **Introduction** (60 words): Topic overview
2. **Key Ideas** (150 words): Core concepts with spoken math
3. **Application** (60 words): Real-world relevance
4. **Conclusion** (30 words): Encouraging wrap-up

**Spoken Notation Examples:**
- Powers: "kolme toiseen" not "$3^2$"
- Fractions: "kaksi kolmasosaa" not "$\\frac{2}{3}$"
- Operations: "x plus viisi" not "$x + 5$"
- Equations: "y on yhtä suuri kuin kaksi x plus kolme" not "$y = 2x + 3$"

---

## Key Concepts Extraction

Extract exactly ${EXPECTED_KEY_CONCEPTS} key mathematical concepts from the textbook.

**Formula:** Number of concepts = Number of images × 3

**Concept Structure:**
\`\`\`json
{
  "concept_name": "Short title (2-4 words, Finnish)",
  "definition": "CONCISE spoken notation (50-70 words MAX, NO LaTeX)",
  "difficulty": "foundational" | "intermediate" | "advanced",
  "category": "Algebra" | "Geometry" | "Numbers" | "Problem Solving",
  "related_question_ids": [1, 3, 7],
  "badge_title": "Badge (2-3 words, Finnish)",
  "mini_game_hint": "Brief hint (8-12 words max)"
}
\`\`\`

**Critical Rules:**
1. **Spoken notation in definitions**: "x toiseen" NOT "$x^2$"
2. **CONCISE definitions**: 50-70 words MAX (not 100)
3. **Link to questions**: Each concept must reference 1-3 question IDs
4. **Difficulty balance**: Mix foundational, intermediate, advanced
5. **Category variety**: Distribute across Algebra/Geometry/Numbers
6. **Brief badges and hints**: Keep short

**Example Concept (CONCISE):**
\`\`\`json
{
  "concept_name": "Neliöjuuri",
  "definition": "Neliöjuuri on luku, joka kerrottuna itsellään antaa alkuperäisen luvun. Neliöjuuri 16:sta on 4.",
  "difficulty": "foundational",
  "category": "Numbers",
  "related_question_ids": [2, 8],
  "badge_title": "Juurten Mestari",
  "mini_game_hint": "Mikä luku kertaa itsensä antaa tämän?"
}
\`\`\`

---

## Gamification Elements

Include BRIEF completion rewards and boss questions:

\`\`\`json
{
  "completion_message": "Brief congratulations (10-15 words)",
  "boss_question_open": "Concise synthesis question",
  "boss_question_multiple_choice": {
    "question": "Brief MC question",
    "options": ["A", "B", "C", "D"],
    "correct_answer": "B"
  },
  "reward_text": "Short reward message (5-10 words)"
}
\`\`\`

---

## 🔴 JSON OUTPUT FORMAT

Return ONLY this JSON (no markdown, no extra text):

\`\`\`json
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question with LaTeX: $x^2$",
      "options": ["$A$", "$B$", "$C$", "$D$"],
      "correct_answer": "$A$",
      "explanation": "Explanation with LaTeX OK"
    }
    // ... ${EXAM_QUESTION_COUNT} questions total
  ],
  "audio_summary": {
    "introduction": "Spoken Finnish, no LaTeX...",
    "key_ideas": "Spoken Finnish, 'x toiseen' not $x^2$...",
    "application": "Real-world examples...",
    "conclusion": "Encouraging message...",
    "total_word_count": 500,
    "language": "fi"
  },
  "key_concepts": [
    {
      "concept_name": "Concept name",
      "definition": "SPOKEN notation only, NO LaTeX",
      "difficulty": "foundational",
      "category": "Algebra",
      "related_question_ids": [1, 3],
      "badge_title": "Badge name",
      "mini_game_hint": "Hint text"
    }
    // Exactly ${EXPECTED_KEY_CONCEPTS} concepts
  ],
  "gamification": {
    "completion_message": "Congratulations message",
    "boss_question_open": "Synthesis question",
    "boss_question_multiple_choice": {
      "question": "MC question",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A"
    },
    "reward_text": "Achievement unlocked text"
  }
}
\`\`\`

---

## Validation Checklist

Before submitting, verify:
- [ ] ${EXAM_QUESTION_COUNT} questions with LaTeX notation
- [ ] Brief explanations (1-2 sentences each)
- [ ] audio_summary uses SPOKEN notation (no LaTeX), ~300 words
- [ ] Exactly ${EXPECTED_KEY_CONCEPTS} key concepts
- [ ] ALL concept definitions 50-70 words, spoken notation
- [ ] Each concept links to 1-3 questions
- [ ] Gamification object complete and brief
- [ ] Valid JSON only (no markdown/extra text)
- [ ] **TOTAL OUTPUT < 4000 TOKENS**

**Remember:**
- Questions = LaTeX OK. Audio/Concepts = SPOKEN ONLY.
- BREVITY is critical - stay under 4000 tokens total

Generate the exam now.`;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

interface ValidationResult {
  valid: boolean;
  issues: string[];
  stats: {
    questionCount: number;
    audioSummaryWordCount: number;
    keyConceptsCount: number;
    hasGamification: boolean;
    difficultyDistribution: Record<string, number>;
    questionCoverage: number;
    unreferencedQuestions: number[];
    categoryDistribution: Record<string, number>;
    hasBossQuestionVariants: boolean;
    audioUsesSpokenNotation: boolean;
    conceptsUseSpokenNotation: boolean;
    latexPatternsInAudio: string[];
    latexPatternsInConcepts: string[];
  };
}

function validateResponse(response: any): ValidationResult {
  const issues: string[] = [];
  let valid = true;

  // Check questions
  const questionCount = response.questions?.length || 0;
  if (questionCount !== EXAM_QUESTION_COUNT) {
    issues.push(`❌ Expected ${EXAM_QUESTION_COUNT} questions, got ${questionCount}`);
    valid = false;
  } else {
    issues.push(`✅ Question count: ${questionCount}`);
  }

  // Check audio summary word count
  const audioWordCount = response.audio_summary?.total_word_count || 0;
  if (audioWordCount < 400 || audioWordCount > 600) {
    issues.push(`⚠️  Audio summary: ${audioWordCount} words (expected: ~500)`);
  } else {
    issues.push(`✅ Audio summary word count: ${audioWordCount}`);
  }

  // Check key concepts count
  const keyConceptsCount = response.key_concepts?.length || 0;
  if (keyConceptsCount !== EXPECTED_KEY_CONCEPTS) {
    issues.push(`⚠️  Expected ${EXPECTED_KEY_CONCEPTS} key concepts, got ${keyConceptsCount}`);
  } else {
    issues.push(`✅ Key concepts count: ${keyConceptsCount} (matches expected: ${EXPECTED_KEY_CONCEPTS})`);
  }

  // Validate concept structure
  response.key_concepts?.forEach((concept: any, index: number) => {
    const nameWords = concept.concept_name?.split(' ').length || 0;
    if (nameWords < 2 || nameWords > 5) {
      issues.push(`⚠️  Concept ${index + 1} name has ${nameWords} words (expected: 2-5)`);
    }

    if (!concept.related_question_ids || concept.related_question_ids.length === 0) {
      issues.push(`⚠️  Concept ${index + 1} has no related questions`);
    }
  });

  // Check question coverage
  const allReferencedQuestionIds = new Set<number>();
  response.key_concepts?.forEach((concept: any) => {
    concept.related_question_ids?.forEach((id: number) => allReferencedQuestionIds.add(id));
  });

  const unreferencedQuestions = Array.from({ length: questionCount }, (_, i) => i + 1)
    .filter(id => !allReferencedQuestionIds.has(id));

  const coverage = ((questionCount - unreferencedQuestions.length) / questionCount * 100).toFixed(0);

  if (unreferencedQuestions.length > 0) {
    issues.push(`⚠️  ${unreferencedQuestions.length} questions not referenced in any concept: [${unreferencedQuestions.join(', ')}]`);
  }

  // Check gamification completeness
  const hasGamification = Boolean(
    response.gamification?.completion_message &&
    response.gamification?.boss_question_open &&
    response.gamification?.boss_question_multiple_choice &&
    response.gamification?.reward_text
  );

  if (!hasGamification) {
    issues.push('❌ Gamification object incomplete');
    valid = false;
  } else {
    issues.push('✅ Gamification object complete with boss question variants');
  }

  // Check for LaTeX in audio_summary (CRITICAL for math)
  const latexPattern = /\$[^$]+\$|\\\w+{/g;
  const audioText = JSON.stringify(response.audio_summary || {});
  const audioLatexMatches = audioText.match(latexPattern) || [];

  const audioUsesSpokenNotation = audioLatexMatches.length === 0;
  if (!audioUsesSpokenNotation) {
    issues.push(`❌ Audio summary contains LaTeX: ${audioLatexMatches.slice(0, 3).join(', ')}...`);
    valid = false;
  } else {
    issues.push('✅ Audio summary uses spoken notation (no LaTeX)');
  }

  // Check for LaTeX in concept definitions (CRITICAL for math)
  const conceptsText = response.key_concepts?.map((c: any) => c.definition).join(' ') || '';
  const conceptLatexMatches = conceptsText.match(latexPattern) || [];

  const conceptsUseSpokenNotation = conceptLatexMatches.length === 0;
  if (!conceptsUseSpokenNotation) {
    issues.push(`❌ Concept definitions contain LaTeX: ${conceptLatexMatches.slice(0, 3).join(', ')}...`);
    valid = false;
  } else {
    issues.push('✅ Concept definitions use spoken notation (no LaTeX)');
  }

  // Calculate stats
  const difficultyDistribution: Record<string, number> = {};
  const categoryDistribution: Record<string, number> = {};

  response.key_concepts?.forEach((concept: any) => {
    const diff = concept.difficulty || 'unknown';
    const cat = concept.category || 'uncategorized';
    difficultyDistribution[diff] = (difficultyDistribution[diff] || 0) + 1;
    categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
  });

  return {
    valid,
    issues,
    stats: {
      questionCount,
      audioSummaryWordCount: audioWordCount,
      keyConceptsCount,
      hasGamification,
      difficultyDistribution,
      questionCoverage: parseInt(coverage),
      unreferencedQuestions,
      categoryDistribution,
      hasBossQuestionVariants: Boolean(response.gamification?.boss_question_multiple_choice),
      audioUsesSpokenNotation,
      conceptsUseSpokenNotation,
      latexPatternsInAudio: audioLatexMatches.slice(0, 5),
      latexPatternsInConcepts: conceptLatexMatches.slice(0, 5)
    }
  };
}

async function runTest() {
  console.log('🚀 Starting Math + Key Concepts Test');
  console.log('='.repeat(80));

  // Initialize Gemini
  console.log('🔧 Initializing Gemini API...');
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: TEMPERATURE,
    }
  });

  // Load test images from math directory
  const imagesDir = path.join(__dirname, 'assets/images/math_8th_grade');
  const imageFiles = fs.readdirSync(imagesDir)
    .filter(file => file.endsWith('.jpeg') || file.endsWith('.jpg') || file.endsWith('.JPG') || file.endsWith('.png'))
    .slice(0, IMAGE_COUNT);

  console.log(`📸 Loading ${imageFiles.length} test images:`);
  imageFiles.forEach(file => console.log(`   - ${file}`));
  console.log('');

  const imageParts = imageFiles.map(filename => {
    const filePath = path.join(imagesDir, filename);
    const imageData = fs.readFileSync(filePath);
    return {
      inlineData: {
        data: imageData.toString('base64'),
        mimeType: filename.endsWith('.png') ? 'image/png' : 'image/jpeg',
      },
    };
  });

  console.log('📝 Prompt Configuration:');
  console.log(`   Category: mathematics`);
  console.log(`   Grade: ${grade}`);
  console.log(`   Questions: ${EXAM_QUESTION_COUNT}`);
  console.log(`   Expected audio summary length: ~500 words`);
  console.log(`   Expected key concepts: ${EXPECTED_KEY_CONCEPTS}`);
  console.log(`   Prompt size: ${prompt.length} characters`);
  console.log('');

  // Generate content
  console.log('⏳ Calling Gemini API...');
  const startTime = Date.now();

  const result = await model.generateContent([prompt, ...imageParts]);
  const response = result.response;
  const duration = Date.now() - startTime;

  console.log(`\n✅ Response received in ${duration}ms (${(duration / 1000).toFixed(1)}s)\n`);

  // Display usage metadata
  if (response.usageMetadata) {
    const usage = response.usageMetadata;
    const inputTokens = usage.promptTokenCount || 0;
    const outputTokens = usage.candidatesTokenCount || 0;
    const totalTokens = usage.totalTokenCount || 0;

    // Calculate cost (Gemini 2.5 Flash-Lite pricing)
    const inputCost = (inputTokens / 1_000_000) * 0.075;
    const outputCost = (outputTokens / 1_000_000) * 0.30;
    const totalCost = inputCost + outputCost;

    console.log('💰 Cost Analysis:');
    console.log(`   Input tokens: ${inputTokens.toLocaleString()}`);
    console.log(`   Output tokens: ${outputTokens.toLocaleString()}`);
    console.log(`   Total tokens: ${totalTokens.toLocaleString()}`);
    console.log(`   Estimated cost: $${totalCost.toFixed(6)}`);
    console.log('');
  }

  // Parse response
  console.log('📊 Parsing response...');
  const text = response.text();

  // Try to extract JSON from response
  let parsedResponse;
  try {
    // Try direct JSON parse first
    parsedResponse = JSON.parse(text);
    console.log('✅ Valid JSON response\n');
  } catch (e) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        parsedResponse = JSON.parse(jsonMatch[1]);
        console.log('✅ Extracted JSON from markdown code block\n');
      } catch (e2) {
        console.error('❌ Failed to parse JSON from code block');
        console.error('First 500 chars:', text.substring(0, 500));
        throw e2;
      }
    } else {
      console.error('❌ No JSON found in response');
      console.error('First 500 chars:', text.substring(0, 500));
      throw e;
    }
  }

  // Validate response
  const validation = validateResponse(parsedResponse);

  console.log('📋 Validation Results:');
  validation.issues.forEach(issue => console.log(`   ${issue}`));
  console.log('');

  console.log('📊 Statistics:');
  console.log(`   Questions: ${validation.stats.questionCount}`);
  console.log(`   Audio summary words: ${validation.stats.audioSummaryWordCount}`);
  console.log(`   Key concepts: ${validation.stats.keyConceptsCount}`);
  console.log(`   Question coverage: ${validation.stats.questionCoverage}%`);
  console.log(`   Gamification: ${validation.stats.hasGamification ? '✅' : '❌'}`);
  console.log('');

  console.log('🎯 Difficulty Distribution:');
  Object.entries(validation.stats.difficultyDistribution).forEach(([level, count]) => {
    console.log(`   ${level}: ${count}`);
  });
  console.log('');

  console.log('📂 Category Distribution:');
  Object.entries(validation.stats.categoryDistribution).forEach(([category, count]) => {
    console.log(`   ${category}: ${count} concepts`);
  });
  console.log('');

  console.log(`   Boss Question Variants: ${validation.stats.hasBossQuestionVariants ? '✅' : '❌'}`);
  console.log(`   Spoken Notation (Audio): ${validation.stats.audioUsesSpokenNotation ? '✅' : '❌'}`);
  console.log(`   Spoken Notation (Concepts): ${validation.stats.conceptsUseSpokenNotation ? '✅' : '❌'}`);
  console.log(`   Overall validation: ${validation.valid ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('');

  // Display sample content
  if (parsedResponse.questions && parsedResponse.questions.length > 0) {
    const sampleQ = parsedResponse.questions[0];
    console.log('📝 Sample Question:');
    console.log(`   ${sampleQ.question}`);
    if (sampleQ.options) {
      sampleQ.options.forEach((opt: string, i: number) => {
        const marker = opt === sampleQ.correct_answer ? ' ✓' : '';
        console.log(`   ${String.fromCharCode(65 + i)}) ${opt}${marker}`);
      });
    }
    console.log('');
  }

  if (parsedResponse.key_concepts && parsedResponse.key_concepts.length > 0) {
    const sampleConcept = parsedResponse.key_concepts[0];
    console.log('🎓 Sample Key Concept:');
    console.log(`   Name: ${sampleConcept.concept_name}`);
    console.log(`   Category: ${sampleConcept.category}`);
    console.log(`   Definition: ${sampleConcept.definition}`);
    console.log(`   Difficulty: ${sampleConcept.difficulty}`);
    console.log(`   Related Questions: [${sampleConcept.related_question_ids?.join(', ')}]`);
    console.log(`   Badge: "${sampleConcept.badge_title}"`);
    console.log(`   Mini-game Hint: "${sampleConcept.mini_game_hint}"`);
    console.log('');
  }

  if (parsedResponse.key_concepts && parsedResponse.key_concepts.length > 0) {
    console.log('🏆 All Badge Titles:');
    parsedResponse.key_concepts.forEach((concept: any, i: number) => {
      console.log(`   ${i + 1}. ${concept.badge_title}`);
    });
    console.log('');
  }

  if (parsedResponse.gamification) {
    const g = parsedResponse.gamification;
    console.log('🎮 Gamification Data:');
    console.log(`   Completion: "${g.completion_message}"`);
    console.log(`   Boss Question (Open): "${g.boss_question_open}"`);
    if (g.boss_question_multiple_choice) {
      console.log(`   Boss Question (MC): "${g.boss_question_multiple_choice.question}"`);
      g.boss_question_multiple_choice.options?.forEach((opt: string, i: number) => {
        const marker = opt === g.boss_question_multiple_choice.correct_answer ? ' ✓' : '';
        console.log(`     ${String.fromCharCode(65 + i)}) ${opt}${marker}`);
      });
    }
    console.log(`   Reward: "${g.reward_text}"`);
    console.log('');
  }

  if (parsedResponse.audio_summary) {
    const audio = parsedResponse.audio_summary;
    console.log('📄 Audio Summary Preview:');
    console.log(`   Introduction: ${audio.introduction?.substring(0, 100)}...`);
    console.log(`   Language: ${audio.language}`);
    console.log('');
  }

  // Save results
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const outputPath = path.join('prompttests', `test-math-key-concepts-${timestamp}.json`);

  const output = {
    test_config: {
      type: 'mathematics_with_key_concepts',
      grade,
      question_count: EXAM_QUESTION_COUNT,
      expected_audio_summary_words: 500,
      expected_key_concepts: EXPECTED_KEY_CONCEPTS,
      prompt_size: prompt.length,
      image_count: IMAGE_COUNT,
      model: MODEL_NAME,
      temperature: TEMPERATURE,
    },
    performance: {
      duration_ms: duration,
      usage_metadata: response.usageMetadata,
    },
    validation,
    response: parsedResponse,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`💾 Full results saved to: ${outputPath}\n`);

  // Generate HTML prototype
  console.log('🎨 Generating HTML prototype...');
  const htmlPath = path.join('output', `key-concepts-math-${timestamp}.html`);
  const html = generateHTMLPrototype(parsedResponse);
  fs.writeFileSync(htmlPath, html);
  console.log(`✅ HTML prototype saved to: ${htmlPath}`);
  console.log(`   Open in browser: file://${path.resolve(htmlPath)}\n`);

  // Final summary
  console.log('='.repeat(80));
  if (validation.valid) {
    console.log(`✅ TEST PASSED - Ready for integration!`);
  } else {
    console.log(`❌ TEST FAILED - Review issues above`);
  }
  console.log('📊 Generated:');
  console.log(`   - ${validation.stats.questionCount} questions`);
  console.log(`   - ${validation.stats.audioSummaryWordCount} word audio summary`);
  console.log(`   - ${validation.stats.keyConceptsCount} key concepts`);
  console.log(`   - ${validation.stats.questionCoverage}% question coverage`);
  console.log(`   - Gamification data ${validation.stats.hasGamification ? 'complete' : 'incomplete'}`);
  console.log(`   - Spoken notation: ${validation.stats.audioUsesSpokenNotation && validation.stats.conceptsUseSpokenNotation ? '✅' : '❌'}`);

  if (response.usageMetadata) {
    const usage = response.usageMetadata;
    const totalCost = ((usage.promptTokenCount || 0) / 1_000_000) * 0.075 +
                      ((usage.candidatesTokenCount || 0) / 1_000_000) * 0.30;
    console.log(`💰 Cost: $${totalCost.toFixed(6)}`);
  }

  console.log(`⏱️  Time: ${(duration / 1000).toFixed(1)}s`);
  console.log('='.repeat(80));
}

function generateHTMLPrototype(data: any): string {
  const concepts = data.key_concepts || [];
  const conceptCards = concepts.map((concept: any, index: number) => `
    <div class="concept-card" data-index="${index}">
      <div class="concept-number">${index + 1}</div>
      <div class="concept-badge">${concept.badge_title || 'Badge'}</div>
      <h3 class="concept-name">${concept.concept_name || 'Concept'}</h3>
      <p class="concept-definition">${concept.definition || 'No definition'}</p>
      <div class="concept-meta">
        <span class="difficulty ${concept.difficulty}">${concept.difficulty || 'unknown'}</span>
        <span class="category">${concept.category || 'uncategorized'}</span>
      </div>
      <div class="concept-hint">${concept.mini_game_hint || 'No hint'}</div>
      <div class="related-questions">
        Kysymykset: ${(concept.related_question_ids || []).join(', ')}
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Math Key Concepts - Test Output</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      color: white;
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }

    .subtitle {
      color: rgba(255,255,255,0.9);
      text-align: center;
      margin-bottom: 40px;
      font-size: 1.1rem;
    }

    .progress-bar {
      background: rgba(255,255,255,0.2);
      height: 8px;
      border-radius: 4px;
      margin-bottom: 30px;
      overflow: hidden;
    }

    .progress-fill {
      background: linear-gradient(90deg, #4ade80, #22c55e);
      height: 100%;
      width: 0%;
      transition: width 0.3s ease;
    }

    .concepts-grid {
      display: grid;
      gap: 20px;
    }

    .concept-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .concept-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.15);
    }

    .concept-number {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.9rem;
    }

    .concept-badge {
      display: inline-block;
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      color: white;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .concept-name {
      font-size: 1.5rem;
      color: #1a1a1a;
      margin-bottom: 12px;
      font-weight: 700;
    }

    .concept-definition {
      color: #4a5568;
      line-height: 1.6;
      margin-bottom: 16px;
      font-size: 0.95rem;
    }

    .concept-meta {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .difficulty, .category {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: capitalize;
    }

    .difficulty.foundational { background: #dbeafe; color: #1e40af; }
    .difficulty.intermediate { background: #fef3c7; color: #92400e; }
    .difficulty.advanced { background: #fee2e2; color: #991b1b; }

    .category {
      background: #f3e8ff;
      color: #6b21a8;
    }

    .concept-hint {
      background: #f9fafb;
      border-left: 4px solid #667eea;
      padding: 12px;
      border-radius: 8px;
      font-style: italic;
      color: #6b7280;
      font-size: 0.9rem;
      margin-bottom: 12px;
    }

    .related-questions {
      font-size: 0.85rem;
      color: #9ca3af;
    }

    .completion {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 32px;
      border-radius: 16px;
      text-align: center;
      margin-top: 30px;
      box-shadow: 0 8px 30px rgba(16, 185, 129, 0.3);
    }

    .completion h2 {
      font-size: 2rem;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎓 Matematiikan Avainkäsitteet</h1>
    <p class="subtitle">Hallitse ${concepts.length} tärkeää käsitettä</p>

    <div class="progress-bar">
      <div class="progress-fill" id="progress"></div>
    </div>

    <div class="concepts-grid">
      ${conceptCards}
    </div>

    <div class="completion">
      <h2>🎉 ${data.gamification?.completion_message || 'Hienoa työtä!'}</h2>
      <p style="font-size: 1.1rem; opacity: 0.95;">${data.gamification?.reward_text || 'Olet valmis!'}</p>
    </div>
  </div>

  <script>
    const cards = document.querySelectorAll('.concept-card');
    const progress = document.getElementById('progress');
    let completed = 0;

    cards.forEach(card => {
      card.addEventListener('click', function() {
        if (!this.classList.contains('completed')) {
          this.style.opacity = '0.6';
          this.classList.add('completed');
          completed++;
          updateProgress();
        }
      });
    });

    function updateProgress() {
      const percentage = (completed / cards.length) * 100;
      progress.style.width = percentage + '%';
    }
  </script>
</body>
</html>`;
}

// Run the test
runTest().catch(console.error);
