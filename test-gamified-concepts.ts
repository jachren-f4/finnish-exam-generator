/**
 * Test Gamified Key Concepts Generation
 * Tests Gemini's ability to generate exam questions, educational summary, AND gamified key concepts in one call
 *
 * Expected Output:
 * - 15 exam questions
 * - ~970 word educational summary (4 sections)
 * - 8-12 key concepts with gamification metadata
 * - Gamification completion data
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
const EXPECTED_KEY_CONCEPTS_MIN = 8;
const EXPECTED_KEY_CONCEPTS_MAX = 12;
const EXPECTED_SUMMARY_WORDS = 1000; // Target: 900-1100 words
const SUMMARY_WORD_TOLERANCE = 200;
const category = 'core_academics';
const grade = 8;

// Combined prompt: Questions + Summary + Gamified Key Concepts
// Based on getCategoryAwarePromptWithSummary from config.ts, extended with key concepts
const prompt = `Create a text-based exam from educational content for grade ${grade} students AND generate an educational summary AND identify and gamify the key learning concepts.

CRITICAL CONSTRAINT: Students will NOT have access to any visual elements during the exam

Avoid:
- Visual references from the material, like images or page or chapter numbers
- References to graph, table, diagram, or coordinate systems
- Something that is factually untrue
- Something that is impossible to answer without the images
- Questions that aren't explicitly based on the source material

TARGET: Use the same language as the source material. Subject area: ${category}.

TASK 1: Generate exactly ${EXAM_QUESTION_COUNT} questions that test understanding of the educational concepts in the material.

TASK 2: Generate a comprehensive educational summary divided into structured sections:
- introduction (100-250 words): Overview of the topic and why it's important
- key_concepts (250-500 words): Detailed explanation of main concepts with definitions
- examples_and_applications (200-400 words): Practical examples and real-world applications
- summary_conclusion (100-250 words): Review of key points and takeaways

SUMMARY REQUIREMENTS:
- Use a friendly, teacher-like tone suitable for 14-year-olds
- The writing should feel supportive and conversational, not overly formal or academic
- Write in the SAME language as the source material
- Target total length for the summary: approximately 900–1100 words across all four sections combined

TASK 3: Extract and gamify 8–12 key concepts that represent the most important ideas in the material.

Each concept must include:
- "concept_name": 2–5 words
- "definition": one clear, single-sentence explanation
- "difficulty": "foundational", "intermediate", or "advanced"
- "category": a short category label (1–2 words) that best represents the group or theme the concept belongs to, such as "Motion", "Forces", or "Energy"
- "related_question_ids": array of integers referring to the question IDs above
- "badge_title": a short gamified label, e.g. "Energy Expert" or "Grammar Pro"
- "mini_game_hint": a short riddle or clue that could be used in a concept-matching or guessing game

Each "concept_name" should contain between 2 and 5 words. Avoid single-word names.

Ensure that every exam question is referenced by at least one key concept in the "related_question_ids" array.

Try to create diverse category labels across all key concepts (for example, some under "Motion", some under "Forces", and others under "Energy" or similar). Avoid assigning the same category to all concepts.

In the "gamification" object, include two boss question variants:
- "boss_question_open": one open-ended question that requires written explanation
- "boss_question_multiple_choice": one multiple-choice question (with 4 options) testing the same concept combination

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
    "introduction": "[100-250 word introduction]",
    "key_concepts": "[250-500 word detailed explanation]",
    "examples_and_applications": "[200-400 word practical examples]",
    "summary_conclusion": "[100-250 word review]",
    "total_word_count": [approximate total word count],
    "language": "[ISO 639-1 language code, e.g., 'fi' for Finnish, 'en' for English]"
  },
  "key_concepts": [
    {
      "concept_name": "...",
      "definition": "...",
      "difficulty": "intermediate",
      "category": "Forces",
      "related_question_ids": [1, 4, 7],
      "badge_title": "Concept Master",
      "mini_game_hint": "This happens when plants use sunlight."
    }
  ],
  "gamification": {
    "completion_message": "You've mastered all key concepts!",
    "boss_question_open": "Explain how these ideas connect together.",
    "boss_question_multiple_choice": {
      "question": "Which statement best describes how these concepts are related?",
      "options": [
        "They are completely independent",
        "They describe different aspects of the same phenomenon",
        "They only apply in specific situations",
        "They contradict each other"
      ],
      "correct_answer": "They describe different aspects of the same phenomenon"
    },
    "reward_text": "Concept Master Badge earned!"
  }
}

IMPORTANT:
- The correct_answer field must contain the exact text from the options array
- The summary must be in the SAME language as the questions and source material
- Include the new fields "key_concepts" and "gamification" in the same JSON response
- Ensure these are aligned with the questions and summary content
- Do not reference visual elements in the summary either
- Ensure that all key concept field values are plain text with no Markdown or HTML formatting. Keep them short, clear, and suitable for display in a web interface`;

async function countWords(text: string): Promise<number> {
  // Simple word count (split by whitespace)
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Generate interactive HTML prototype for Key Concepts section
 */
function generateConceptHTML(concepts: any[], testConfig: any): string {
  const cards = concepts.map((concept, idx) => `
    <div class="concept-card" data-clicked="false" data-index="${idx}">
      <div class="card-header">
        <h3>${concept.concept_name}</h3>
        <span class="difficulty-badge ${concept.difficulty}">${concept.difficulty}</span>
      </div>
      <p class="badge">🏅 ${concept.badge_title}</p>
      <p class="category">📂 ${concept.category}</p>
      <p class="related-questions">🔗 Questions: ${concept.related_question_ids?.join(', ') || 'none'}</p>
      <button class="expand-btn" onclick="toggleDefinition(this)">Näytä selitys</button>
      <div class="definition hidden">
        <p class="definition-text"><strong>Määritelmä:</strong> ${concept.definition}</p>
        <p class="hint">💡 <strong>Vihje:</strong> ${concept.mini_game_hint}</p>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>ExamGenie – Key Concepts Prototype</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #222;
      padding: 2rem 1rem;
      min-height: 100vh;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header { text-align: center; color: white; margin-bottom: 2rem; }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .test-info { background: rgba(255,255,255,0.2); padding: 1rem; border-radius: 12px; margin-bottom: 2rem; }
    .test-info p { color: white; margin: 0.25rem 0; font-size: 0.9rem; }
    h2 { text-align: center; color: white; margin-bottom: 1.5rem; font-size: 1.8rem; }
    .concept-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .concept-card {
      background: white;
      padding: 1.5rem;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
    }
    .concept-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.2);
    }
    .concept-card[data-clicked="true"] {
      border: 2px solid #4CAF50;
    }
    .concept-card.mastered {
      border: 2px solid #4CAF50;
      background: #e8f5e9;
      transition: background 0.3s ease, border 0.3s ease;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 1rem;
      gap: 0.5rem;
    }
    h3 {
      font-size: 1.2rem;
      color: #333;
      line-height: 1.3;
      flex: 1;
    }
    .difficulty-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .difficulty-badge.foundational { background: #E3F2FD; color: #1976D2; }
    .difficulty-badge.intermediate { background: #FFF3E0; color: #F57C00; }
    .difficulty-badge.advanced { background: #FCE4EC; color: #C2185B; }
    .badge {
      font-weight: 600;
      color: #667eea;
      margin: 0.5rem 0;
      font-size: 0.95rem;
    }
    .category, .related-questions {
      color: #666;
      font-size: 0.85rem;
      margin: 0.25rem 0;
    }
    .expand-btn {
      margin-top: 1rem;
      padding: 0.6rem 1.2rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      width: 100%;
      transition: background 0.2s;
    }
    .expand-btn:hover { background: #5568d3; }
    .definition {
      margin-top: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    .definition p { margin: 0.5rem 0; line-height: 1.6; }
    .definition-text { color: #333; }
    .hint { color: #555; font-style: italic; }
    .hidden { display: none; }
    .progress {
      text-align: center;
      font-weight: bold;
      font-size: 1.1rem;
      margin-bottom: 1rem;
      color: white;
    }
    #completion-banner {
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      padding: 2rem;
      border-radius: 16px;
      text-align: center;
      font-size: 1.5rem;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
      animation: fadeIn 1s ease forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .stats-bar {
      background: rgba(255,255,255,0.95);
      padding: 1rem;
      border-radius: 12px;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .stat { text-align: center; }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: #667eea; }
    .stat-label { font-size: 0.85rem; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🎓 ExamGenie Key Concepts</h1>
      <p>Interactive Prototype – Click cards to learn!</p>
    </header>

    <div class="test-info">
      <p><strong>Test Version:</strong> v1.2</p>
      <p><strong>Model:</strong> ${testConfig.model} (temperature: ${testConfig.temperature})</p>
      <p><strong>Questions Generated:</strong> ${testConfig.question_count}</p>
      <p><strong>Concepts Extracted:</strong> ${concepts.length}</p>
    </div>

    <div class="stats-bar">
      <div class="stat">
        <div class="stat-value" id="clicked-count">0</div>
        <div class="stat-label">Concepts Learned</div>
      </div>
      <div class="stat">
        <div class="stat-value">${concepts.length}</div>
        <div class="stat-label">Total Concepts</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="progress-percent">0%</div>
        <div class="stat-label">Progress</div>
      </div>
    </div>

    <section id="key-concepts">
      <h2>Avainkäsitteet</h2>
      <p id="progress" class="progress">0/${concepts.length} käsitettä opittu</p>
      <div class="concept-grid">${cards}</div>
      <div id="completion-banner" class="hidden">
        🎉 Onneksi olkoon! Olet oppinut kaikki avainkäsitteet!
      </div>
    </section>
  </div>

  <script>
    function toggleDefinition(btn) {
      const card = btn.parentElement;
      const def = btn.nextElementSibling;
      const wasHidden = def.classList.contains('hidden');

      def.classList.toggle('hidden');

      // Mark card as mastered on first click
      if (wasHidden && !card.classList.contains('mastered')) {
        card.classList.add('mastered');
        card.dataset.clicked = "true";
        updateProgress();
      }

      btn.textContent = wasHidden ? 'Piilota selitys' : 'Näytä selitys';
    }

    function updateProgress() {
      const all = document.querySelectorAll('.concept-card');
      const mastered = document.querySelectorAll('.concept-card[data-clicked="true"]');
      const progress = Math.round((mastered.length / all.length) * 100);

      // Update stats bar
      document.getElementById('clicked-count').textContent = mastered.length;
      document.getElementById('progress-percent').textContent = progress + '%';

      // Update progress text
      document.getElementById('progress').textContent = mastered.length + '/' + all.length + ' käsitettä opittu';

      // Show completion banner if all mastered
      if (mastered.length === all.length) {
        document.getElementById('completion-banner').classList.remove('hidden');
        confettiEffect();
      }
    }

    // Optional: simple confetti animation
    function confettiEffect() {
      const banner = document.getElementById('completion-banner');
      banner.innerHTML += ' 🏆';
      banner.style.background = 'linear-gradient(135deg, #4CAF50, #66BB6A)';
    }
  </script>
</body>
</html>`;
}

async function validateGamifiedResponse(parsed: any): Promise<{
  valid: boolean;
  issues: string[];
  stats: {
    questionCount: number;
    summaryWordCount: number;
    keyConceptsCount: number;
    hasGamification: boolean;
    difficultyDistribution: Record<string, number>;
    questionCoverage: number;
    unreferencedQuestions: number[];
    categoryDistribution: Record<string, number>;
    hasBossQuestionVariants: boolean;
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

  // Validate summary object (same as before)
  let totalSummaryWords = 0;
  if (!parsed.summary) {
    issues.push('❌ Missing summary object');
    valid = false;
  } else {
    const sections = ['introduction', 'key_concepts', 'examples_and_applications', 'summary_conclusion'];
    for (const section of sections) {
      if (!parsed.summary[section]) {
        issues.push(`❌ Missing summary.${section}`);
        valid = false;
      } else {
        const wordCount = await countWords(parsed.summary[section]);
        totalSummaryWords += wordCount;
      }
    }
  }

  // Validate key_concepts array
  const difficultyDistribution: Record<string, number> = {
    foundational: 0,
    intermediate: 0,
    advanced: 0
  };
  const categoryDistribution: Record<string, number> = {};

  let keyConceptsCount = 0;
  const referencedQuestionIds = new Set<number>();

  if (!parsed.key_concepts || !Array.isArray(parsed.key_concepts)) {
    issues.push('❌ Missing or invalid key_concepts array');
    valid = false;
  } else {
    keyConceptsCount = parsed.key_concepts.length;

    if (keyConceptsCount < EXPECTED_KEY_CONCEPTS_MIN) {
      issues.push(`⚠️  Too few key concepts: ${keyConceptsCount} (expected: ${EXPECTED_KEY_CONCEPTS_MIN}-${EXPECTED_KEY_CONCEPTS_MAX})`);
      valid = false;
    } else if (keyConceptsCount > EXPECTED_KEY_CONCEPTS_MAX) {
      issues.push(`⚠️  Too many key concepts: ${keyConceptsCount} (expected: ${EXPECTED_KEY_CONCEPTS_MIN}-${EXPECTED_KEY_CONCEPTS_MAX})`);
    } else {
      issues.push(`✅ Key concepts count: ${keyConceptsCount} (within expected range)`);
    }

    // Validate each concept
    parsed.key_concepts.forEach((concept: any, idx: number) => {
      const requiredFields = ['concept_name', 'definition', 'difficulty', 'category', 'related_question_ids', 'badge_title', 'mini_game_hint'];
      const missingFields = requiredFields.filter(field => !concept[field]);

      if (missingFields.length > 0) {
        issues.push(`❌ Concept ${idx + 1} missing fields: ${missingFields.join(', ')}`);
        valid = false;
      }

      // Validate difficulty
      if (concept.difficulty && !['foundational', 'intermediate', 'advanced'].includes(concept.difficulty)) {
        issues.push(`⚠️  Concept ${idx + 1} has invalid difficulty: "${concept.difficulty}"`);
      } else if (concept.difficulty) {
        difficultyDistribution[concept.difficulty]++;
      }

      // Track and validate category
      if (concept.category) {
        categoryDistribution[concept.category] = (categoryDistribution[concept.category] || 0) + 1;

        // Validate category length (1-2 words)
        const categoryWords = concept.category.trim().split(/\s+/).length;
        if (categoryWords > 2) {
          issues.push(`⚠️  Concept ${idx + 1} category has ${categoryWords} words (expected: 1-2)`);
        }
      }

      // Validate related_question_ids
      if (concept.related_question_ids && Array.isArray(concept.related_question_ids)) {
        concept.related_question_ids.forEach((qid: number) => {
          if (qid < 1 || qid > EXAM_QUESTION_COUNT) {
            issues.push(`⚠️  Concept ${idx + 1} references invalid question ID: ${qid}`);
          } else {
            referencedQuestionIds.add(qid);
          }
        });
      }

      // Validate concept_name length (2-5 words)
      if (concept.concept_name) {
        const wordCount = concept.concept_name.trim().split(/\s+/).length;
        if (wordCount < 2 || wordCount > 5) {
          issues.push(`⚠️  Concept ${idx + 1} name has ${wordCount} words (expected: 2-5)`);
        }
      }
    });
  }

  // Check question coverage
  const allQuestionIds = Array.from({ length: EXAM_QUESTION_COUNT }, (_, i) => i + 1);
  const unreferencedQuestions = allQuestionIds.filter(id => !referencedQuestionIds.has(id));
  const questionCoverage = Math.round((referencedQuestionIds.size / EXAM_QUESTION_COUNT) * 100);

  if (unreferencedQuestions.length > 0) {
    issues.push(`⚠️  ${unreferencedQuestions.length} questions not referenced in any concept: [${unreferencedQuestions.join(', ')}]`);
  }

  // Validate gamification object
  let hasGamification = false;
  let hasBossQuestionVariants = false;

  if (!parsed.gamification) {
    issues.push('❌ Missing gamification object');
    valid = false;
  } else {
    const requiredFields = ['completion_message', 'boss_question_open', 'boss_question_multiple_choice', 'reward_text'];
    const missingFields = requiredFields.filter(field => !parsed.gamification[field]);

    if (missingFields.length > 0) {
      issues.push(`❌ Gamification missing fields: ${missingFields.join(', ')}`);
      valid = false;
    } else {
      hasGamification = true;

      // Validate boss_question_multiple_choice structure
      const mcq = parsed.gamification.boss_question_multiple_choice;
      if (!mcq.question || !mcq.options || !mcq.correct_answer) {
        issues.push('❌ boss_question_multiple_choice missing required fields (question, options, correct_answer)');
        valid = false;
      } else if (!Array.isArray(mcq.options) || mcq.options.length !== 4) {
        issues.push(`⚠️  boss_question_multiple_choice must have exactly 4 options (found: ${mcq.options?.length || 0})`);
        valid = false;
      } else if (!mcq.options.includes(mcq.correct_answer)) {
        issues.push('❌ boss_question_multiple_choice correct_answer must match one of the options');
        valid = false;
      } else {
        hasBossQuestionVariants = true;
        issues.push('✅ Gamification object complete with boss question variants');
      }
    }
  }

  const stats = {
    questionCount: parsed.questions?.length || 0,
    summaryWordCount: totalSummaryWords,
    keyConceptsCount,
    hasGamification,
    difficultyDistribution,
    questionCoverage,
    unreferencedQuestions,
    categoryDistribution,
    hasBossQuestionVariants
  };

  return { valid, issues, stats };
}

async function testGamifiedConceptGeneration() {
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
  console.log(`   Expected key concepts: ${EXPECTED_KEY_CONCEPTS_MIN}-${EXPECTED_KEY_CONCEPTS_MAX}`);
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
      const validation = await validateGamifiedResponse(parsed);

      console.log('\n📋 Validation Results:');
      validation.issues.forEach(issue => console.log(`   ${issue}`));

      console.log('\n📊 Statistics:');
      console.log(`   Questions: ${validation.stats.questionCount}`);
      console.log(`   Summary words: ${validation.stats.summaryWordCount}`);
      console.log(`   Key concepts: ${validation.stats.keyConceptsCount}`);
      console.log(`   Question coverage: ${validation.stats.questionCoverage}%`);
      console.log(`   Gamification: ${validation.stats.hasGamification ? '✅' : '❌'}`);

      console.log('\n🎯 Difficulty Distribution:');
      console.log(`   Foundational: ${validation.stats.difficultyDistribution.foundational}`);
      console.log(`   Intermediate: ${validation.stats.difficultyDistribution.intermediate}`);
      console.log(`   Advanced: ${validation.stats.difficultyDistribution.advanced}`);

      console.log('\n📂 Category Distribution:');
      const categoryEntries = Object.entries(validation.stats.categoryDistribution || {});
      if (categoryEntries.length > 0) {
        categoryEntries.forEach(([cat, count]) => {
          console.log(`   ${cat}: ${count} concepts`);
        });
      } else {
        console.log('   No categories found');
      }

      console.log(`\n   Boss Question Variants: ${validation.stats.hasBossQuestionVariants ? '✅' : '❌'}`);
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

      // Show sample key concept
      if (parsed.key_concepts && parsed.key_concepts.length > 0) {
        const sampleConcept = parsed.key_concepts[0];
        console.log('\n🎓 Sample Key Concept:');
        console.log(`   Name: ${sampleConcept.concept_name}`);
        console.log(`   Category: ${sampleConcept.category || 'not specified'}`);
        console.log(`   Definition: ${sampleConcept.definition}`);
        console.log(`   Difficulty: ${sampleConcept.difficulty}`);
        console.log(`   Related Questions: [${sampleConcept.related_question_ids?.join(', ')}]`);
        console.log(`   Badge: "${sampleConcept.badge_title}"`);
        console.log(`   Mini-game Hint: "${sampleConcept.mini_game_hint}"`);
      }

      // Show all badge titles
      if (parsed.key_concepts && parsed.key_concepts.length > 0) {
        console.log('\n🏆 All Badge Titles:');
        parsed.key_concepts.forEach((concept: any, idx: number) => {
          console.log(`   ${idx + 1}. ${concept.badge_title}`);
        });
      }

      // Show gamification data
      if (parsed.gamification) {
        console.log('\n🎮 Gamification Data:');
        console.log(`   Completion: "${parsed.gamification.completion_message}"`);
        console.log(`   Boss Question (Open): "${parsed.gamification.boss_question_open}"`);

        // Display boss question multiple choice
        if (parsed.gamification.boss_question_multiple_choice) {
          const mcq = parsed.gamification.boss_question_multiple_choice;
          console.log(`   Boss Question (MC): "${mcq.question}"`);
          if (mcq.options && Array.isArray(mcq.options)) {
            mcq.options.forEach((opt: string, i: number) => {
              const letter = String.fromCharCode(65 + i);
              const isCorrect = opt === mcq.correct_answer ? ' ✓' : '';
              console.log(`     ${letter}) ${opt}${isCorrect}`);
            });
          }
        }

        console.log(`   Reward: "${parsed.gamification.reward_text}"`);
      }

      // Show summary preview
      if (parsed.summary) {
        console.log('\n📄 Summary Preview:');
        if (parsed.summary.introduction) {
          const preview = parsed.summary.introduction.substring(0, 150);
          console.log(`   Introduction: ${preview}...`);
        }
        console.log(`   Language: ${parsed.summary.language || 'not specified'}`);
      }

      // Save full results to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputPath = path.join(__dirname, 'prompttests', `test-gamified-concepts-v1.2-${timestamp}.json`);

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
          expected_key_concepts: `${EXPECTED_KEY_CONCEPTS_MIN}-${EXPECTED_KEY_CONCEPTS_MAX}`,
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

      // Generate HTML prototype for Key Concepts
      if (parsed.key_concepts && parsed.key_concepts.length > 0) {
        console.log('\n🎨 Generating HTML prototype...');

        const htmlOutput = generateConceptHTML(parsed.key_concepts, {
          model: MODEL_NAME,
          temperature: TEMPERATURE,
          question_count: EXAM_QUESTION_COUNT
        });

        // Ensure output directory exists
        const htmlOutputDir = path.join(__dirname, 'output');
        if (!fs.existsSync(htmlOutputDir)) {
          fs.mkdirSync(htmlOutputDir, { recursive: true});
        }

        const htmlPath = path.join(htmlOutputDir, `key-concepts-${timestamp}.html`);
        fs.writeFileSync(htmlPath, htmlOutput, 'utf-8');

        console.log(`✅ HTML prototype saved to: output/${path.basename(htmlPath)}`);
        console.log(`   Open in browser: file://${htmlPath}`);
      }

      // Final summary
      console.log('\n' + '='.repeat(80));
      if (validation.valid) {
        console.log('✅ TEST PASSED - Ready for integration!');
        console.log(`📊 Generated:`);
        console.log(`   - ${validation.stats.questionCount} questions`);
        console.log(`   - ${validation.stats.summaryWordCount} word summary`);
        console.log(`   - ${validation.stats.keyConceptsCount} key concepts`);
        console.log(`   - ${validation.stats.questionCoverage}% question coverage`);
        console.log(`   - Gamification data complete`);
        if (usageMetadata) {
          const totalCost = ((usageMetadata.promptTokenCount / 1_000_000) * 0.10 + (usageMetadata.candidatesTokenCount / 1_000_000) * 0.40);
          console.log(`💰 Cost: $${totalCost.toFixed(6)}`);
        }
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
      const errorPath = path.join(__dirname, 'prompttests', `test-gamified-concepts-v1.2-ERROR-${timestamp}.txt`);
      fs.writeFileSync(errorPath, text);
      console.log(`\n💾 Raw response saved to: ${path.basename(errorPath)}`);
    }

  } catch (error) {
    console.error('\n❌ Gemini API Error:', error);
    throw error;
  }
}

// Run the test
console.log('🚀 Starting Gamified Key Concepts Test');
console.log('='.repeat(80));
testGamifiedConceptGeneration().catch(console.error);
