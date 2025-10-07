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

// Default Prompts
export const PROMPTS = {
  DEFAULT_EXAM_GENERATION: `
Extract text from the images and generate exam questions.

Use the same language as the source material for all questions and explanations.

Return your response as a JSON object with this exact structure:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Brief explanation"
    }
  ],
  "topic": "Brief topic description",
  "difficulty": "elementary"
}

Important: Return only the JSON object. Generate exactly ${EXAM_CONFIG.DEFAULT_QUESTION_COUNT} questions based on the image content.`,

  OCR_EXTRACTION: `STEP 1: Extract text from each image separately
- Process each image individually (numbered 0, 1, 2, etc.)
- Preserve ALL text exactly as it appears: titles, headers, paragraphs, captions
- Maintain page boundaries - do NOT merge or mix content between different images
- Keep each page's content distinct and separate

STEP 2: MANDATORY TOPIC ANALYSIS
Before finalizing the output, you MUST:
1. Examine each image/page separately and identify its main academic subject
2. Determine if all pages belong to the same subject area (e.g., all physics, all biology, all history)
3. If pages contain DIFFERENT academic subjects, note this clearly
4. State your analysis: "Topic detected: [SUBJECT NAME]" or "Mixed topics detected: [LIST SUBJECTS]"

STEP 3: Format output with clear page separation
- Use "=== PAGE X ===" markers to separate different images/pages
- Include your topic analysis in the output
- Preserve original text structure and formatting

Return your response as a JSON object with this exact structure:
{
  "rawText": "=== PAGE 0 ===\\n[text from first image]\\n\\n=== PAGE 1 ===\\n[text from second image]\\n\\n[Topic Analysis: ...]"
}

VALIDATION CHECK before finalizing:
- Verify clear page boundaries are maintained
- Confirm topic analysis is included
- Ensure no content mixing between different pages

Important: Only return the JSON object with the extracted text. Do not include any additional explanations or notes.`,


  // ITERATION 2: Simplified Natural Language Prompt (75% size reduction)
  getSimplifiedCategoryPrompt: (category: string, grade?: number, language: string = 'en') => {
    const distribution = EXAM_CONFIG.QUESTION_TYPE_DISTRIBUTION(EXAM_CONFIG.DEFAULT_QUESTION_COUNT)
    return `Read the educational content and create ${EXAM_CONFIG.DEFAULT_QUESTION_COUNT} exam questions.

Use the same language as the source material for all questions and explanations.

Target: Grade ${grade || '5'} students
Subject: ${category}

Generate varied question types:
- ${distribution.multiple_choice} multiple choice
- ${distribution.short_answer} short answer
- ${distribution.true_false} true/false
- ${distribution.fill_in_blank} fill-in-blank

Requirements:
- Questions must sound natural
- Based only on text content (no image references)
- Age-appropriate difficulty
- Clear, simple phrasing

JSON format:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_answer": "option A",
      "explanation": "brief explanation"
    }
  ]
}

Return only JSON.`
  },

  getCategoryAwarePrompt: (category: string, grade?: number, language: string = 'en') => {
    const categoryDescriptions = {
      mathematics: 'Mathematics and logic problems',
      core_academics: 'Science, history, geography, biology, physics, chemistry, environmental studies, or social studies',
      language_studies: 'Foreign language learning including vocabulary, grammar, translation, and comprehension'
    }

    return `Create a text-based exam from educational content for grade ${grade || 'appropriate'} students.

CRITICAL CONSTRAINTS:
1. Generate questions ONLY from content visible in the provided images
2. Do NOT generate questions about topics not shown in the images
3. Questions must test actual knowledge, not document references
4. Avoid visual references (anything requiring seeing images/diagrams)
5. Avoid document structure (page numbers, chapters, sections)
6. Avoid location-based phrasing (positional references)
7. When in doubt, skip the question rather than inventing content

TARGET: Use the same language as the source material.

TASK: Generate exactly ${EXAM_CONFIG.DEFAULT_QUESTION_COUNT} questions that test understanding of the educational concepts shown in the images.

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

IMPORTANT: The correct_answer field must contain the exact text from the options array.

VALIDATION: Before finalizing, verify each question references content actually present in the provided images.

QUALITY FOCUS: Create questions that test knowledge, not visual recognition.`
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