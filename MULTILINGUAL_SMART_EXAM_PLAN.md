# Multi-Language Smart Exam System - Planning Document

## Overview
Transform ExamGenie into a multilingual, intelligent exam system that adapts to student languages, automatically detects subjects from content, and provides comprehensive learning gap analysis.

## Feature 1: Student Language Support for Exam Generation

### Core Principle
**Exams in student's language, UI in English** - Keep the interface simple in English while generating all exam content (questions, options, explanations) in each student's native/learning language.

### Architecture

#### 1.1 Database Schema Changes
```sql
-- Add to students table
ALTER TABLE students ADD COLUMN language VARCHAR(10) DEFAULT 'en';
ALTER TABLE students ADD COLUMN language_name VARCHAR(50) DEFAULT 'English';
-- Examples: 'en' (English), 'fi' (Finnish), 'sv' (Swedish), 'ar' (Arabic), 'so' (Somali)
```

#### 1.2 Simplified Language Service
```typescript
// src/lib/services/language-service.ts
interface LanguageService {
  // Only for exam generation - no UI translation needed
  adaptExamPrompt(basePrompt: string, studentLanguage: string, grade: number): string

  // Get language display name
  getLanguageName(code: string): string

  // Supported languages list
  getSupportedLanguages(): Array<{code: string, name: string}>
}
```

#### 1.3 UI Approach (English Only)
```typescript
// All UI text remains in English
const UI_TEXTS = {
  create_exam: "Create Exam",
  add_student: "Add Student",
  select_language: "Student's Language",
  view_results: "View Results",
  grade_exam: "Grade Exam"
  // No translation needed - all in English
}
```

#### 1.4 Prompt Language Adaptation
```typescript
// Core exam generation prompt template
const EXAM_PROMPT_TEMPLATE = `
Generate exactly 10 multiple-choice questions in {LANGUAGE}.
The questions should be appropriate for a {GRADE} grade student.
Language code: {LANGUAGE_CODE}
Full language name: {LANGUAGE_NAME}

IMPORTANT:
- All questions, options, and explanations must be in {LANGUAGE_NAME}
- Use age-appropriate vocabulary for grade {GRADE}
- Follow the educational standards typical for {LANGUAGE_NAME} education
`;
```

### Implementation Approach
1. **Phase 1**: Add language dropdown to student creation form (English UI)
2. **Phase 2**: Modify exam generation prompts to use student's language
3. **Phase 3**: Update grading to generate feedback in student's language
4. **Phase 4**: Test with multiple languages to ensure quality

### Supported Languages (Initial - Latin Alphabet Focus)
- English (en) - default
- Finnish (fi)
- Swedish (sv)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Estonian (et)
- Norwegian (no)
- Danish (da)
- Dutch (nl)

Note: Initial release focuses on languages using basic and extended Latin alphabets. Support for non-Latin scripts (Arabic, Russian, Chinese, etc.) planned for future phases.

---

## Feature 2: Intelligent Subject Detection

### Core Principle
**Content-driven subject identification** - Let AI analyze uploaded images to determine specific subject within broad categories.

### Category Structure
```typescript
enum ExamCategory {
  MATHEMATICS = "mathematics",
  CORE_ACADEMICS = "core_academics",
  LANGUAGE_STUDIES = "language_studies"
}

// Core Academics includes:
// - History (historia)
// - Geography (maantieto)
// - Biology (biologia)
// - Physics (fysiikka)
// - Chemistry (kemia)
// - Environmental Studies (ympäristöoppi)
// - Social Studies (yhteiskuntaoppi)
// - Religion/Ethics (uskonto/elämänkatsomustieto)

// Language Studies includes:
// - Foreign language learning (English, Swedish, German, French, Spanish, etc.)
// - Vocabulary acquisition in target language
// - Grammar rules of the new language
// - Translation exercises
// - Language comprehension
// - Pronunciation and phonetics
// - Cultural context of the language
```

### Single-Stage Intelligent Processing

#### Combined Subject Detection & Question Generation
```typescript
const INTELLIGENT_EXAM_GENERATION_PROMPT = `
Analyze the educational material and generate exam questions in one integrated process.

Category: {CATEGORY} (mathematics/core_academics/language_studies)
Grade Level: {GRADE}
Target Language: {LANGUAGE}

Instructions:
1. First, identify the specific subject within the category
2. Detect the main topics and concepts covered
3. Then generate 10 appropriate questions based on your findings
4. If subject identification is uncertain, create versatile questions that work across related subjects

Return JSON:
{
  "subject_analysis": {
    "detected_subject": "specific subject identified",
    "confidence": 0-1,
    "topics_found": ["topic1", "topic2"],
    "reasoning": "brief explanation of identification"
  },
  "questions": [
    {
      "question": "question text in {LANGUAGE}",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "correct option",
      "explanation": "explanation in {LANGUAGE}",
      "topic_area": "specific topic this tests"
    }
    // ... 10 questions total
  ]
}

The questions should naturally adapt to the detected subject and topics.
If the content appears to cover multiple subjects, generate a balanced mix of questions.
`;
```

#### Benefits of Single-Stage Processing
- **Reduced latency**: One API call instead of two (saves ~8-10 seconds)
- **Better context**: LLM maintains full understanding while generating questions
- **Natural adaptation**: Questions inherently match the detected subject
- **Simplified error handling**: Single point of failure instead of two
- **Cost efficiency**: One prompt execution instead of two

### UI Changes
```typescript
// Replace specific subject dropdown with:
<CategorySelector>
  <CategoryButton icon="calculator" value="mathematics">
    Mathematics & Logic
  </CategoryButton>
  <CategoryButton icon="book" value="core_academics">
    Science, History & Social Studies
  </CategoryButton>
  <CategoryButton icon="language" value="language_studies">
    Foreign Language Learning
  </CategoryButton>
</CategorySelector>
```

### Edge Case Handling
- **Mixed content**: If images contain multiple subjects, prioritize based on volume
- **Ambiguous content**: Generate questions that work for multiple interpretations
- **Low confidence**: Inform user and suggest manual subject selection

---

## Feature 3: Learning Gap Analysis & Feedback

### Core Principle
**Pattern-based learning diagnostics** - Identify knowledge gaps from wrong answer patterns and provide actionable feedback.

### Enhanced Grading Structure
```typescript
interface EnhancedGradingResult {
  // Current grading
  score: number
  answers: GradedAnswer[]

  // NEW: Complete feedback from LLM
  feedbackText: string // Full narrative feedback in student's language

  // Optional: Structured data for visualizations only (no text)
  scoreBreakdown?: {
    byTopic: Record<string, {correct: number, total: number}>
    difficulty: Record<string, number>
  }
}
```

### Three-Part Grading Prompt

#### Part 1: Individual Question Grading (Current)
```typescript
// Existing grading logic
```

#### Part 2: Pattern Analysis
```typescript
const PATTERN_ANALYSIS_PROMPT = `
Given the student's incorrect answers, identify learning gaps:

Original Material Summary: {MATERIAL_SUMMARY}
Questions Missed: {MISSED_QUESTIONS}
Student Answers vs Correct: {ANSWER_COMPARISON}

Analyze:
1. Common themes in missed questions
2. Fundamental concepts not understood
3. Potential misconceptions
4. Knowledge areas needing reinforcement

Return structured gaps with severity levels.
`;
```

#### Part 3: Personalized Feedback Generation
```typescript
const FEEDBACK_GENERATION_PROMPT = `
Based on the identified learning gaps, generate complete personalized feedback:

Student Performance: {SCORE}/10
Language: {LANGUAGE}
Grade Level: {GRADE}
Questions Answered Correctly: {CORRECT_QUESTIONS}
Questions Answered Incorrectly: {INCORRECT_QUESTIONS}
Subject Material: {MATERIAL_SUMMARY}

Generate a complete, self-contained feedback narrative that includes:
- What the student did well (specific strengths)
- Areas that need improvement (specific gaps)
- Why these areas are important
- Concrete steps to improve
- Encouragement

The output should be 3-5 paragraphs of natural, flowing text in {LANGUAGE}.
Do not use bullet points or structured sections.
Write as if speaking directly to the student.
Make it age-appropriate for grade {GRADE}.

Return only the feedback text, no labels or sections.
`;
```

### Material Context Strategy
```typescript
// Include material summary in grading context
interface GradingContext {
  examId: string
  studentAnswers: string[]

  // NEW: Additional context
  originalMaterialSummary: string // AI-generated summary of source material
  examQuestions: Question[] // Full question objects
  subjectArea: string // For subject-specific feedback
  studentLanguage: string // For localized feedback
  previousExamScores?: number[] // For progress tracking
}
```

### Feedback UI Component
```typescript
// New component for displaying LLM-generated feedback
<LearningFeedback>
  <ScoreHeader score={score} />

  {/* All text comes directly from LLM - no hardcoded strings */}
  <FeedbackContent>
    {feedbackParagraphs.map((paragraph, index) => (
      <FeedbackParagraph key={index}>
        {paragraph}
      </FeedbackParagraph>
    ))}
  </FeedbackContent>

  {/* Optional structured data visualization - no text */}
  <VisualizationSection>
    <ScoreChart data={scoreData} />
    <TopicBreakdown correct={correctByTopic} incorrect={incorrectByTopic} />
  </VisualizationSection>
</LearningFeedback>
```

---

## Integration Points

### Data Flow
```
1. Student Creation → Set language preference (UI in English)
2. Image Upload → Detect category → Identify subject
3. Exam Generation → Generate questions in student's language
4. Student Takes Exam → Questions displayed in their language
5. Grading → Pattern analysis + Gap identification
6. Feedback → Generated in student's language (UI remains English)
```

### Database Modifications
```sql
-- Students table
ALTER TABLE students
  ADD COLUMN language VARCHAR(10) DEFAULT 'en',
  ADD COLUMN language_name VARCHAR(50);

-- Exams table
ALTER TABLE examgenie_exams
  ADD COLUMN category VARCHAR(20),
  ADD COLUMN detected_subject VARCHAR(50),
  ADD COLUMN detection_confidence FLOAT,
  ADD COLUMN material_summary TEXT;

-- New feedback table
CREATE TABLE learning_feedback (
  id UUID PRIMARY KEY,
  exam_id UUID REFERENCES examgenie_exams(id),
  student_id UUID REFERENCES students(id),
  learning_gaps JSONB,
  feedback_paragraphs TEXT[],
  recommendations JSONB,
  strength_areas TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoint Changes

#### Modified Endpoints
- `POST /api/examgenie/exams` - Accept category instead of subject, use student's language
- `POST /api/examgenie/grade` - Return grading results in student's language
- `POST /api/students` - Include language preference field

#### New Endpoints
- `GET /api/languages/supported` - List supported languages (for dropdown)

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Add language fields to database
- [ ] Create simple language dropdown for student creation (English UI)
- [ ] Build combined subject detection + question generation prompt
- [ ] Design feedback data models

### Phase 2: Core Features (Week 2)
- [ ] Implement language selection in student creation
- [ ] Build category selector UI (English labels)
- [ ] Create single-stage exam generation with language support
- [ ] Develop pattern analysis in grading

### Phase 3: Intelligence Layer (Week 3)
- [ ] Ensure exam generation uses student's language
- [ ] Implement subject detection within single prompt
- [ ] Build learning gap analysis
- [ ] Create feedback generation in student's language

### Phase 4: Polish & Testing (Week 4)
- [ ] Test exam generation in multiple languages
- [ ] Handle edge cases in subject detection
- [ ] Refine feedback quality in each language
- [ ] Verify UI remains consistently in English

---

## Technical Considerations

### Performance
- Cache UI translations aggressively
- Use streaming for long feedback generation
- Batch process pattern analysis
- Implement progressive enhancement

### Scalability
- Language service should be stateless
- Cache warming for common languages
- Background jobs for feedback generation
- CDN for cached translations

### Quality Assurance
- Validate translations with native speakers
- Test subject detection across disciplines
- Ensure feedback is age-appropriate
- Monitor detection confidence scores

### Security
- Sanitize all generated content
- Validate language codes
- Rate limit translation requests
- Audit feedback generation

---

## Success Metrics

### Language Support
- Support 5+ languages in first release
- <2 second translation time for UI
- 95%+ translation accuracy

### Subject Detection
- 85%+ detection accuracy
- Handle 10+ subjects
- Graceful fallback for ambiguous content

### Learning Feedback
- Generate feedback in <5 seconds
- Identify 3-5 gaps per exam average
- Provide actionable recommendations
- Student satisfaction >4/5

---

## Next Steps

1. **Validate Approach**: Review plan with stakeholders
2. **Create Prototypes**: Build POC for each feature
3. **User Testing**: Test with teachers and students
4. **Iterate**: Refine based on feedback
5. **Deploy**: Phased rollout starting with Finnish + English