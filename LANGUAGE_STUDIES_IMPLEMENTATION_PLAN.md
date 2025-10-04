# Language Studies Implementation Plan

## Executive Summary

This document outlines the implementation strategy for adding dedicated language learning functionality to ExamGenie. Unlike other subject categories where content language equals exam language, language studies requires explicit handling of two distinct languages: the learner's **native language** (for instructions/explanations) and the **target language** (being studied).

---

## 1. Core Concept & Requirements

### 1.1 Fundamental Difference from Current Categories

**Current System (Mathematics, Core Academics):**
- Single language context
- Content language = Question language = Feedback language
- Language auto-detected from images

**Language Studies (New):**
- Dual language context
- Content in target language (from textbook images)
- Questions/instructions may be in native language
- Feedback/explanations in native language
- Answers in target language
- **No auto-detection** - user explicitly specifies both languages

### 1.2 User Input Requirements

**Required Parameters:**
1. **Native Language** (Mother Tongue)
   - Language the learner is most comfortable with
   - Used for: question instructions, explanations, grading feedback
   - Examples: Finnish, English, Swedish, Spanish

2. **Target Language** (Learning Language)
   - Language being studied from the textbook
   - Used for: content extraction, answer options, vocabulary
   - Examples: English, German, French, Japanese

3. **Textbook Images** (existing)
   - Content in target language
   - Learning materials, vocabulary, grammar examples

4. **Grade Level** (existing)
   - 1-9 for Finnish curriculum
   - Affects question complexity

---

## 2. User Experience Design

### 2.1 Mobile App Flow

**Current Flow:**
```
Upload Images → Select Category/Grade → Generate Exam
```

**New Language Studies Flow:**
```
1. Select Category: "Language Studies"
2. Select Native Language (dropdown/picker)
3. Select Target Language (dropdown/picker)
4. Select Grade Level
5. Upload Textbook Images (in target language)
6. Generate Language Learning Exam
```

**UI Considerations:**
- Clear visual distinction between "Your Language" and "Learning Language"
- Flag icons or language names in native script
- Validation: prevent same language for both fields
- Remember last-used language pair for convenience

### 2.2 Web Interface Flow

**Home Page Additions:**
- Language Studies section with dual language selectors
- Visual indicators (flags, icons) for clarity
- Examples: "Learn English (from Finnish)" or "Learn Spanish (from English)"

**Exam Taking Page:**
- Instructions displayed in native language
- Content/answers in target language
- Mixed presentation where appropriate

**Grading Page:**
- Feedback in native language
- Explanations that bridge both languages
- Examples showing correct usage in target language

---

## 3. Technical Architecture

### 3.1 API Design Changes

#### Mobile API Endpoint Enhancement
**POST `/api/mobile/exam-questions`**

**New Required Parameters:**
```
native_language: string    // e.g., "fi", "en", "sv"
target_language: string    // e.g., "en", "de", "fr"
category: "language_studies"
```

**Validation Rules:**
- Both languages must be specified for language_studies category
- Languages must be different (native ≠ target)
- Both must be from supported language list
- Return 400 error with clear message if invalid

**Response Additions:**
```json
{
  "exam": {
    "id": "...",
    "native_language": "fi",
    "target_language": "en",
    "language_pair": "fi-en",
    // ... existing fields
  }
}
```

#### Web API Endpoints
- Same parameter additions to web exam generation
- Shared validation logic across mobile and web

### 3.2 Database Schema Updates

#### Exams Table
**New Columns:**
```sql
native_language VARCHAR(10)    -- Learner's native language
target_language VARCHAR(10)    -- Language being learned
language_pair VARCHAR(20)      -- e.g., "fi-en", "en-de" (for indexing/filtering)
```

**Indexes:**
```sql
CREATE INDEX idx_language_pair ON exams(language_pair);
CREATE INDEX idx_native_language ON exams(native_language);
CREATE INDEX idx_target_language ON exams(target_language);
```

**Migration Considerations:**
- Nullable for existing exams (non-language-studies)
- Required for category = 'language_studies'
- Database constraint ensuring consistency

#### Questions Table
**Optional Enhancements:**
```sql
question_language VARCHAR(10)  -- Language of the question text
answer_language VARCHAR(10)    -- Language of the answer options
```

### 3.3 Service Layer Architecture

#### New Service: Language Studies Generator
**Location:** `/src/lib/services/language-studies-generator.ts`

**Responsibilities:**
1. Validate language pair
2. Build specialized prompts for dual-language context
3. Handle Gemini API calls with language-specific instructions
4. Parse and validate language-aware question format
5. Ensure answer shuffling maintains language integrity

**Key Methods:**
```typescript
generateLanguageLearningQuestions(
  images: Buffer[],
  nativeLanguage: string,
  targetLanguage: string,
  gradeLevel: number
): Promise<Question[]>

validateLanguagePair(native: string, target: string): boolean

buildLanguageStudiesPrompt(
  nativeLanguage: string,
  targetLanguage: string,
  gradeLevel: number
): string
```

#### Enhanced: Grading Service
**Updates to:** `/src/lib/services/grading-service.ts`

**New Considerations:**
- Feedback must be in native language
- Evaluation criteria for language learning (grammar, vocabulary, comprehension)
- Explanations that reference both languages
- Examples in target language with native language explanations

---

## 4. AI Prompt Engineering Strategy

### 4.1 Prompt Structure for Language Studies

**Core Requirements for Gemini:**
1. Extract content from target language images
2. Generate questions appropriate for language learners
3. Write question instructions in native language
4. Provide answer options in target language
5. Create explanations in native language
6. Include educational context (grammar rules, vocabulary notes)

### 4.2 Question Types for Language Learning

**Type 1: Vocabulary Recognition**
- Question (native): "What does the word 'apple' mean?"
- Options (target): "omena", "päärynä", "banaani", "mansikka"

**Type 2: Grammar Comprehension**
- Question (native): "Which sentence uses past tense correctly?"
- Options (target): Four English sentences with different tenses

**Type 3: Translation**
- Question (native): "How do you say 'I am happy' in English?"
- Options (target): "I am happy", "I was happy", "I will be happy", "I would be happy"

**Type 4: Reading Comprehension**
- Question (native): "According to the text, where did they go?"
- Options (target): Location names in target language

**Type 5: Fill in the Blank**
- Question (native): "Which word completes the sentence?"
- Context (target): "I ___ to school yesterday"
- Options (target): "go", "went", "going", "goes"

### 4.3 Prompt Template Example (Conceptual)

```
You are creating a language learning exam for a {native_language} speaker
learning {target_language}.

CONTENT LANGUAGE: The textbook images are in {target_language}
QUESTION LANGUAGE: Write instructions in {native_language}
ANSWER LANGUAGE: Provide options in {target_language}
EXPLANATION LANGUAGE: Explain in {native_language}

GRADE LEVEL: {grade_level} (elementary school difficulty)

Extract content from the images and create 15 educational questions that:
1. Test vocabulary, grammar, and comprehension
2. Are appropriate for beginner/intermediate learners
3. Include clear explanations for learning purposes
4. Reference grammar rules when relevant
5. Provide educational value beyond just testing

FORMAT: [JSON structure with native/target language fields]
```

### 4.4 Prompt Variants Configuration

**Update:** `/src/lib/config.ts`

**New Category:** `language_studies`
- Separate prompt variants optimized for dual-language generation
- Few-shot examples showing proper language separation
- Validation rules for language consistency
- Educational tone and learning-focused feedback

---

## 5. Answer Shuffling & Integrity

### 5.1 Language-Aware Shuffling

**Current System:**
- Fisher-Yates shuffle on answer arrays
- Works for single-language questions

**Language Studies Requirement:**
- Shuffle must maintain language integrity
- If question is "Which word means X in {target_language}?"
  - All options must remain in target language after shuffle
  - No mixing of language contexts

**Implementation Consideration:**
- Existing shuffler (`/src/lib/utils/question-shuffler.ts`) should work
- Additional validation: ensure language tags stay consistent post-shuffle
- Test with multi-script languages (Latin, Cyrillic, Japanese, Arabic)

---

## 6. Grading & Feedback System

### 6.1 Language Learning Feedback Requirements

**Current Grading (Mathematics):**
- Correct/incorrect with explanation
- Feedback in same language as content

**Language Studies Grading:**
- Correct/incorrect evaluation
- **Explanation in native language**
- Grammar notes (if relevant)
- Vocabulary hints
- Usage examples in target language
- Learning tips for improvement

### 6.2 Grading Prompt Enhancements

**Context for Gemini Grader:**
```
This is a language learning exam where:
- Student's native language: {native_language}
- Language being learned: {target_language}
- Student is learning {target_language}

Provide feedback that:
1. Explains in {native_language} why answer is correct/incorrect
2. Includes grammar/vocabulary notes
3. Provides examples in {target_language}
4. Encourages learning and improvement
```

### 6.3 Grading Criteria Specific to Language Learning

- **Vocabulary:** Did they know the word meaning?
- **Grammar:** Did they apply rules correctly?
- **Comprehension:** Did they understand the context?
- **Usage:** Would this be appropriate in real communication?

---

## 7. Supported Language Pairs

### 7.1 Initial Launch Strategy

**Phase 1 - Most Common Pairs (MVP):**
- Finnish ↔ English (primary use case)
- English ↔ Spanish
- English ↔ German
- English ↔ French
- Swedish ↔ English

**Rationale:**
- Focus on European language pairs
- Finnish education system priority
- Common second languages in Finland
- Test with different language families (Germanic, Romance, Finno-Ugric)

### 7.2 Phase 2 - Expansion

**Additional Pairs:**
- Finnish ↔ Swedish (official languages of Finland)
- English ↔ Japanese
- English ↔ Chinese
- Russian ↔ English
- Any supported language ↔ Any other supported language

### 7.3 Language Code Standardization

**Use ISO 639-1 codes:**
- fi (Finnish), en (English), sv (Swedish)
- es (Spanish), de (German), fr (French)
- ja (Japanese), zh (Chinese), ru (Russian)

**Validation:**
- Maintain allowed language list in constants
- Validate both native and target against this list
- Support for language variants (en-US, en-GB) in future

---

## 8. UI/UX Considerations

### 8.1 Mobile App Design Updates

**Language Selection Screen:**
- Two distinct sections: "Your Language" and "Learning Language"
- Visual separation (color coding, icons, flags)
- Clear labels avoiding confusion
- Popular pairs as quick-select options
- Validation message if same language selected twice

**Exam Taking Screen:**
- Question number indicator (existing)
- Language indicator for current question
- Visual cue when answer options are in target language
- Help text in native language

**Results Screen:**
- Score and feedback in native language
- Vocabulary words highlighted with translations
- Grammar tips in native language
- Option to review in either language

### 8.2 Web Interface Updates

**Home Page:**
- Dedicated "Language Learning" section
- Language pair selector (dropdowns or search)
- Example preview: "Learn English from Finnish"
- Info tooltip explaining dual-language system

**Exam Page:**
- Clean, distraction-free interface
- Language indicators per question
- Progress tracking (existing NavigationDots component)
- Bilingual navigation if needed

**Grading Page:**
- Feedback sections clearly marked by language
- Expandable grammar explanations
- Examples toggle (show in target language with native translation)

### 8.3 Accessibility Considerations

- Screen reader support for dual-language content
- Language tags in HTML (lang attribute)
- RTL support for Arabic, Hebrew, etc.
- Font support for non-Latin scripts (Japanese, Chinese, Arabic, etc.)

---

## 9. Error Handling & Edge Cases

### 9.1 Validation Errors

**Client-Side:**
- Same language selected for both fields
- Unsupported language pair
- Missing language selection
- Clear error messages in user's interface language

**Server-Side:**
- Invalid language codes
- Unsupported language combination
- Missing required parameters
- Return 400 with descriptive error message

### 9.2 Content Extraction Failures

**Scenario:** Images don't contain target language content
- Gemini detects content is not in target language
- Return error: "Content appears to be in {detected_language}, not {target_language}"
- Suggest user verify image or language selection

**Scenario:** Mixed language content in images
- Extract what's possible
- Flag mixed content in response
- Allow user to proceed or adjust

### 9.3 Question Generation Failures

**Insufficient Content:**
- Not enough material for 15 questions
- Fallback: generate fewer questions with warning
- Or: request more images

**Language Mixing in Output:**
- Validation: ensure questions in native, answers in target
- Retry with stricter prompt if validation fails
- Log cases for prompt improvement

---

## 10. Testing Strategy

### 10.1 Unit Testing Focus Areas

**Language Pair Validation:**
- Valid pairs accepted
- Invalid pairs rejected
- Same language pair rejected
- Unsupported languages rejected

**Prompt Generation:**
- Correct language codes in prompts
- Native language used for instructions
- Target language used for content extraction
- Proper structure maintained

**Response Parsing:**
- Language-tagged questions parsed correctly
- Mixed language content handled
- Validation catches language inconsistencies

### 10.2 Integration Testing

**End-to-End Flows:**
1. Upload Finnish-English language pair → verify correct question generation
2. Upload with popular language pairs → verify all work
3. Submit answers → verify feedback in native language
4. Error cases → verify appropriate error messages

**Cross-Language Testing:**
- Test with different script systems (Latin, Cyrillic, Japanese)
- Test with RTL languages (Arabic, Hebrew)
- Test with tonal languages (Chinese)
- Verify character encoding throughout

### 10.3 AI Output Testing

**Gemini Response Validation:**
- Questions actually in native language
- Answers actually in target language
- Explanations provide learning value
- Grammar/vocabulary notes present
- No language mixing in single fields

**Quality Metrics:**
- Educational value of questions
- Appropriateness for grade level
- Clarity of explanations
- Cultural sensitivity in examples

---

## 11. Performance Considerations

### 11.1 API Response Times

**Current System:**
- ~2-5 seconds for question generation
- Gemini API is the bottleneck

**Language Studies Impact:**
- Potentially longer prompts (dual language instructions)
- More complex parsing (language validation)
- Estimated: +0.5-1 second per request
- Still acceptable for user experience

**Optimization Strategies:**
- Cache common language pair prompts
- Batch validation where possible
- Parallel processing for images

### 11.2 Token Usage Optimization

**Prompt Efficiency:**
- Concise dual-language instructions
- Reuse language pair context
- Avoid redundant language specifications
- Monitor: compare token usage vs. current prompts

**Target:** Maintain similar cost (~$0.001 per exam) despite added complexity

---

## 12. Database Migration Strategy

### 12.1 Migration Plan

**Step 1: Add Columns (Non-Breaking)**
```sql
ALTER TABLE exams
ADD COLUMN native_language VARCHAR(10),
ADD COLUMN target_language VARCHAR(10),
ADD COLUMN language_pair VARCHAR(20);
```

**Step 2: Backfill Existing Data**
- For non-language-studies exams: leave NULL
- Or set both to detected language for consistency

**Step 3: Add Indexes**
```sql
CREATE INDEX idx_language_pair ON exams(language_pair);
```

**Step 4: Add Constraints (Future)**
- Once stable, add NOT NULL for language_studies category
- Add CHECK constraint for valid language codes

### 12.2 Data Integrity

**Validation:**
- Ensure language codes are valid ISO 639-1
- Ensure native ≠ target for language_studies
- Handle NULL for non-language-studies gracefully

**Cleanup:**
- Migration script to handle existing exams
- No data loss
- Backward compatibility maintained

---

## 13. Backward Compatibility

### 13.1 Existing Categories Unchanged

**Mathematics & Core Academics:**
- No changes to existing flow
- native_language and target_language remain NULL
- Existing mobile/web clients continue working
- Auto-language detection still works

### 13.2 API Versioning

**Not Required (Graceful Extension):**
- New parameters optional for existing categories
- Required only for language_studies category
- API returns 400 with clear message if missing
- Old clients unaffected

### 13.3 Mobile App Compatibility

**Flutter App Updates:**
- Add language pair selection UI
- Update API calls to include new parameters
- Maintain backward compatibility with old exam format
- Graceful degradation if fields missing

---

## 14. Documentation Updates Required

### 14.1 API Documentation

**New Sections Needed:**
- Language Studies endpoint documentation
- Parameter descriptions for native/target language
- Language pair validation rules
- Example requests/responses
- Error codes specific to language studies

### 14.2 Developer Documentation

**Update Files:**
- `/README.md` - Add language studies overview
- `/PROJECT_OVERVIEW.md` - Architecture updates
- `/docs/api/mobile-exam-questions-endpoint.md` - New parameters
- Create: `/docs/language-studies-guide.md` - Comprehensive guide

### 14.3 User Documentation

**For Flutter App:**
- How to select language pair
- Understanding dual-language exams
- Interpreting feedback in native language
- Best practices for language learning

---

## 15. Future Enhancements (Post-MVP)

### 15.1 Advanced Features

**Adaptive Difficulty:**
- Track learner progress over time
- Adjust question difficulty based on performance
- Focus on weak areas (vocabulary vs. grammar)

**Pronunciation & Listening:**
- Text-to-speech for target language
- Audio questions for listening comprehension
- Pronunciation scoring (future AI capability)

**Custom Vocabulary Lists:**
- User uploads personal vocabulary to focus on
- Generate questions targeting specific words
- Spaced repetition integration

### 15.2 Analytics & Insights

**Learning Analytics:**
- Track progress by language pair
- Identify common mistake patterns
- Vocabulary mastery tracking
- Grammar concept progress

**Teacher/Parent Dashboard:**
- Monitor student language learning
- Identify areas needing focus
- Track improvement over time

### 15.3 Content Enhancements

**Multiple Question Formats:**
- Audio input/output
- Conversational dialogues
- Cultural context questions
- Idiomatic expressions

**Real-World Context:**
- Situational language use
- Cultural notes
- Practical vocabulary (travel, shopping, etc.)

---

## 16. Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- Database schema updates
- API parameter validation
- Language pair validation service
- Basic prompt engineering for dual-language

### Phase 2: Question Generation (Week 2-3)
- Language studies generator service
- Gemini prompt templates
- Response parsing and validation
- Answer shuffling verification

### Phase 3: UI/UX (Week 3-4)
- Mobile app language selection screens
- Web interface updates
- Form validation and error handling
- Visual language indicators

### Phase 4: Grading & Feedback (Week 4-5)
- Dual-language grading logic
- Feedback formatting in native language
- Grammar/vocabulary explanations
- Results page enhancements

### Phase 5: Testing & Refinement (Week 5-6)
- End-to-end testing with multiple language pairs
- AI output quality validation
- Performance optimization
- Bug fixes and polish

### Phase 6: Documentation & Launch (Week 6-7)
- Complete API documentation
- User guides
- Developer documentation
- Production deployment

---

## 17. Success Metrics

### 17.1 Technical Metrics

- **API Response Time:** <6 seconds for language studies exams
- **Question Quality:** 95%+ questions properly language-tagged
- **Error Rate:** <2% validation failures
- **Cost:** Maintain ~$0.001 per exam

### 17.2 User Experience Metrics

- **Clarity:** Users understand dual-language system (survey)
- **Satisfaction:** Feedback quality rated helpful (survey)
- **Usage:** Adoption rate of language studies category
- **Retention:** Repeat usage for language learning

### 17.3 Educational Metrics

- **Learning Outcomes:** Improvement in language skills (tracked over time)
- **Question Variety:** Diverse question types generated
- **Explanation Quality:** Feedback aids understanding (user feedback)

---

## 18. Risk Assessment & Mitigation

### 18.1 Technical Risks

**Risk:** Gemini fails to maintain language separation
- **Mitigation:** Strict validation, retry logic, fallback prompts

**Risk:** Character encoding issues with non-Latin scripts
- **Mitigation:** UTF-8 throughout, extensive testing with diverse scripts

**Risk:** Performance degradation with complex prompts
- **Mitigation:** Prompt optimization, caching, monitoring

### 18.2 User Experience Risks

**Risk:** Confusion between native/target language selection
- **Mitigation:** Clear UI labels, visual indicators, validation messages

**Risk:** Expectations mismatch for language learning quality
- **Mitigation:** Clear documentation, quality testing, gradual rollout

### 18.3 Business Risks

**Risk:** Low adoption due to complexity
- **Mitigation:** Simple onboarding, popular language pairs highlighted

**Risk:** Cost increase from longer prompts
- **Mitigation:** Token optimization, usage monitoring, cost controls

---

## 19. Conclusion

Implementing language studies requires careful handling of dual-language contexts throughout the entire system - from user input to AI generation to grading feedback. The key differentiator is **explicit language specification** rather than inference, ensuring learners get content in their target language with support in their native language.

**Core Principles:**
1. **Explicit over Implicit:** User specifies both languages
2. **Educational Focus:** Questions and feedback designed for learning
3. **Language Integrity:** Strict separation of native/target languages
4. **Backward Compatible:** No breaking changes to existing functionality
5. **Quality First:** Educational value over quantity

**Next Steps:**
1. Review and approve this plan
2. Create technical specifications for Phase 1
3. Design database migrations
4. Begin prompt engineering experiments
5. Start implementation in phases

This implementation will position ExamGenie as a comprehensive educational platform supporting not just assessment, but active language learning.
