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

Return your response as a JSON object with this exact structure:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question text in Finnish",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Brief explanation in Finnish"
    }
  ],
  "topic": "Brief topic description",
  "difficulty": "elementary"
}

Important: Return only the JSON object. Generate exactly 10 questions in Finnish based on the image content.`,

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
  return `Arvioi seuraava opiskelijan vastaus suomenkielisessä kokeessa älykkäästi ja oikeudenmukaisesti.

KRIITTINEN PROSESSI:
1. ANALYSOI KYSYMYS ENSIN:
   - Mitä kysymys tarkalleen ottaen pyytää? (määrä, tyyppi, formaatti)
   - Onko kysymyksessä määrällistä vaatimusta? (esim. "kaksi", "kolme", "yksi")
   - Mikä on kysymyksen ydinasia ja tavoite?

2. VERTAA MALLIVASTAUS KYSYMYKSEEN:
   - Vastaako mallivastaus kysymyksen vaatimuksia?
   - Jos mallivastaus sisältää enemmän vaihtoehtoja kuin pyydetty, tulkitse se järkevästi
   - Huomioi että "tai" tarkoittaa vaihtoehtoja, ei kaikkia yhdessä

3. ARVIOI OPISKELIJAN VASTAUS:
   - Täyttääkö vastaus kysymyksen vaatimukset?
   - Jos opiskelija antaa oikean määrän oikeita vastauksia, anna täydet pisteet
   - ÄLYKÄS TULKINTA: Jos kysytään "kaksi soitinta" ja opiskelija antaa tarkalleen kaksi oikeaa soitinta, se on täydellinen vastaus riippumatta malliovastauksen muotoilusta

ARVIOINTI KRITEERIT (Suomalainen asteikko 4-10):
- 10: Täydellinen vastaus, täyttää kysymyksen vaatimukset täysin
- 9: Erinomainen vastaus, pieniä muotoiluvirheitä
- 8: Hyvä vastaus, sisältää oleelliset asiat
- 7: Tyydyttävä vastaus, joitain aukkoja
- 6: Välttävä vastaus, perustiedot hallussa
- 5: Heikko vastaus, merkittäviä puutteita
- 4: Hylätty, ei täytä kysymyksen perusvaatimuksia

TÄRKEÄT OHJEET:
- PRIORISOI KYSYMYKSEN VAATIMUKSET mallivastauksen yli
- Hyväksy synonyymit ja vaihtoehtoiset ilmaisutavat
- Jos opiskelijan vastaus täyttää kysymyksen vaatimukset paremmin kuin mallivastaus antaa ymmärtää, anna oikeudenmukainen arviointi
- Anna rakentavaa palautetta suomeksi
- Selitä päättelysi selkeästi

Palauta VAIN JSON-objekti:
{
  "points_awarded": [0-max_points välillä],
  "percentage": [0-100],
  "feedback": "Yksityiskohtainen palaute suomeksi",
  "grade_reasoning": "Selitä miksi annoit juuri nämä pisteet, erityisesti jos kysymyksen vaatimukset vs mallivastaus eroavat"
}`
}