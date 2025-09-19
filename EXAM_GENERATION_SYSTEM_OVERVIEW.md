# Exam Generation System Overview

## System Architecture

The ExamGenie system uses **category-based prompt routing** to generate appropriate exam questions for different academic subjects. The system automatically selects the optimal prompt based on the subject category, ensuring specialized handling for different types of learning material.

## Category-Based Routing Logic

```
IF category === 'language_studies'
  → Use specialized Language Studies Prompt
ELSE
  → Use general Category-Aware Prompt
```

This dual-prompt approach ensures that:
- **Science subjects** get content-focused questions testing understanding
- **Language learning** gets vocabulary/grammar questions testing the foreign language

---

## Core Sciences & Academic Subjects Processing

### Categories Handled
- `mathematics` - Mathematics and logic problems
- `core_academics` - Science, history, geography, biology, physics, chemistry, environmental studies, social studies
- `general` - Default category for miscellaneous subjects

### Core Sciences Prompt Structure

```markdown
Analyze the educational material and generate exam questions in one integrated process.

Category: {category} ({description})
Grade Level: {grade || 'detect from content'}
Target Language: {studentLanguageName} ({languageCode})

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
      "question": "question text in {studentLanguage}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "correct option",
      "explanation": "explanation in {studentLanguage}",
      "topic_area": "specific topic this tests"
    }
  ]
}

CRITICAL REQUIREMENTS:
- All questions, options, and explanations MUST be in {studentLanguage}
- Generate exactly 10 questions
- Questions should naturally adapt to the detected subject

LANGUAGE QUALITY REQUIREMENTS:
- Questions MUST be grammatically correct and natural-sounding in {studentLanguage}
- Use proper sentence structure and word order for the target language
- Ensure questions make logical sense and are clearly understandable
- Avoid awkward translations or unnatural phrasing

ABSOLUTELY FORBIDDEN - DO NOT INCLUDE:
- ANY references to images, pictures, diagrams, or visual elements
- Words that reference visuals (such as "shown", "depicted", "illustrated")
- Questions that assume visual context or require seeing anything

MANDATORY TEXT-ONLY APPROACH:
- ALL questions must be answerable using ONLY the extracted text content
- Base questions entirely on written information, descriptions, and facts
- Create questions about concepts, definitions, processes, and factual information

EXAMPLES OF PROPER QUESTION FORMATION:
- GOOD Finnish: "Mikä aiheuttaa tulipalon?" (What causes a fire?)
- GOOD Finnish: "Mitä tulee tehdä tulipalon sattuessa?" (What should be done when a fire occurs?)
- GOOD Finnish: "Mikä on yleinen hätänumero?" (What is the general emergency number?)

Return ONLY the JSON object, no additional text
```

### Science Subjects Processing Flow

1. **Content Analysis**: System reads educational material (textbooks, articles)
2. **Subject Detection**: AI identifies specific subject (biology, chemistry, geography, etc.)
3. **Topic Extraction**: Finds key concepts, processes, definitions from text
4. **Question Generation**: Creates comprehension questions testing understanding
5. **Language Consistency**: All content translated to student's native language
6. **Text-Only Focus**: No visual references, purely content-based questions

### Example Science Questions Generated
- **Biology**: "Mitä kasvi tarvitsee fotosynteesiä varten?" (What does a plant need for photosynthesis?)
- **Geography**: "Mikä on pääkaupunki?" (What is the capital city?)
- **Chemistry**: "Mitä tapahtuu kun happi ja vety yhdistyvät?" (What happens when oxygen and hydrogen combine?)

---

## Language Studies Processing

### Specialized Language Learning System

When `category === 'language_studies'`, the system switches to a completely different prompt designed specifically for foreign language learning.

### Language Studies Prompt Structure

```markdown
Analyze the foreign language learning material and generate language exam questions.

IMPORTANT: This is a LANGUAGE LEARNING exam. The textbook contains foreign language content that students are learning.

Student Information:
- Grade Level: {grade || 'detect from content'}
- Student's Native Language: {studentLanguageName} ({studentLanguage})
- Material Type: Foreign language textbook/learning material

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
   - Words: "stad" (NOT "by"), "ställe" (NOT "sted"), "också" (NOT "också")

   NORWEGIAN IDENTIFICATION:
   - Characters: "ø" (NOT "ö"), "æ" (NOT "ä")
   - Articles: "en/et" (neuter "et" vs Swedish "ett")
   - Definite patterns: "byen, byer, byene" (NOT "staden, städer")
   - Words: "by" (NOT "stad"), "sted" (NOT "ställe"), "også" (NOT "också")

   CRITICAL: Look for these exact Swedish patterns in text:
   - "ett drömyrke" = Swedish (Norwegian would be "et drømmeyrke")
   - "staden, städer, städerna" = Swedish (Norwegian: "byen, byer, byene")
   - "ett ställe" = Swedish (Norwegian: "et sted")
   - Character "ö" appears = DEFINITELY SWEDISH

3. Extract vocabulary, grammar patterns, and phrases from the IDENTIFIED foreign language
4. Generate questions that test knowledge OF that specific foreign language
5. Use the student's native language ({studentLanguageName}) for question instructions
6. Include the foreign language words/phrases being tested IN the questions
7. Reference the correct language name in your questions

CRITICAL LANGUAGE LEARNING REQUIREMENTS:
- Question instructions MUST be in {studentLanguageName}
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
Swedish detected - {studentLanguageName} questions:
- "Mitä ruotsin sana 'stad' tarkoittaa?" (Options: kaupunki, katu, talo, maa)
- "Valitse oikea artikkeli sanalle 'museum':" (Options: en, ett, den, det)
- "Käännä ruotsiksi: 'Asun Oslossa'" (Options: Swedish sentences)
- "Täydennä: 'Jag bor ___ Stockholm'" (Options: i, på, till, från)

Norwegian detected - {studentLanguageName} questions:
- "Mitä norjan sana 'by' tarkoittaa?" (Options: kaupunki, katu, talo, maa)
- "Valitse oikea artikkeli sanalle 'museum':" (Options: en, et, den, det)

FORBIDDEN:
- Testing knowledge of the student's native language
- Questions without any foreign language content
- Pure cultural/geographical facts without language learning
- Asking students to identify their own language

Return ONLY the JSON object, no additional text
```

### Language Learning Processing Flow

1. **Language Detection**: System scans for linguistic markers to identify the foreign language
2. **Pattern Recognition**: Analyzes grammar patterns, articles, character sets
3. **Vocabulary Extraction**: Identifies foreign words and phrases to test
4. **Question Generation**: Creates language-specific questions that test the foreign language
5. **Bilingual Formatting**: Instructions in native language, content in foreign language
6. **Grammar Focus**: Tests articles, verb forms, noun declensions specific to detected language

### Example Language Learning Questions Generated
- **Swedish Vocabulary**: "Mitä ruotsin sana 'stad' tarkoittaa?" (What does the Swedish word 'stad' mean?)
- **Swedish Grammar**: "Valitse oikea artikkeli ruotsin sanalle 'museum':" (Choose the correct article for the Swedish word 'museum')
- **Swedish Completion**: "Täydennä ruotsinkielinen lause: 'Jag bor ___ Stockholm.'" (Complete the Swedish sentence)
- **Swedish Morphology**: "Mitä ruotsin kielen muoto 'städerna' tarkoittaa?" (What does the Swedish form 'städerna' mean?)

---

## Key Differences Between Systems

| Aspect | Science/Core Academics | Language Studies |
|--------|----------------------|------------------|
| **Purpose** | Test content comprehension | Test foreign language knowledge |
| **Language Use** | All in student's native language | Mixed: instructions in native, content in foreign |
| **Content Focus** | Concepts, facts, processes | Vocabulary, grammar, translation |
| **Question Types** | Multiple choice, true/false, short answer | Translation, grammar, vocabulary, completion |
| **Text Processing** | Translate everything to student language | Preserve foreign language elements |
| **Success Metric** | Understanding of subject matter | Knowledge of foreign language |

## Technical Implementation

### Prompt Selection Logic
```javascript
if (category === 'language_studies') {
  promptToUse = PROMPTS.getLanguageStudiesPrompt(grade, language)
  promptType = `LANGUAGE_STUDIES(grade-${grade}, student-lang-${language})`
} else {
  promptToUse = PROMPTS.getCategoryAwarePrompt(category, grade, language)
  promptType = `CATEGORY_AWARE(${category}, grade-${grade}, lang-${language})`
}
```

### Output Format
Both systems return identical JSON structure:
- `subject_analysis`: Detected subject and confidence
- `questions`: Array of 10 questions with standardized format
- Same question types and point values
- Compatible with existing exam display and grading systems

## Quality Assurance

### Science Subjects
- Content accuracy verification
- Grade-appropriate language
- Text-only question validation
- Natural language flow in student's native language

### Language Studies
- Accurate foreign language detection
- Preservation of foreign language elements
- Proper bilingual question formatting
- Grammar pattern accuracy for detected language

---

## System Benefits

1. **Specialized Processing**: Each subject type gets optimized question generation
2. **Maintained Compatibility**: Identical output format ensures system integration
3. **Language Accuracy**: Proper handling of both monolingual and bilingual content
4. **Scalable Architecture**: Easy to add new subject categories
5. **Quality Control**: Category-specific validation and testing protocols