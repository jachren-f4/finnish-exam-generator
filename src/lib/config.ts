/**
 * Centralized configuration for the Gemini OCR application
 * All constants, limits, and environment-dependent values are managed here
 */

// Environment validation
const requiredEnvVars = ['GEMINI_API_KEY'] as const
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`${envVar} environment variable is required`)
  }
}

// Gemini AI Configuration
export const GEMINI_CONFIG = {
  MODEL_NAME: 'gemini-2.5-flash-lite',
  GENERATION_CONFIG: {
    temperature: 0, // Reduce hallucinations and improve source fidelity
  },
  PRICING: {
    INPUT_COST_PER_1M: 0.10,   // $0.10 per 1M input tokens (2025 rates)
    OUTPUT_COST_PER_1M: 0.40,  // $0.40 per 1M output tokens (2025 rates)
  },
} as const

// File Processing Configuration
export const FILE_CONFIG = {
  MAX_IMAGES: 20,              // Maximum images per request (updated from 5)
  TEMP_DIRECTORY: '/tmp',
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ],
  MIME_TYPE_MAP: {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', 
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.heic': 'image/heic',
    '.heif': 'image/heic'
  } as const,
  DEFAULT_MIME_TYPE: 'image/jpeg',
} as const

// Exam Generation Configuration
export const EXAM_CONFIG = {
  DEFAULT_QUESTION_COUNT: 15,
  QUESTION_TYPE_DISTRIBUTION: (count: number) => ({
    multiple_choice: Math.floor(count * 0.6),      // 60% - 9 questions
    short_answer: Math.floor(count * 0.2),         // 20% - 3 questions
    true_false: Math.ceil(count * 0.133),          // ~13% - 2 questions
    fill_in_blank: Math.floor(count * 0.067),      // ~7% - 1 question
  })
} as const

// Math Exam Configuration
export const MATH_EXAM_CONFIG = {
  DEFAULT_QUESTION_COUNT: 15,
  QUESTION_DISTRIBUTION: {
    computational: 6,           // Pure numerical calculation
    formula_simplification: 4,  // Apply or simplify correctly
    word_problems: 3,           // Realistic numeric applications
    conceptual: 2               // Reasoning or understanding
  },
  TEMPERATURE_RETRY_STRATEGY: [0, 0.3, 0.5],
  MAX_RETRY_ATTEMPTS: 3,
  VALIDATION_THRESHOLD: 90, // Minimum score to pass (out of 100)
  INFINITE_LOOP_DETECTION: {
    MAX_CHARS: 50000,
    REPEATED_PHRASE_THRESHOLD: 5,
    KNOWN_LOOP_PHRASE_THRESHOLD: 10
  }
} as const

// Grading Configuration
export const GRADING_CONFIG = {
  SCALE: '4-10' as const,
  GRADE_THRESHOLDS: {
    10: 90, // 90%+
    9: 80,  // 80-89%
    8: 70,  // 70-79%
    7: 60,  // 60-69%
    6: 50,  // 50-59%
    5: 40,  // 40-49%
    4: 0,   // Below 40%
  },
  PARTIAL_CREDIT_MULTIPLIER: 0.7, // 70% for partial answers
} as const

// Application URLs
export const APP_CONFIG = {
  BASE_URL: 'https://exam-generator.vercel.app',
  ENDPOINTS: {
    EXAM: (id: string) => `/exam/${id}`,
    GRADING: (id: string) => `/grading/${id}`,
  }
} as const

// Supabase Storage Configuration
export const STORAGE_CONFIG = {
  DIAGNOSTIC_BUCKET: 'diagnostic-images',
  DIAGNOSTIC_MODE_ENABLED: false, // Disabled for performance - OCR diagnostic step was taking 168 seconds
} as const

// Performance and Logging Configuration
export const PERFORMANCE_CONFIG = {
  TIMING_ENABLED: true,
  LOG_PREFIX: {
    GEMINI_OCR: '⏱️  [GEMINI-OCR]',
    GEMINI_PROCESS: '⏱️  [GEMINI-PROCESS]',
    EXAM_CREATE: '⏱️  [EXAM-CREATE]',
    TIMER: '⏱️  [TIMER]',
  }
} as const

// Rate Limiting Configuration
export const RATE_LIMIT_CONFIG = {
  HOURLY_LIMIT: parseInt(process.env.RATE_LIMIT_HOURLY || '10', 10),
  DAILY_LIMIT: parseInt(process.env.RATE_LIMIT_DAILY || '50', 10),
  ENABLED: process.env.RATE_LIMITING_ENABLED !== 'false', // Default: enabled
} as const

/**
 * Prompt Routing Logic:
 * - category: 'mathematics' → getMathPrompt() (LaTeX support, specialized validation)
 * - category: 'language_studies' → getLanguageStudiesPrompt() (auto-detect languages)
 * - category: 'core_academics' OR default → getCategoryAwarePrompt() (with summary for TTS)
 */

// Exam Generation Prompts
export const PROMPTS = {
  getCategoryAwarePrompt: (category: string, grade?: number, language: string = 'en') => {
    const categoryDescriptions = {
      mathematics: 'Mathematics and logic problems',
      core_academics: 'Science, history, geography, biology, physics, chemistry, environmental studies, or social studies',
      language_studies: 'Foreign language learning including vocabulary, grammar, translation, and comprehension'
    }

    return `Create a text-based exam from educational content for grade ${grade || 'appropriate'} students AND generate an educational summary.

CRITICAL CONSTRAINT: Students will NOT have access to any visual elements during the exam

Avoid:
- Visual references from the material, like images or page or chapter numbers
- References to graph, table, diagram, or coordinate systems
- Something that is factually untrue
- Something that is impossible to answer without the images
- Questions that aren't explicitly based on the source material

TARGET: Use the same language as the source material. Subject area: core academics.

TASK: Generate exactly ${EXAM_CONFIG.DEFAULT_QUESTION_COUNT} questions that test understanding of the educational concepts in the material.

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
    "introduction": "[100-250 word introduction to the topic in the same language as the source material]",
    "key_concepts": "[250-500 word explanation of main concepts in the same language]",
    "examples_and_applications": "[200-400 word section on practical examples and applications in the same language]",
    "summary_conclusion": "[100-250 word conclusion summarizing key takeaways in the same language]",
    "total_word_count": [approximate total word count],
    "language": "[ISO 639-1 language code, e.g., 'fi' for Finnish, 'en' for English]"
  }
}

SUMMARY REQUIREMENTS:
- Write in the SAME language as the source material
- Target audience: Grade ${grade || 'appropriate'} students
- Total length: ~1000 words (Gemini 2.5 Flash-Lite typical output)
- Structure: 4 sections as specified in the JSON format
- Educational tone: clear, pedagogical, age-appropriate
- Focus on reinforcing concepts from the exam questions
- Use proper formatting: **bold** for key terms, numbered lists where appropriate

IMPORTANT:
- The correct_answer field must contain the exact text from the options array
- The summary must be in the SAME language as the questions and source material
- Do not reference visual elements in the summary either`
  },

  getLanguageStudiesPrompt: (grade?: number, studentLanguage: string = 'en') => {
    return `Analyze the foreign language learning material and generate language exam questions.

IMPORTANT: This is a LANGUAGE LEARNING exam. The textbook contains foreign language content that students are learning.

Instructions:
1. DETECT the target language being taught by analyzing:
   - Character patterns and diacritical marks
   - Article usage and grammatical structures
   - Word patterns and linguistic features
   - Context clues from the educational material

2. DETECT the student's native language from any context clues in the material (instructions, translations, or explanations)

3. Extract vocabulary, grammar patterns, and phrases from the IDENTIFIED target language

4. Generate questions that test knowledge OF that specific target language

5. Use the detected student's native language for question instructions

6. Include the target language words/phrases being tested IN the questions

Return JSON:
{
  "subject_analysis": {
    "detected_subject": "Language being taught (detected from content)",
    "student_language_detected": "Native language detected from context",
    "confidence": 0.9,
    "topics_found": ["vocabulary topics", "grammar patterns"],
    "reasoning": "brief explanation of language identification"
  },
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "question in student's native language that includes target language word/phrase to test",
      "options": ["mix of translations, meanings, or target language options"],
      "correct_answer": "correct option",
      "explanation": "explanation in student's native language",
      "topic_area": "vocabulary/grammar/translation"
    }
  ]
}

CRITICAL LANGUAGE LEARNING REQUIREMENTS:
- Question instructions MUST be in the student's native language (detected from context)
- Target language words/phrases MUST be preserved in questions
- Test vocabulary meaning, grammar rules, and translation skills
- DO NOT translate the target language words being tested
- Include the target language content that needs to be understood

QUESTION TYPES for language learning:
1. Translation (target → native): "What does [target word] mean?"
2. Translation (native → target): "How do you say [concept] in [target language]?"
3. Grammar: "Choose the correct form: [target language options]"
4. Vocabulary: "Which word means [definition]?"

FORBIDDEN:
- Testing knowledge of the student's native language
- Questions without any target language content
- Pure cultural/geographical facts without language learning
- Asking students to identify their own language
- Hardcoded assumptions about specific languages
- Fill-in-the-blank or completion questions (use multiple choice instead)

Return ONLY the JSON object, no additional text`
  },

  getMathPrompt: (grade: number, language: string = 'fi'): string => {
    const EXAM_QUESTION_COUNT = MATH_EXAM_CONFIG.DEFAULT_QUESTION_COUNT

    return `ROLE: You are an expert mathematics teacher creating exam questions for grade ${grade} students.

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
   - For algebra/exponents: "Simplify $a^3 \\\\cdot a^5$" → Answer: "$a^8$" (wrap in $ delimiters)
   - For division: "Simplify $\\\\frac{b^{12}}{b^4}$" → Options: "$b^8$", "$b^{16}$", "$b^3$", "$\\\\frac{1}{b^8}$"
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
Fractions: "$\\\\frac{x}{6} - \\\\frac{5}{3}$" → wrong: "$\\\\frac{x-5}{3}$" (subtracted denominators)
Geometry: Sector area 19,6 cm² → wrong: 39,2 cm² (forgot sector fraction), 31,4 cm² (confused with arc)
NOTE: Wrap all \\\\frac, \\\\cdot in $...$

MATHEMATICAL NOTATION:
- Math mode ($...$) for EXPRESSIONS ONLY, not plain decimals: "8,9 m" not "$8,9 m$"
- LaTeX commands MUST wrap in $...$: "$\\\\frac{1}{b^8}$" renders, "\\\\frac{1}{b^8}" shows raw code
- Operators: $\\\\cdot$ (multiply), $\\\\frac{a}{b}$ (fractions), $\\\\alpha$/$\\\\beta$/$\\\\pi$ (Greek), ° (degrees)

JSON ESCAPING: Double all backslashes in JSON strings. Example: LaTeX \\\\frac becomes JSON \\\\\\\\frac which renders as "$\\\\frac{1}{2}$"

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
      "explanation": "CONCISE explanation in Finnish (1-3 sentences max) covering why this is correct and common errors"
    }
  ],
  "topic": "Detected mathematics topic",
  "grade": ${grade}
}

EXPLANATIONS: Max 3 sentences/500 chars. State formula + ONE example + ONE common error. No repetition/loops. If ambiguity detected, skip to next question.

QUALITY REQUIREMENTS:
□ Questions test understanding, not just memorization
□ Mix of computational and conceptual questions
□ Progressive difficulty (easy → medium → hard)
□ Each question tests a DIFFERENT skill or concept
□ Only ONE correct answer per question
□ correct_answer EXACTLY matches one option
□ All questions in Finnish (detected from source)
□ No references to images or page numbers
□ Clear and unambiguous wording

CRITICAL VALIDATION RULES:
These errors will cause AUTOMATIC REJECTION - verify before finalizing each question:

❌ FORBIDDEN ERROR 1: Duplicate options
   - Bad: options = ["$y^{37}$", "$y^{31 \\\\cdot 6}$", "$y^0$", "$y^{37}$"]
   - Fix: Verify all 4 options are UNIQUE strings

❌ FORBIDDEN ERROR 2: "Closest answer" logic
   - Bad explanation: "oikea vastaus on 0,25... Koska 0,5 on lähin vastaus, valitaan se"
   - Fix: If NO option matches your calculation, SKIP the question entirely. NEVER choose "closest"

❌ FORBIDDEN ERROR 3: Wrong formula calculations (STEP-BY-STEP VERIFICATION REQUIRED)

   Geometry sector area: MUST use (angle/360) × π × r²
   Geometry arc length: MUST use (angle/360) × 2π × r

   CRITICAL: After stating the formula, verify EACH ARITHMETIC STEP:

   ✅ CORRECT EXAMPLE (r=87cm, angle=90°):
   Formula: (90/360) × π × 87²
   Step 1: 87² = 7569 ✓
   Step 2: 90/360 = 0.25 ✓
   Step 3: 0.25 × π = 0.7854 ✓
   Step 4: 0.7854 × 7569 = 5944.7 cm² ✓

   ❌ WRONG (this error appears in failed exams):
   Formula: (90/360) × π × 87² = (1/4) × π × 7569 ≈ 18960 cm² ← INCORRECT ARITHMETIC

   VERIFICATION RULE:
   Before finalizing ANY geometry answer, manually verify:
   - For r=87, angle=90°: answer MUST be ~5945 cm² (NOT 18960)
   - For r=5.3, angle=56°: answer MUST be ~13.7 cm² (NOT 19.8)
   - If your calculated value is 3× expected, STOP and recalculate

❌ FORBIDDEN ERROR 4: Visual references
   - Never write: "kuva", "sivu", "taulukko", "kaavio" in questions

SELF-VALIDATION CHECKLIST:
After generating EACH question, complete this checklist:

□ Step 1: Calculate answer independently and verify it's mathematically correct
□ Step 2: For geometry sector problems, verify EACH arithmetic step:
   - Compute r² correctly
   - Compute angle/360 as decimal
   - Multiply step-by-step: (angle/360) × π × r²
   - If r=87 and angle=90°, answer MUST be ~5945, verify this explicitly
□ Step 3: Verify correct_answer EXACTLY matches one option (character-for-character)
□ Step 4: Confirm all 4 options are UNIQUE (no duplicates)
□ Step 5: Ensure ONLY ONE option is mathematically correct
□ Step 6: Check explanation does NOT contain: "oikea vastaus", "lähin vastaus", "valitaan"
□ Step 7: Verify no visual references in question text
□ Step 8: If calculated value seems too large (3×+ expected), RECALCULATE before finalizing

IF ANY VALIDATION FAILS:
- STOP generation of that question immediately
- Move to next question
- DO NOT try to "fix" by choosing wrong answer

Begin generating the pedagogically sound exam now.`
  }
} as const

// Type definitions for configuration
export type GeminiModel = typeof GEMINI_CONFIG.MODEL_NAME
export type GradeScale = typeof GRADING_CONFIG.SCALE
export type MimeType = typeof FILE_CONFIG.ALLOWED_MIME_TYPES[number]
export type FileExtension = keyof typeof FILE_CONFIG.MIME_TYPE_MAP

// Helper functions for configuration access
export const getGeminiApiKey = (): string => {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error('GEMINI_API_KEY environment variable is required')
  }
  return key
}

export const isDiagnosticModeEnabled = (): boolean => {
  return STORAGE_CONFIG.DIAGNOSTIC_MODE_ENABLED
}

export const getGradingPrompt = (): string => {
  return `Evaluate the student's answer fairly and objectively. Prioritize the question requirements over the model answer.

PROCESS:
1. Check what the question requires (quantity, type, format)
2. Compare student answer against these requirements
3. Award points: full points if requirements are met

GRADING SCALE (4-10):
10: Perfect, 9: Excellent, 8: Good, 7: Satisfactory, 6: Acceptable, 5: Weak, 4: Failed

Accept synonyms and alternative expressions that convey the same meaning.

JSON:
{
  "points_awarded": [0-max_points],
  "percentage": [0-100],
  "feedback": "Feedback in target language"
}`
}