/**
 * Test Math Audio Summary Generation
 *
 * Tests Gemini's ability to generate:
 * 1. Math exam questions (15 multiple choice with LaTeX)
 * 2. Audio summary with SPOKEN math notation (no LaTeX)
 * 3. Guided reflections with pause metadata
 *
 * Output validation:
 * - Questions: LaTeX notation REQUIRED ($x^2$, \frac{}, etc.)
 * - Audio summary: NO LaTeX (spoken form: "x squared", "pi times r squared")
 * - Guided reflections: 2-3 items with pause_seconds metadata
 * - TTS compatibility: Test actual audio generation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ttsService, TTSService } from './src/lib/services/tts-service';
import { safeJsonParse } from './src/lib/utils/json-handler';

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
const GRADE = 8;
const EXPECTED_AUDIO_WORDS_MIN = 600;
const EXPECTED_AUDIO_WORDS_MAX = 1000;
const EXPECTED_REFLECTIONS_MIN = 2;
const EXPECTED_REFLECTIONS_MAX = 3;

// Math prompt with audio summary injection - LANGUAGE AGNOSTIC VERSION
// Based on config.ts getMathPrompt() with added audio_summary field
// NO hardcoded language - detects from source material
const getMathAudioPrompt = (grade: number): string => {
  return `⚠️ CRITICAL - LANGUAGE DETECTION FIRST ⚠️

BEFORE ANYTHING ELSE:
1. Look at the textbook images and identify the SOURCE LANGUAGE
2. If you see "Addiere", "Subtrahiere", "Multipliziere" → German
3. If you see "Lisää", "Vähennä", "Kerro" → Finnish
4. If you see "Add", "Subtract", "Multiply" → English
5. ALL your output MUST be in that SAME detected language

LANGUAGE RULE: Questions, explanations, AND audio_summary sections MUST ALL match the source material language.
DO NOT use Finnish if the source is German. DO NOT use English if the source is Finnish.

ROLE: You are an expert mathematics teacher creating exam questions for grade ${grade} students.

CONTEXT: You are analyzing textbook images containing mathematical content. The images may show:
- Algebraic expressions and equations
- Rational expressions (fractions with variables)
- Exponential expressions and powers
- Geometric problems and measurements
- Word problems with real-world context

CRITICAL - CONTENT ANALYSIS:
Before generating questions, analyze the material shown:
1. **Detect the topic**: Identify the specific mathematical concepts (e.g., "rational expressions", "exponents", "linear equations", "geometry")
2. **Assess difficulty**: Note the actual complexity level shown in the images
3. **Identify problem types**: computational, simplification, word problems, conceptual understanding

CRITICAL - DO NOT COPY EXERCISES DIRECTLY:
The textbook shows sub-exercises labeled (a, b, c, d). DO NOT convert these directly into multiple choice questions.
Instead, CREATE NEW ORIGINAL questions that test the SAME SKILLS at the SAME DIFFICULTY LEVEL.

FORBIDDEN (poor pedagogy):
❌ Question: "Calculate $10^1$" with answer "$10^1$" (this is nonsense - answer must be the VALUE)
❌ Directly copying sub-parts (a, b, c, d) from textbook as separate questions
❌ Questions where multiple options are correct
❌ Pure mechanical calculation without understanding

TASK: Generate ${EXAM_QUESTION_COUNT} exam questions following this distribution:

QUESTION TYPE DISTRIBUTION:
1. Computational questions (6): Ask for NUMERICAL VALUE answers
   - Example: "Calculate $10^3$" → Answer: "1000" (NOT "$10^3$")
   - For geometry: "Calculate the sector area..." → Answer: "19.8 cm²"

2. Formula application / Simplification questions (4): **ADAPT TO CONTENT**
   - For algebra/exponents: "Simplify $a^3 \\cdot a^5$" → Answer: "$a^8$" (wrap in $ delimiters)
   - For division: "Simplify $\\frac{b^{12}}{b^4}$" → Options: "$b^8$", "$b^{16}$", "$b^3$", "$\\frac{1}{b^8}$"
   - For geometry: "Apply the sector area formula to find..." → Answer: numerical result
   - For equations: "Solve for x in..." → Answer: "$x = 5$"

3. Word problems (3): Real-world applications
   - Population growth, money/interest, technology, scientific notation
   - For geometry: angle of view, circular arc measurements, practical applications
   - Must require calculation, not just pattern recognition

4. Conceptual questions (2): Test understanding (adapt to topic)
   - For exponents: "Why is any number to the power of 0 equal to 1?"
   - For fractions: "Why must fractions have a common denominator before adding?"
   - For geometry: "Which formula correctly calculates sector area?" or "Explain the relationship between arc length and central angle"

ANSWER FORMAT RULES:
- For "Calculate" questions: Options MUST be NUMBERS
- For "Simplify" questions: Options MUST be SIMPLIFIED expressions
- Wrong options should represent COMMON STUDENT ERRORS

GOOD DISTRACTORS (represent common student errors):
Exponents: $(-2)^3 = -8$ → wrong: "8" (forgot sign), "-6" (multiplied not exponentiated)
Fractions: "$\\frac{x}{6} - \\frac{5}{3}$" → wrong: "$\\frac{x-5}{3}$" (subtracted denominators)
Geometry: Sector area 19,6 cm² → wrong: 39,2 cm² (forgot sector fraction), 31,4 cm² (confused with arc)
NOTE: Wrap all \\frac, \\cdot in $...$

MATHEMATICAL NOTATION FOR QUESTIONS:
- Math mode ($...$) for EXPRESSIONS ONLY, not plain decimals: "8,9 m" not "$8,9 m$"
- LaTeX commands MUST wrap in $...$: "$\\frac{1}{b^8}$" renders, "\\frac{1}{b^8}" shows raw code
- Operators: $\\cdot$ (multiply), $\\frac{a}{b}$ (fractions), $\\alpha$/$\\beta$/$\\pi$ (Greek), ° (degrees)

JSON ESCAPING: Double all backslashes in JSON strings. Example: LaTeX \\frac becomes JSON \\\\frac which renders as "$\\frac{1}{2}$"

OUTPUT FORMAT:
You MUST respond with valid JSON following this schema:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Clear question with LaTeX notation",
      "options": [
        "First option",
        "Second option",
        "Third option",
        "Fourth option"
      ],
      "correct_answer": "First option",
      "explanation": "CONCISE explanation in the SAME language as source material (1-3 sentences max) covering why this is correct and common errors"
    }
  ],
  "audio_summary": {
    "overview": "[100-200 word overview in the same language as source material: What mathematical concepts does this chapter cover and why are they important?]",
    "key_ideas": "[200-350 words explaining the main formulas and concepts using SPOKEN MATH notation - see requirements below]",
    "applications": "[150-250 words on real-world applications and when students would use these concepts]",
    "common_mistakes": "[150-200 words covering typical errors students make and how to avoid them]",
    "guided_reflections": [
      {
        "question": "[Thought-provoking question posed conversationally]",
        "pause_seconds": 5,
        "short_answer": "[Concise 1-2 sentence answer or hint]"
      }
    ],
    "total_word_count": [approximate total word count across all sections],
    "estimated_duration_seconds": [approximate audio duration],
    "language": "[ISO 639-1 language code]"
  },
  "topic": "Detected mathematics topic",
  "grade": ${grade}
}

AUDIO SUMMARY REQUIREMENTS (for TTS conversion):
This summary will be converted to AUDIO using Text-to-Speech, so special formatting is required.

CRITICAL - SPOKEN MATH NOTATION:
LaTeX symbols CANNOT be spoken by TTS. Convert ALL mathematical notation to spoken language in the SOURCE LANGUAGE:

**Finnish examples:**
- "$x^2$" → "x toiseen"
- "$x^3$" → "x kolmanteen"
- "$\\pi r^2$" → "pii kertaa r toiseen"
- "$\\frac{a}{b}$" → "a per b" or "a jaettuna b:llä"
- "$\\sqrt{x}$" → "neliöjuuri x:stä"
- Operators: "plus", "miinus", "kertaa", "jaettuna"
- Decimals: "nolla pilkku viisi" (0.5)

**German examples:**
- "$x^2$" → "x Quadrat" or "x hoch zwei"
- "$x^3$" → "x hoch drei"
- "$\\pi r^2$" → "pi mal r Quadrat"
- "$\\frac{a}{b}$" → "a durch b" or "a geteilt durch b"
- "$\\sqrt{x}$" → "Wurzel aus x" or "Quadratwurzel von x"
- Operators: "plus", "minus", "mal", "geteilt durch"
- Decimals: "null Komma fünf" (0,5)

**English examples:**
- "$x^2$" → "x squared"
- "$x^3$" → "x cubed" or "x to the power of 3"
- "$\\pi r^2$" → "pi times r squared"
- "$\\frac{a}{b}$" → "a over b" or "a divided by b"
- "$\\sqrt{x}$" → "square root of x"
- Operators: "plus", "minus", "times", "divided by"
- Decimals: "zero point five" (0.5)

RULE: NO dollar signs ($), NO backslashes (\\), NO curly braces in audio_summary sections

SECTION GUIDELINES (use detected source language):
1. **overview** (100-200 words):
   - Introduce the topic conversationally
   - Finnish: "Tässä luvussa opimme..."
   - German: "In diesem Kapitel lernen wir..."
   - English: "In this chapter, we learn..."
   - Explain why this matters in mathematics
   - Set expectations for what students will understand

2. **key_ideas** (200-350 words):
   - Explain main formulas using SPOKEN notation only (see examples above)
   - Finnish: "Potenssien kertolaskussa lasketaan eksponentit yhteen"
   - German: "Beim Multiplizieren von Potenzen addiert man die Exponenten"
   - English: "When multiplying powers, add the exponents"
   - Walk through ONE concrete example step-by-step
   - Teacher-like, supportive tone

3. **applications** (150-250 words):
   - Real-world contexts where these concepts appear
   - Practical problems students encounter
   - Connect math to everyday life

4. **common_mistakes** (150-200 words):
   - List 2-3 frequent student errors
   - Explain WHY these errors happen
   - Give tips to avoid them

5. **guided_reflections** (2-3 reflections, array format):
   - Each reflection has 3 fields: question, pause_seconds, short_answer
   - Format: Question → Pause → Brief answer/hint (all in SOURCE language with SPOKEN math)
   - pause_seconds: 3-8 seconds (time for student to think)
   - Total per reflection: <20 seconds when spoken
   - Example reflections:

     Finnish:
     {
       "question": "Mieti hetki: miksi mikä tahansa luku potenssiin nolla on yksi?",
       "pause_seconds": 5,
       "short_answer": "Koska potenssien jakolaskussa eksponentit vähennetään. Esimerkiksi kaksi potenssiin kolme jaettuna kahdella potenssiin kolme on yksi."
     }

     German:
     {
       "question": "Denke kurz nach: Warum ist jede Zahl hoch null gleich eins?",
       "pause_seconds": 5,
       "short_answer": "Weil beim Dividieren von Potenzen die Exponenten subtrahiert werden. Zum Beispiel: zwei hoch drei geteilt durch zwei hoch drei ist eins."
     }

     English:
     {
       "question": "Think for a moment: why is any number to the power of zero equal to one?",
       "pause_seconds": 5,
       "short_answer": "Because when dividing powers, we subtract exponents. For example, two to the power of three divided by two to the power of three equals one."
     }

   - Keep answers concise (1-2 sentences) with SPOKEN math notation
   - Limit to 2-3 reflections total to maintain engagement
   - NO LaTeX symbols in short_answer field

TARGET LENGTH: 600-1000 words total (approximately 2.5-4 minutes at 0.8x speaking rate)

ESTIMATED DURATION: Calculate based on ~150 words per minute at 0.8x speed, plus pause_seconds from guided_reflections

TONE: Friendly mathematics teacher speaking directly to student - conversational, clear, encouraging

EXPLANATIONS FOR QUESTIONS: Max 3 sentences/500 chars. State formula + ONE example + ONE common error. No repetition/loops.

QUALITY REQUIREMENTS:
□ Questions test understanding, not just memorization
□ Mix of computational and conceptual questions
□ Progressive difficulty (easy → medium → hard)
□ Each question tests a DIFFERENT skill or concept
□ Only ONE correct answer per question
□ correct_answer EXACTLY matches one option
□ ALL questions in the SAME language as source material (detected from images)
□ ALL explanations in the SAME language as questions
□ No references to images or page numbers in questions
□ Audio summary has NO LaTeX notation (spoken form only)
□ Audio summary is in SAME language as questions and source material
□ Guided reflections use SPOKEN math notation (no LaTeX)
□ Clear and unambiguous wording

Begin generating the exam and audio summary now.`;
};

async function countWords(text: string): Promise<number> {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

async function validateMathAudioResponse(parsed: any): Promise<{
  valid: boolean;
  issues: string[];
  stats: {
    questionCount: number;
    audioWordCount: number;
    reflectionsCount: number;
    hasLatexInQuestions: boolean;
    hasLatexInAudio: boolean;
    estimatedDurationSeconds: number;
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

  // Check for LaTeX in questions (REQUIRED)
  let hasLatexInQuestions = false;
  if (parsed.questions) {
    const questionsText = JSON.stringify(parsed.questions);
    hasLatexInQuestions = questionsText.includes('$');
    if (hasLatexInQuestions) {
      issues.push('✅ Questions contain LaTeX notation (as expected)');
    } else {
      issues.push('⚠️  Questions missing LaTeX notation');
    }
  }

  // Validate audio_summary object
  let audioWordCount = 0;
  let hasLatexInAudio = false;
  let reflectionsCount = 0;
  let estimatedDurationSeconds = 0;

  if (!parsed.audio_summary) {
    issues.push('❌ Missing audio_summary object');
    valid = false;
  } else {
    const summary = parsed.audio_summary;
    const sections = ['overview', 'key_ideas', 'applications', 'common_mistakes'];

    // Check each text section
    for (const section of sections) {
      if (!summary[section]) {
        issues.push(`❌ Missing audio_summary.${section}`);
        valid = false;
      } else {
        const wordCount = await countWords(summary[section]);
        audioWordCount += wordCount;
      }
    }

    // Check for LaTeX in audio summary (FORBIDDEN)
    const audioText = sections.map(s => summary[s] || '').join(' ');
    hasLatexInAudio = audioText.includes('$') || audioText.includes('\\frac') || audioText.includes('\\cdot');

    if (hasLatexInAudio) {
      issues.push('❌ Audio summary contains LaTeX notation (must use spoken form)');
      valid = false;
    } else {
      issues.push('✅ Audio summary uses spoken notation (no LaTeX)');
    }

    // Validate guided_reflections
    if (!summary.guided_reflections || !Array.isArray(summary.guided_reflections)) {
      issues.push('❌ Missing or invalid guided_reflections array');
      valid = false;
    } else {
      reflectionsCount = summary.guided_reflections.length;

      if (reflectionsCount < EXPECTED_REFLECTIONS_MIN || reflectionsCount > EXPECTED_REFLECTIONS_MAX) {
        issues.push(`⚠️  Expected ${EXPECTED_REFLECTIONS_MIN}-${EXPECTED_REFLECTIONS_MAX} reflections, got ${reflectionsCount}`);
      } else {
        issues.push(`✅ Guided reflections count: ${reflectionsCount} (within range)`);
      }

      // Validate each reflection
      summary.guided_reflections.forEach((reflection: any, idx: number) => {
        const requiredFields = ['question', 'pause_seconds', 'short_answer'];
        const missingFields = requiredFields.filter(field => !reflection[field]);

        if (missingFields.length > 0) {
          issues.push(`❌ Reflection ${idx + 1} missing fields: ${missingFields.join(', ')}`);
          valid = false;
        }

        // Validate pause_seconds range
        if (reflection.pause_seconds && (reflection.pause_seconds < 3 || reflection.pause_seconds > 8)) {
          issues.push(`⚠️  Reflection ${idx + 1} pause_seconds (${reflection.pause_seconds}) outside recommended range (3-8)`);
        }
      });
    }

    // Validate word count
    if (audioWordCount < EXPECTED_AUDIO_WORDS_MIN) {
      issues.push(`⚠️  Audio summary too short: ${audioWordCount} words (expected: ${EXPECTED_AUDIO_WORDS_MIN}-${EXPECTED_AUDIO_WORDS_MAX})`);
    } else if (audioWordCount > EXPECTED_AUDIO_WORDS_MAX) {
      issues.push(`⚠️  Audio summary too long: ${audioWordCount} words (expected: ${EXPECTED_AUDIO_WORDS_MIN}-${EXPECTED_AUDIO_WORDS_MAX})`);
    } else {
      issues.push(`✅ Audio word count: ${audioWordCount} words (within range)`);
    }

    // Check metadata fields
    if (!summary.language) {
      issues.push('⚠️  Missing audio_summary.language field');
    }

    if (!summary.total_word_count) {
      issues.push('⚠️  Missing audio_summary.total_word_count field');
    }

    if (summary.estimated_duration_seconds) {
      estimatedDurationSeconds = summary.estimated_duration_seconds;
    }
  }

  const stats = {
    questionCount: parsed.questions?.length || 0,
    audioWordCount,
    reflectionsCount,
    hasLatexInQuestions,
    hasLatexInAudio,
    estimatedDurationSeconds
  };

  return { valid, issues, stats };
}

async function testMathAudioSummary() {
  console.log('🔧 Initializing Gemini API...');
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: TEMPERATURE
    }
  });

  // Load test images from math_8th_grade (Finnish textbook)
  const imagesDir = path.join(__dirname, 'assets/images/math_8th_grade');
  const imageFiles = [
    'algebra.jpg',
    'potenssi.JPG',
    'jakolasku.JPG'
  ];

  const imagePaths = imageFiles.map(file => path.join(imagesDir, file));

  console.log(`📸 Loading ${imagePaths.length} test images from ${path.basename(imagesDir)}:`);

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

  const prompt = getMathAudioPrompt(GRADE);

  console.log('\n📝 Prompt Configuration:');
  console.log(`   Grade: ${GRADE}`);
  console.log(`   Questions: ${EXAM_QUESTION_COUNT}`);
  console.log(`   Expected audio length: ${EXPECTED_AUDIO_WORDS_MIN}-${EXPECTED_AUDIO_WORDS_MAX} words`);
  console.log(`   Expected reflections: ${EXPECTED_REFLECTIONS_MIN}-${EXPECTED_REFLECTIONS_MAX}`);
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

    // Try to parse as JSON using safe parser
    console.log('\n📊 Parsing response...');

    const parseResult = safeJsonParse(text);

    if (!parseResult.success) {
      console.error(`\n❌ Failed to parse JSON: ${parseResult.error}`);
      console.log('\n📄 Raw response (first 500 chars):');
      console.log(text.substring(0, 500));

      // Save raw response for debugging
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const errorPath = path.join(__dirname, 'prompttests', `test-math-audio-ERROR-${timestamp}.txt`);
      fs.writeFileSync(errorPath, text);
      console.log(`\n💾 Raw response saved to: ${path.basename(errorPath)}`);
      return;
    }

    try {
      const parsed = parseResult.data;

      console.log('✅ Valid JSON response');

      // Validate response structure
      const validation = await validateMathAudioResponse(parsed);

      console.log('\n📋 Validation Results:');
      validation.issues.forEach(issue => console.log(`   ${issue}`));

      console.log('\n📊 Statistics:');
      console.log(`   Questions: ${validation.stats.questionCount}`);
      console.log(`   Audio words: ${validation.stats.audioWordCount}`);
      console.log(`   Guided reflections: ${validation.stats.reflectionsCount}`);
      console.log(`   LaTeX in questions: ${validation.stats.hasLatexInQuestions ? '✅' : '❌'}`);
      console.log(`   LaTeX in audio: ${validation.stats.hasLatexInAudio ? '❌ (BAD)' : '✅ (GOOD)'}`);
      if (validation.stats.estimatedDurationSeconds > 0) {
        console.log(`   Estimated duration: ${validation.stats.estimatedDurationSeconds}s (~${Math.round(validation.stats.estimatedDurationSeconds / 60)} min)`);
      }
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

      // Show audio summary previews
      if (parsed.audio_summary) {
        console.log('\n🎧 Audio Summary Previews:');

        if (parsed.audio_summary.overview) {
          const preview = parsed.audio_summary.overview.substring(0, 150);
          console.log(`\n   Overview (first 150 chars):`);
          console.log(`   ${preview}...`);
        }

        if (parsed.audio_summary.key_ideas) {
          const preview = parsed.audio_summary.key_ideas.substring(0, 150);
          console.log(`\n   Key Ideas (first 150 chars):`);
          console.log(`   ${preview}...`);
        }

        if (parsed.audio_summary.guided_reflections && parsed.audio_summary.guided_reflections.length > 0) {
          console.log(`\n   Sample Guided Reflection:`);
          const reflection = parsed.audio_summary.guided_reflections[0];
          console.log(`   Q: ${reflection.question}`);
          console.log(`   Pause: ${reflection.pause_seconds}s`);
          console.log(`   A: ${reflection.short_answer}`);
        }

        console.log(`\n   Language: ${parsed.audio_summary.language || 'not specified'}`);
      }

      // Save full results to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputPath = path.join(__dirname, 'prompttests', `test-math-audio-${timestamp}.json`);

      // Ensure directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, JSON.stringify({
        test_config: {
          grade: GRADE,
          question_count: EXAM_QUESTION_COUNT,
          expected_audio_words: `${EXPECTED_AUDIO_WORDS_MIN}-${EXPECTED_AUDIO_WORDS_MAX}`,
          expected_reflections: `${EXPECTED_REFLECTIONS_MIN}-${EXPECTED_REFLECTIONS_MAX}`,
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

      // Test TTS generation with audio summary
      if (validation.valid && parsed.audio_summary) {
        console.log('\n🎤 Testing TTS generation...');

        try {
          // Combine all audio sections into one text
          const audioSections = [
            parsed.audio_summary.overview,
            parsed.audio_summary.key_ideas,
            parsed.audio_summary.applications,
            parsed.audio_summary.common_mistakes
          ];

          // Add guided reflections
          if (parsed.audio_summary.guided_reflections) {
            parsed.audio_summary.guided_reflections.forEach((reflection: any) => {
              audioSections.push(reflection.question);
              // TTS pause is handled by silence, not text
              audioSections.push(reflection.short_answer);
            });
          }

          const fullAudioText = audioSections.join('\n\n');

          console.log(`   Text length: ${fullAudioText.length} chars`);
          console.log(`   Byte length: ${Buffer.byteLength(fullAudioText, 'utf-8')} bytes`);

          // Check if within TTS limit (5000 bytes)
          if (Buffer.byteLength(fullAudioText, 'utf-8') > 5000) {
            console.log('   ⚠️  Text exceeds 5000-byte TTS limit, truncating...');
          }

          const languageCode = parsed.audio_summary.language || 'fi';
          const ttsLanguageCode = TTSService.getLanguageCodeForTTS(languageCode);

          console.log(`   Language: ${languageCode} → TTS: ${ttsLanguageCode}`);
          console.log('   Generating audio...');

          const audioResult = await ttsService.generateAudio(fullAudioText, {
            languageCode: ttsLanguageCode,
            audioEncoding: 'MP3',
            speakingRate: 0.8, // ExamGenie standard
            pitch: 0.0,
          });

          // Save audio file
          const audioOutputPath = path.join(__dirname, 'output', `test-math-audio-${timestamp}.mp3`);
          const audioOutputDir = path.dirname(audioOutputPath);
          if (!fs.existsSync(audioOutputDir)) {
            fs.mkdirSync(audioOutputDir, { recursive: true });
          }

          fs.writeFileSync(audioOutputPath, audioResult.audioBuffer);

          console.log(`\n   ✅ Audio generated successfully!`);
          console.log(`   Duration: ${audioResult.metadata.durationSeconds}s (~${Math.round(audioResult.metadata.durationSeconds / 60)} min)`);
          console.log(`   File size: ${(audioResult.metadata.fileSizeBytes / 1024).toFixed(1)} KB`);
          console.log(`   Voice: ${audioResult.metadata.voiceUsed}`);
          console.log(`   Saved to: output/${path.basename(audioOutputPath)}`);
          console.log(`\n   🎧 Listen to verify spoken math notation quality!`);

        } catch (ttsError) {
          console.error('\n   ❌ TTS generation failed:', ttsError);
        }
      }

      // Final summary
      console.log('\n' + '='.repeat(80));
      if (validation.valid) {
        console.log('✅ TEST PASSED - Math audio summary generation working!');
        console.log(`📊 Generated:`);
        console.log(`   - ${validation.stats.questionCount} questions with LaTeX`);
        console.log(`   - ${validation.stats.audioWordCount} word audio summary (spoken notation)`);
        console.log(`   - ${validation.stats.reflectionsCount} guided reflections`);
        if (usageMetadata) {
          const totalCost = ((usageMetadata.promptTokenCount / 1_000_000) * 0.10 + (usageMetadata.candidatesTokenCount / 1_000_000) * 0.40);
          console.log(`💰 Cost: $${totalCost.toFixed(6)}`);
        }
        console.log(`⏱️  Time: ${(duration / 1000).toFixed(1)}s`);
      } else {
        console.log('❌ TEST FAILED - Review issues above');
      }
      console.log('='.repeat(80));

    } catch (error) {
      console.error('\n❌ Validation or processing error:', error);
    }

  } catch (error) {
    console.error('\n❌ Gemini API Error:', error);
    throw error;
  }
}

// Run the test
console.log('🚀 Starting Math Audio Summary Test');
console.log('='.repeat(80));
testMathAudioSummary().catch(console.error);
