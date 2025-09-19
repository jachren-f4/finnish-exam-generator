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

  // ExamGenie MVP Subject-Aware Prompts
  getSubjectAwarePrompt: (subject?: string, grade?: number, _language: string = 'fi') => {
    const basePrompt = `Lue kuvista teksti ja luo aiheeseen sopivia koekysymyksiä suomeksi.`

    let subjectContext = ''
    if (subject) {
      subjectContext = `\n\nAIHE: ${subject}`

      // Add subject-specific guidance
      switch (subject) {
        case 'Äidinkieli':
          subjectContext += `\nKeskity kielioppi-, kirjallisuus- ja tekstinymmärtämiskysymyksiin.`
          break
        case 'Maantieto':
          subjectContext += `\nKeskity maantiedon käsitteisiin, karttoihin ja maantieteellisiin ilmiöihin.`
          break
        case 'Historia':
          subjectContext += `\nKeskity historiallisiin tapahtumiin, henkilöihin ja aikakausiin.`
          break
        case 'Biologia':
          subjectContext += `\nKeskity elämän tieteeseen, elimistöön ja luonnon ilmiöihin.`
          break
        case 'Fysiikka':
          subjectContext += `\nKeskity fysiikan ilmiöihin, laskutehtäviin ja tieteellisiin käsitteisiin.`
          break
        case 'Kemia':
          subjectContext += `\nKeskity kemiallisiin reaktioihin, aineisiin ja kemian käsitteisiin.`
          break
        case 'Ympäristöoppi':
          subjectContext += `\nKeskity ympäristön ja luonnon tuntemukseen sekä kestävään kehitykseen.`
          break
        default:
          subjectContext += `\nLuo kysymyksiä jotka sopivat ${subject}-aihealueeseen.`
      }
    }

    let gradeContext = ''
    if (grade) {
      gradeContext = `\nLUOKKA-ASTE: ${grade}. luokka`

      if (grade >= 1 && grade <= 3) {
        gradeContext += `\nTaso: Ala-aste (1.-3. luokka) - Yksinkertaiset, selkeät kysymykset. Käytä tuttuja sanoja.`
      } else if (grade >= 4 && grade <= 6) {
        gradeContext += `\nTaso: Ala-aste (4.-6. luokka) - Haastavia mutta ikätason mukaisia kysymyksiä.`
      } else if (grade >= 7 && grade <= 9) {
        gradeContext += `\nTaso: Yläkoulu (7.-9. luokka) - Syvempiä analyysejä ja kriittistä ajattelua vaativia kysymyksiä.`
      }
    }

    return `${basePrompt}${subjectContext}${gradeContext}

Palauta vastauksesi JSON-objektina tällä tarkalleen tämän rakenteen mukaisesti:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Kysymysteksti suomeksi",
      "options": ["Vaihtoehto A", "Vaihtoehto B", "Vaihtoehto C", "Vaihtoehto D"],
      "correct_answer": "Vaihtoehto A",
      "explanation": "Lyhyt selitys suomeksi"
    }
  ],
  "topic": "Lyhyt aiheen kuvaus",
  "difficulty": "${grade ? `luokka-${grade}` : 'ala-aste'}"
}

TÄRKEÄÄ:
- Palauta VAIN JSON-objekti
- Luo tarkalleen 10 kysymystä suomeksi tekstin perusteella
- ÄLÄ luo kysymyksiä, jotka viittaavat kuviin, kaavioihin tai tehtäväkuviin
- ÄLÄ käytä sanoja kuten "kuvassa", "tehtävässä a)", "ylempänä", "alla olevassa"
- Kaikki kysymykset on voitava vastata pelkän tekstin perusteella`
  },

  // ITERATION 2: Simplified Natural Language Prompt (75% size reduction)
  getSimplifiedCategoryPrompt: (category: string, grade?: number, language: string = 'en') => {
    const { LanguageService } = require('./services/language-service')
    const languageName = LanguageService.getLanguageName(language)

    return `Read the educational content and create 10 exam questions in ${languageName}.

Target: Grade ${grade || '5'} students
Subject: ${category}

Generate varied question types:
- 6 multiple choice
- 2 short answer
- 1 true/false
- 1 fill-in-blank

Requirements:
- Questions must sound natural in ${languageName}
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
    const { LanguageService } = require('./services/language-service')
    const languageName = LanguageService.getLanguageName(language)

    const categoryDescriptions = {
      mathematics: 'Mathematics and logic problems',
      core_academics: 'Science, history, geography, biology, physics, chemistry, environmental studies, or social studies',
      language_studies: 'Foreign language learning including vocabulary, grammar, translation, and comprehension'
    }

    return `Analyze the educational material and generate exam questions in one integrated process.

Category: ${category} (${categoryDescriptions[category as keyof typeof categoryDescriptions] || category})
Grade Level: ${grade || 'detect from content'}
Target Language: ${languageName} (${language})

Instructions:
1. First, identify the specific subject within the category
2. Detect the main topics and concepts covered
3. Then generate 10 appropriate questions based on your findings
4. If subject identification is uncertain, create versatile questions that work across related subjects

Return JSON:
{
  "subject_analysis": {
    "detected_subject": "specific subject identified",
    "confidence": 0.9,
    "topics_found": ["topic1", "topic2"],
    "reasoning": "brief explanation of identification"
  },
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "question text in ${languageName}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "correct option",
      "explanation": "explanation in ${languageName}",
      "topic_area": "specific topic this tests"
    }
  ]
}

CRITICAL REQUIREMENTS:
- All questions, options, and explanations MUST be in ${languageName}
- Generate exactly 10 questions
- Questions should naturally adapt to the detected subject

LANGUAGE QUALITY REQUIREMENTS:
- Questions MUST be grammatically correct and natural-sounding in ${languageName}
- Use proper sentence structure and word order for the target language
- Ensure questions make logical sense and are clearly understandable
- Avoid awkward translations or unnatural phrasing
- Questions should read as if written by a native speaker of ${languageName}
- Double-check that each question is coherent and well-formed in the target language

ABSOLUTELY FORBIDDEN - DO NOT INCLUDE:
- ANY references to images, pictures, diagrams, or visual elements
- Words that reference visuals (such as "shown", "depicted", "illustrated", or equivalent words in any language)
- Questions that assume visual context or require seeing anything
- References to visual layouts, positions, arrangements, or locations

MANDATORY TEXT-ONLY APPROACH:
- ALL questions must be answerable using ONLY the extracted text content
- Base questions entirely on written information, descriptions, and facts from the text
- Create questions about concepts, definitions, processes, and factual information
- Never assume students can see images, charts, diagrams, or any visual content
- If generating in languages other than English, avoid equivalent words for "in the image", "in the picture", etc.

EXAMPLES OF FORBIDDEN PHRASES (in any language):
- English: "in the image", "shown above", "depicted", "illustrated"
- Finnish: "kuvassa", "kuvaan", "näkyy", "esitetty", "ylläolevassa"
- Spanish: "en la imagen", "mostrado", "ilustrado"
- All similar phrases in any target language

EXAMPLES OF PROPER QUESTION FORMATION:
- GOOD Finnish: "Mikä aiheuttaa tulipalon?" (What causes a fire?)
- BAD Finnish: "Mihin tulipalo voi syttyä sähkölaitteesta?" (Grammatically awkward)
- GOOD Finnish: "Mitä tulee tehdä tulipalon sattuessa?" (What should be done when a fire occurs?)
- GOOD Finnish: "Mikä on yleinen hätänumero?" (What is the general emergency number?)

- Return ONLY the JSON object, no additional text`
  },

  getLanguageStudiesPrompt: (grade?: number, studentLanguage: string = 'en') => {
    const { LanguageService } = require('./services/language-service')
    const studentLanguageName = LanguageService.getLanguageName(studentLanguage)

    return `Analyze the foreign language learning material and generate language exam questions.

IMPORTANT: This is a LANGUAGE LEARNING exam. The textbook contains foreign language content that students are learning.

Student Information:
- Grade Level: ${grade || 'detect from content'}
- Student's Native Language: ${studentLanguageName} (${studentLanguage})
- Material Type: Foreign language textbook/learning material

Instructions:
1. DETECT the target language being taught by analyzing:
   - Character patterns and diacritical marks
   - Article usage and grammatical structures
   - Word patterns and linguistic features
   - Context clues from the educational material

2. Extract vocabulary, grammar patterns, and phrases from the IDENTIFIED target language
3. Generate questions that test knowledge OF that specific target language
4. Use the student's native language (${studentLanguageName}) for question instructions
5. Include the target language words/phrases being tested IN the questions
6. Reference the correct language name in your questions

Return JSON:
{
  "subject_analysis": {
    "detected_subject": "Language being taught (detected from content)",
    "confidence": 0.9,
    "topics_found": ["vocabulary topics", "grammar patterns"],
    "reasoning": "brief explanation of language identification"
  },
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "question in ${studentLanguageName} that includes target language word/phrase to test",
      "options": ["mix of translations, meanings, or target language options"],
      "correct_answer": "correct option",
      "explanation": "explanation in ${studentLanguageName}",
      "topic_area": "vocabulary/grammar/translation"
    }
  ]
}

CRITICAL LANGUAGE LEARNING REQUIREMENTS:
- Question instructions MUST be in ${studentLanguageName}
- Target language words/phrases MUST be preserved in questions
- Test vocabulary meaning, grammar rules, and translation skills
- DO NOT translate the target language words being tested
- Include the target language content that needs to be understood

QUESTION TYPES for language learning:
1. Translation (target → native): "What does [target word] mean?"
2. Translation (native → target): "How do you say [concept] in [target language]?"
3. Grammar: "Choose the correct form: [target language options]"
4. Vocabulary: "Which word means [definition]?"
5. Comprehension: "Complete the sentence: [target language with blank]"

FORBIDDEN:
- Testing knowledge of the student's native language
- Questions without any target language content
- Pure cultural/geographical facts without language learning
- Asking students to identify their own language
- Hardcoded assumptions about specific languages

Return ONLY the JSON object, no additional text`

Instructions:
1. STEP 1: SCAN THE TEXT FOR LANGUAGE CLUES
   Look for character "ö" - if present, this is SWEDISH, not Norwegian
   Look for "ett" + noun - if present, this is SWEDISH (Norwegian uses "et")
   Look for pattern "staden, städer, städerna" - this is SWEDISH

2. CAREFULLY identify the foreign language by analyzing these CRITICAL differences:

   SWEDISH IDENTIFICATION (KEY MARKERS):
   - Characters: "ö" (NOT "ø"), "ä" (NOT "æ")
   - Articles: "en/ett" (neuter "ett" is common)
   - Definite patterns: "staden, städer, städerna" (NOT "byen, byer, byene")
   - Words: "stad" (NOT "by"), "ställe" (NOT "sted"), "också" (NOT "også")
   - Pronunciation guides: [sta:d] style notation

   NORWEGIAN IDENTIFICATION:
   - Characters: "ø" (NOT "ö"), "æ" (NOT "ä")
   - Articles: "en/et" (neuter "et" vs Swedish "ett")
   - Definite patterns: "byen, byer, byene" (NOT "staden, städer")
   - Words: "by" (NOT "stad"), "sted" (NOT "ställe"), "også" (NOT "också")

   IF YOU SEE "ö" or "ä" or "ett" or "städer" = SWEDISH
   IF YOU SEE "ø" or "æ" or "et" or "byer" = NORWEGIAN

   CRITICAL: Look for these exact Swedish patterns in text:
   - "ett drömyrke" = Swedish (Norwegian would be "et drømmeyrke")
   - "staden, städer, städerna" = Swedish (Norwegian: "byen, byer, byene")
   - "ett ställe" = Swedish (Norwegian: "et sted")
   - Character "ö" appears = DEFINITELY SWEDISH
2. Extract vocabulary, grammar patterns, and phrases from the IDENTIFIED foreign language
3. Generate questions that test knowledge OF that specific foreign language
4. Use the student's native language (${studentLanguageName}) for question instructions
5. Include the foreign language words/phrases being tested IN the questions
6. Reference the correct language name in your questions

Return JSON:
{
  "subject_analysis": {
    "detected_subject": "Language being taught (e.g., Swedish, Spanish, English)",
    "confidence": 0.9,
    "topics_found": ["vocabulary topics", "grammar patterns"],
    "reasoning": "brief explanation"
  },
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "question in ${studentLanguageName} that includes foreign language word/phrase to test",
      "options": ["mix of translations, meanings, or foreign language options"],
      "correct_answer": "correct option",
      "explanation": "explanation in ${studentLanguageName}",
      "topic_area": "vocabulary/grammar/translation"
    }
  ]
}

CRITICAL LANGUAGE LEARNING REQUIREMENTS:
- Question instructions MUST be in ${studentLanguageName}
- Foreign language words/phrases MUST be preserved in questions
- Test vocabulary meaning, grammar rules, and translation skills
- DO NOT translate the foreign language words being tested
- Include the foreign language content that needs to be understood

QUESTION TYPES for language learning:
1. Translation (foreign → native): "What does [foreign word] mean?"
2. Translation (native → foreign): "How do you say [native word] in [foreign language]?"
3. Grammar: "Choose the correct form: [foreign language options]"
4. Vocabulary: "Which word means [definition]?"
5. Comprehension: "Complete the sentence: [foreign language with blank]"

EXAMPLES (adapt to detected language):
Swedish detected - ${studentLanguageName} questions:
- "Mitä ruotsin sana 'stad' tarkoittaa?" (Options: kaupunki, katu, talo, maa)
- "Valitse oikea artikkeli sanalle 'museum':" (Options: en, ett, den, det)
- "Käännä ruotsiksi: 'Asun Oslossa'" (Options: Swedish sentences)
- "Täydennä: 'Jag bor ___ Stockholm'" (Options: i, på, till, från)

Norwegian detected - ${studentLanguageName} questions:
- "Mitä norjan sana 'by' tarkoittaa?" (Options: kaupunki, katu, talo, maa)
- "Valitse oikea artikkeli sanalle 'museum':" (Options: en, et, den, det)

German detected - ${studentLanguageName} questions:
- "Mitä saksan sana 'Stadt' tarkoittaa?" (Options: kaupunki, katu, talo, maa)

FORBIDDEN:
- Testing knowledge of the student's native language
- Questions without any foreign language content
- Pure cultural/geographical facts without language learning
- Asking students to identify their own language

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