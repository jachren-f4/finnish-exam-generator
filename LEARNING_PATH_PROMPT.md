# Gemini Prompt for Duolingo-Style Learning Path Generation

## Context

This prompt is designed to replace/augment the current exam question generation system. Instead of generating 15 standalone exam questions, it creates a structured learning path with progressive micro-lessons from textbook material.

**Current System**: Single prompt → 15 questions → One exam
**New System**: Single prompt → Learning path analysis → Multiple micro-lessons

---

## The Prompt

```
You are an educational content architect creating a personalized learning path from textbook material.

ANALYZE the provided educational content (textbook images) and CREATE a structured learning journey for a grade {grade} student studying {subject} in {language}.

---

## PHASE 1: CONTENT ANALYSIS

Analyze the textbook material and identify:

1. **CORE CONCEPTS** (8-12 maximum)
   - Extract the fundamental ideas students must master
   - Each concept should be a discrete, testable knowledge unit
   - Name each concept clearly and concisely

2. **DIFFICULTY CLASSIFICATION**
   For each concept, assign ONE tier:
   - **foundational**: Basic facts, definitions, recall-level knowledge
   - **intermediate**: Understanding relationships, comparisons, explanations
   - **advanced**: Application, synthesis, problem-solving

3. **CONCEPTUAL DEPENDENCIES**
   - Which concepts must be understood before others?
   - Create a logical prerequisite chain
   - Example: "Cell structure" must come before "Chloroplast function"

4. **KNOWLEDGE CLUSTERS**
   - Group related concepts that work well together in a single lesson
   - Each cluster = 1-2 concepts maximum
   - Aim for 5-7 total clusters (lessons)

---

## PHASE 2: LEARNING PATH STRUCTURE

Design a learning path with these characteristics:

**LESSON COUNT**: 5-7 lessons total (respect limited source material)

**LESSON DESIGN RULES**:
- Each lesson focuses on 1-2 related concepts
- Lessons follow dependency order (foundational → intermediate → advanced)
- Estimated duration: 3-5 minutes per lesson
- Each lesson should build on previous ones

**LESSON COMPONENTS**:
For each lesson, specify:
1. **Lesson title** (engaging, student-friendly)
2. **Concepts covered** (1-2 from your analysis)
3. **Learning objectives** (what student will understand after completion)
4. **Prerequisite lessons** (which lessons must be completed first, if any)
5. **Estimated question count** (5-7 questions per lesson)

---

## PHASE 3: QUESTION POOL PLANNING

For each concept, estimate:

**QUESTION POTENTIAL**: How many unique questions can be generated?
- Consider: recall, understanding, application levels
- Consider: multiple choice, true/false, fill-in-blank, ordering, matching
- Realistic estimate for 20 pages of material

**QUESTION DIFFICULTY PROGRESSION**:
Within each concept, questions should progress:
1. Easy (recall): Direct facts from material
2. Medium (understanding): Explain relationships
3. Hard (application): Apply knowledge to new scenarios

**SPACED REPETITION OPPORTUNITIES**:
- Which concepts are complex enough to warrant review in later lessons?
- Which foundational concepts should be reinforced throughout the path?

---

## OUTPUT FORMAT

Provide your analysis in this exact JSON structure:

```json
{
  "material_analysis": {
    "subject_detected": "Biology",
    "primary_topics": ["Plant biology", "Photosynthesis", "Cell structure"],
    "grade_level_appropriate": true,
    "total_content_pages": 18,
    "estimated_study_time_minutes": 25
  },

  "concepts": [
    {
      "id": 1,
      "name": "Plant cell structure",
      "tier": "foundational",
      "description": "Understanding the parts of a plant cell and their basic functions",
      "key_facts": [
        "Plant cells have cell walls",
        "Chloroplasts contain chlorophyll",
        "Vacuoles store water and nutrients"
      ],
      "estimated_questions": 8,
      "depends_on": []
    },
    {
      "id": 2,
      "name": "Chloroplast function",
      "tier": "intermediate",
      "description": "How chloroplasts enable photosynthesis",
      "key_facts": [
        "Chloroplasts are the site of photosynthesis",
        "Chlorophyll absorbs light energy",
        "Green color comes from chlorophyll"
      ],
      "estimated_questions": 6,
      "depends_on": [1]
    }
  ],

  "learning_path": {
    "total_lessons": 6,
    "estimated_total_duration_minutes": 25,
    "difficulty_curve": "progressive",

    "lessons": [
      {
        "id": 1,
        "sequence_order": 1,
        "title": "Plant Building Blocks",
        "subtitle": "Discover what makes plant cells special",
        "concept_ids": [1],
        "tier": "foundational",
        "learning_objectives": [
          "Identify the main parts of a plant cell",
          "Explain what makes plant cells different from animal cells",
          "Recognize the function of cell walls and vacuoles"
        ],
        "estimated_duration_minutes": 3,
        "estimated_questions": 5,
        "depends_on_lessons": [],
        "unlocks_lessons": [2, 3]
      },
      {
        "id": 2,
        "sequence_order": 2,
        "title": "The Green Machines",
        "subtitle": "How chloroplasts power plant life",
        "concept_ids": [2],
        "tier": "intermediate",
        "learning_objectives": [
          "Understand the role of chloroplasts in plant cells",
          "Explain why plants are green",
          "Connect cell structure to photosynthesis"
        ],
        "estimated_duration_minutes": 4,
        "estimated_questions": 6,
        "depends_on_lessons": [1],
        "unlocks_lessons": [3]
      },
      {
        "id": 3,
        "sequence_order": 3,
        "title": "Making Food from Sunlight",
        "subtitle": "The magic of photosynthesis",
        "concept_ids": [3, 4],
        "tier": "intermediate",
        "learning_objectives": [
          "Describe the photosynthesis process",
          "Identify the inputs and outputs of photosynthesis",
          "Explain why plants need sunlight"
        ],
        "estimated_duration_minutes": 5,
        "estimated_questions": 7,
        "depends_on_lessons": [1, 2],
        "unlocks_lessons": [4, 5]
      }
    ]
  },

  "adaptive_strategies": {
    "spaced_repetition_concepts": [1, 2, 3],
    "complex_concepts_needing_practice": [4, 5],
    "foundational_concepts_for_review": [1],
    "challenge_mode_concepts": [6, 7, 8]
  },

  "gamification_suggestions": {
    "skill_tree_structure": "linear with branching at lesson 3",
    "mastery_thresholds": {
      "beginner": "60% correct answers",
      "proficient": "80% correct answers",
      "master": "95% correct answers"
    },
    "achievement_milestones": [
      {
        "lesson_id": 3,
        "badge_name": "Photosynthesis Pro",
        "unlock_criteria": "Complete lesson 3 with 100% accuracy"
      },
      {
        "lesson_id": 6,
        "badge_name": "Plant Biology Master",
        "unlock_criteria": "Complete all lessons with 90%+ average"
      }
    ]
  }
}
```

---

## CRITICAL CONSTRAINTS

1. **QUESTION QUALITY OVER QUANTITY**
   - Do not inflate question counts unrealistically
   - Better to have 5 excellent questions than 15 mediocre ones
   - Questions must test understanding, not visual recognition

2. **AVOID THESE COMMON MISTAKES**:
   - ❌ "What does image 1 show?" (requires seeing the image)
   - ❌ "According to the diagram on page 3..." (positional reference)
   - ❌ "The text mentions..." (vague, not testing knowledge)
   - ✅ "What is the function of chloroplasts?" (tests actual knowledge)

3. **LANGUAGE CONSISTENCY**
   - All output (lesson titles, objectives, concept names) must be in {language}
   - Match the formality level of the source material
   - Use age-appropriate vocabulary for grade {grade}

4. **RESPECT SOURCE MATERIAL BOUNDARIES**
   - Only create concepts that are actually covered in the provided content
   - Do not invent information not present in the textbook
   - If material is thin, create fewer high-quality lessons rather than padding

5. **DEPENDENCY LOGIC**
   - Ensure no circular dependencies (Lesson A requires B, B requires A)
   - Foundational lessons should unlock multiple intermediate lessons (branching)
   - Advanced lessons should require multiple prerequisites (convergence)

---

## EDGE CASE HANDLING

**If material is less than 10 pages:**
- Create 3-4 lessons maximum
- Focus on core concepts only
- Increase depth per concept (more question variations)

**If material is very dense (university-level content):**
- Break complex concepts into smaller sub-concepts
- Create more intermediate-tier lessons
- Increase estimated study time

**If material is purely visual (diagrams, charts, minimal text):**
- Focus on visual literacy questions
- "Interpret this graph" rather than "recall this fact"
- Acknowledge limitation in material_analysis notes

**If material is in mixed languages:**
- Detect primary language (most common)
- Note secondary languages in material_analysis
- Generate content in primary language only

---

## EXAMPLE INPUT/OUTPUT

**INPUT**: 18 pages of Finnish biology textbook on plant photosynthesis, grade 5

**OUTPUT**:
- 8 concepts identified (cell structure, chloroplasts, photosynthesis process, glucose production, oxygen release, light energy, carbon dioxide absorption, plant respiration)
- 6 lessons designed (foundational → intermediate → advanced)
- Skill tree structure: Linear progression with branching at lesson 3 (energy pathways split into "making food" vs "using energy")
- 42 estimated questions total across all lessons
- Spaced repetition targeting 3 foundational concepts
- Language: Finnish throughout

---

## VALIDATION CHECKLIST

Before submitting your response, verify:

✅ All concepts have clear names and descriptions
✅ Lesson dependencies form a valid directed acyclic graph (no cycles)
✅ Total lesson count is 5-7 (unless material is very thin/dense)
✅ Each lesson has 5-7 estimated questions
✅ Tier progression goes foundational → intermediate → advanced
✅ All text output is in the specified language
✅ No questions reference visual elements students won't see
✅ JSON structure is valid and complete

---

END OF PROMPT
```

---

## How to Use This Prompt

### Input Variables to Replace

When calling Gemini with this prompt, replace:
- `{grade}` → Student grade level (e.g., "5", "8", "high school")
- `{subject}` → Subject area (e.g., "biology", "mathematics", "history")
- `{language}` → Output language (e.g., "Finnish", "English", "Swedish")

### Gemini API Call Structure

```javascript
// Pseudo-code for API call
const response = await gemini.generateContent({
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    temperature: 0,  // Deterministic output
    responseMimeType: "application/json"  // Enforce JSON response
  },
  contents: [
    {
      role: "user",
      parts: [
        { text: LEARNING_PATH_PROMPT },  // The prompt above
        { inlineData: { mimeType: "image/jpeg", data: base64Image1 } },
        { inlineData: { mimeType: "image/jpeg", data: base64Image2 } },
        // ... up to 20 images
      ]
    }
  ]
});
```

---

## Prompt Engineering Notes

### Why This Prompt Structure Works

1. **Clear Phase Separation**: Analysis → Path Design → Question Planning
   - Helps AI organize thinking before generating output
   - Reduces hallucination by forcing structured reasoning

2. **Explicit Constraints**:
   - "5-7 lessons" prevents AI from creating 50 lessons from 20 pages
   - "No visual references" prevents unusable questions
   - "Respect source material" prevents invention

3. **JSON Schema Enforcement**:
   - Providing exact output structure ensures parseable responses
   - Fields like `depends_on_lessons` enforce dependency logic
   - Nested structure mirrors database schema for easy storage

4. **Examples and Counter-Examples**:
   - ✅/❌ examples teach AI what to avoid
   - Reduces need for post-processing validation

5. **Edge Case Handling**:
   - Explicitly addresses common failure modes
   - Gives AI fallback strategies (fewer lessons for thin material)

### Temperature = 0 Rationale

**Why deterministic?**
- Ensures consistent quality across multiple material uploads
- Makes testing/debugging easier (same input = same output)
- Reduces variance in lesson structure (predictable UX)

**Trade-off:**
- Less "creative" lesson titles/descriptions
- More formulaic question phrasing
- **Acceptable**: Consistency > creativity for educational content

### Potential Prompt Improvements

**Version 2 could add:**
- **Bloom's Taxonomy mapping**: Explicitly tag questions by cognitive level
- **Difficulty calibration**: "Show 3 example questions (easy/medium/hard) for each concept"
- **Misconception detection**: "Identify common student misconceptions about each concept"
- **Cross-concept synthesis**: "Which concepts combine well for challenge questions?"

**For adaptive learning:**
- **Remedial paths**: "For students struggling with concept X, suggest prerequisite review"
- **Accelerated paths**: "For advanced students, which lessons can be skipped/combined?"

---

## Expected Output Quality

### What Good Output Looks Like

**Concept naming:**
- ✅ "Photosynthesis inputs and outputs"
- ✅ "Role of chlorophyll in energy absorption"
- ❌ "Thing 1 from page 3"
- ❌ "Concept about plants"

**Lesson titles:**
- ✅ "Making Food from Sunlight" (engaging, clear)
- ✅ "The Green Machines" (creative, age-appropriate)
- ❌ "Lesson 3: Photosynthesis" (boring, generic)
- ❌ "Advanced Plant Biology Module 2B" (too formal for grade 5)

**Dependencies:**
- ✅ Lesson 1 (cell structure) → Lesson 2 (chloroplasts) → Lesson 3 (photosynthesis)
- ❌ Lesson 3 requires Lesson 5 (impossible, breaks sequence)

**Question estimates:**
- ✅ 6-8 questions for a complex concept (photosynthesis)
- ✅ 4-5 questions for a simple concept (cell wall definition)
- ❌ 25 questions for a single concept (unrealistic from 20 pages)

### What to Watch Out For

**Common AI mistakes:**
1. **Over-segmentation**: Creating 15 concepts from 10 pages of material
   - **Fix**: Emphasize "8-12 maximum" in prompt, add validation

2. **Circular dependencies**: Lesson A requires B, B requires C, C requires A
   - **Fix**: Add "directed acyclic graph" language, post-process validation

3. **Inventing content**: Adding concepts not in source material
   - **Fix**: Strengthen "respect source material boundaries" constraint

4. **Visual references**: "What does the diagram show?"
   - **Fix**: Already addressed in constraints, but validate output

5. **Language mixing**: Titles in English when material is Finnish
   - **Fix**: Repeat language requirement in multiple prompt sections

---

## Validation & Post-Processing

### After Gemini Returns JSON

**Step 1: Schema Validation**
```javascript
// Validate structure matches expected schema
- All required fields present?
- concept_ids reference valid concepts?
- depends_on_lessons has no cycles?
- JSON is valid and parseable?
```

**Step 2: Educational Quality Check**
```javascript
// Validate educational coherence
- Do lesson titles match target grade level?
- Are dependencies logical? (foundational before advanced)
- Total question count realistic? (not 200 questions from 20 pages)
- Language consistency? (all Finnish if source is Finnish)
```

**Step 3: User-Facing Preparation**
```javascript
// Transform for database/UI
- Store concepts in `learning_path_concepts` table
- Store lessons in `lessons` table
- Generate skill tree visualization data from dependencies
- Calculate total estimated time, XP rewards
```

---

## Integration with Existing System

### Where This Prompt Fits

**Current flow:**
```
Upload images → Gemini generates 15 questions → Store in DB → Student takes exam
```

**New flow:**
```
Upload images → Gemini generates learning path → Store in DB
                ↓
Student starts lesson → Gemini generates 5-7 questions for THIS lesson → Store/cache
                ↓
Student completes lesson → Update progress → Unlock next lesson
                ↓
Repeat until path complete
```

### Two-Prompt Strategy

**Prompt 1 (This document)**: Material analysis → Learning path structure
- **When**: Once per textbook upload
- **Output**: Concepts, lessons, dependencies (structure only, no questions yet)
- **Cost**: ~$0.002 per 20-page upload

**Prompt 2 (Existing system, adapted)**: Generate questions for specific lesson
- **When**: Student starts a lesson (on-demand)
- **Input**: Lesson ID, concepts covered, student's previous performance
- **Output**: 5-7 questions for this lesson
- **Cost**: ~$0.0005 per lesson

**Why two prompts?**
- **Performance**: Don't generate all 42 questions upfront (student may not finish path)
- **Adaptability**: Can adjust lesson 4 questions based on performance in lessons 1-3
- **Cost**: Only pay for questions actually used
- **Freshness**: Generate question variations on retry (avoid memorization)

---

## Testing Strategy

### Prompt Quality Testing

**Test Case 1: Typical textbook (18 pages, biology, grade 5)**
- Expected: 6-8 concepts, 5-6 lessons, valid dependency chain
- Validation: Manual review of concept names, lesson structure

**Test Case 2: Thin material (5 pages, vocabulary, grade 3)**
- Expected: 3-4 concepts, 3 lessons, simplified structure
- Validation: Should NOT create 10 lessons from 5 pages

**Test Case 3: Dense material (20 pages, physics, high school)**
- Expected: 10-12 concepts, 7 lessons, complex dependencies
- Validation: Should handle advanced vocabulary, longer study time

**Test Case 4: Non-text content (graphs, diagrams, minimal text)**
- Expected: Acknowledge limitation, visual literacy questions
- Validation: material_analysis.notes should mention visual content

**Test Case 5: Multiple languages (Finnish + Swedish mixed)**
- Expected: Detect primary language, output in Finnish
- Validation: All JSON fields in Finnish (except English keys)

### Iteration Plan

**v1.0**: Basic structure generation (concepts + lessons)
**v1.1**: Add question difficulty progression hints
**v1.2**: Add spaced repetition suggestions
**v1.3**: Add adaptive learning paths (remedial/accelerated)
**v2.0**: Add Bloom's taxonomy mapping, misconception detection

---

## Comparison to Current Exam Generation Prompt

### Current Prompt (exam-questions)
```
"Generate 15 questions from this textbook..."
```

**Strengths:**
- Simple, proven to work
- Single-shot generation (fast)
- Deterministic with temperature=0

**Limitations:**
- No structure (flat list of questions)
- No difficulty progression
- No concept mapping
- Can't adapt to student performance

### New Prompt (learning-path)
```
"Analyze material, create learning path with 5-7 lessons..."
```

**Strengths:**
- Structured output (concepts → lessons → questions)
- Progressive difficulty built-in
- Enables adaptive learning
- Gamification-ready (skill trees, unlocks)

**Limitations:**
- More complex (higher risk of AI errors)
- Requires two-step generation (path, then questions)
- More tokens used (longer prompt)

**Recommendation**: Keep both prompts
- **Exam mode**: Use current prompt (quick assessment)
- **Learning mode**: Use new prompt (progressive mastery)
- Let teachers/students choose experience type

---

## Final Thoughts

### What Makes This Prompt Work

1. **Structured thinking**: Forces AI to analyze before designing
2. **Explicit constraints**: Prevents common failure modes
3. **JSON schema**: Ensures parseable, usable output
4. **Educational grounding**: Dependency logic, Bloom's taxonomy awareness
5. **Practical limits**: Respects 20-page constraint, realistic question counts

### What Could Go Wrong

1. **AI ignores constraints**: Generates 50 concepts from 10 pages
   - **Mitigation**: Post-process validation, reject and retry with stricter prompt

2. **Circular dependencies**: Lesson structure is logically impossible
   - **Mitigation**: Validate DAG (directed acyclic graph), break cycles programmatically

3. **Language mixing**: Finnish content but English output
   - **Mitigation**: Repeat language requirement, validate output language

4. **Invented content**: AI adds concepts not in material
   - **Mitigation**: Compare concept descriptions to source text (similarity check)

### Next Steps for Testing

1. **Run prompt against 5 diverse textbook samples**
   - Biology, math, history, language studies, physics
   - Grades 3, 5, 8, high school
   - Finnish, English, Swedish languages

2. **Manual quality review**
   - Are concept names accurate?
   - Do dependencies make sense?
   - Are lesson titles engaging?
   - Question counts realistic?

3. **JSON validation**
   - Parse output programmatically
   - Check schema compliance
   - Validate data types, required fields

4. **A/B comparison with current system**
   - Same textbook through exam prompt vs. learning path prompt
   - Compare output quality, usability, student engagement (if piloted)

5. **Iterate based on findings**
   - Strengthen weak constraint areas
   - Add examples for common failure modes
   - Simplify if AI struggles with complexity

---

**This prompt is ready to test with real textbook content. Start with a known-good sample (like the biology photosynthesis material) to establish baseline quality, then iterate from there.**
