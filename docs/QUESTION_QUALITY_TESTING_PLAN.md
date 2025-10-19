# 📊 ExamGenie Question Quality Testing & Iteration Plan

## 🎯 Objective
**FOCUSED TESTING APPROACH**: Use 4 geography textbook pages to systematically test and improve AI prompt quality through 20 iterations, with Finnish teacher-perspective evaluation of generated exam questions.

---

## Phase 1: Test Setup & Materials 📚

### 1.1 Source Material: Ympäristöoppi (Environmental Studies) Textbook Pages
- **Primary Content**: `assets/images/page2.jpeg` with OCR text in `assets/images/page2_ocr.txt`
- **Topics Covered**:
  - Fire safety at home (Tulipalovaara kotona)
  - Fire prevention and emergency response
  - Electricity basics (Sähköllä saadaan aikaan valoa, lämpöä ja liikettä)
  - Electrical safety and devices
- **Grade Level**: 5th grade (10-11 year olds)
- **Subject**: Ympäristöoppi (Environmental Studies)

### 1.2 Finnish Teacher Quality Assessment Criteria
```yaml
Quality Scoring (1-10 scale per category):

PEDAGOGICAL QUALITY:
  Grade Appropriateness:
    - 9-10: Perfect vocabulary/complexity for target grade
    - 7-8: Mostly appropriate, minor adjustments needed
    - 5-6: Some content too easy/difficult for grade level
    - 3-4: Significant grade-level mismatches
    - 1-2: Completely inappropriate for grade

  Learning Objective Clarity:
    - 9-10: Clear learning goals, tests real understanding
    - 7-8: Good objectives, mostly tests comprehension
    - 5-6: Adequate objectives, some memorization focus
    - 3-4: Unclear objectives, mainly memorization
    - 1-2: No clear learning purpose

  Question Quality:
    - 9-10: Excellent phrasing, unambiguous, authentic
    - 7-8: Good questions, minor clarity issues
    - 5-6: Adequate questions, some ambiguity
    - 3-4: Poor phrasing, confusing structure
    - 1-2: Incomprehensible or trick questions

TECHNICAL ACCURACY:
  Content Accuracy: Pass/Fail
  Finnish Language Quality: 1-10 scale
  Format Consistency: Pass/Fail

OVERALL SCORE: Average of all categories (1-10)
```

---

## Phase 2: Iterative Testing Process 🔄

### 2.1 Testing Protocol
```markdown
FOR EACH ITERATION (20 total):

1. PREPARATION:
   - Use OCR text from assets/images/page2_ocr.txt (Ympäristöoppi content)
   - Design prompt variation
   - Set parameters (subject: Ympäristöoppi, grade: 5)

2. EXECUTION:
   - Submit to /api/mobile/exam-questions
   - Generate exactly 10 questions per page
   - Record all metadata (processing time, costs, etc.)

3. EVALUATION (Finnish Teacher Perspective):
   - Score each of 10 questions individually
   - Calculate average scores per category
   - Identify specific strengths/weaknesses
   - Note patterns and improvements

4. DOCUMENTATION:
   - Record prompt text used
   - Save all generated questions
   - Document quality scores
   - Note observations and next iteration ideas
```

### 2.2 Prompt Evolution Strategy
```python
ITERATION THEMES:
1-4:   Baseline & Basic Improvements
5-8:   Grade-Level Specialization
9-12:  Finnish Curriculum Integration
13-16: Question Type & Format Optimization
17-20: Final Refinements & Best Combinations

PROMPT VARIABLES TO TEST:
- Instructional tone (formal vs conversational)
- Question type distribution
- Difficulty specifications
- Finnish curriculum keywords
- Example question formats
- Context provision level
- Assessment philosophy
```

---

## Phase 3: 20 Prompt Iterations 🎯

### 3.1 Iteration Execution Plan

#### Step 1: OCR Text Extraction (One-time setup)
```bash
# OCR text already extracted manually and saved in:
# assets/images/page2_ocr.txt
# Content: Fire safety and electricity topics from Ympäristöoppi textbook
```

#### Step 2: 20 Iterations with Different Prompts
**Testing Parameters:**
- Subject: Ympäristöoppi (Environmental Studies)
- Grade: 5 (5th grade, ages 10-11)
- Questions per test: 10
- Content: Fire safety + Electricity basics
- Evaluation: Finnish teacher perspective

### 3.2 Sample Prompt Variations (First 5 Iterations)

**Iteration 1: Current Baseline**
```
Current system prompt (control group)
```

**Iteration 2: Enhanced Pedagogical**
```
Lue ympäristöoppi-aineisto ja luo 10 oppimispainotteista kysymystä 5. luokkalaisille.

OPETUSSUUNNITELMA: Suomen perusopetuksen ympäristöoppi
AIHEET: Turvallisuuskasvatus ja sähkön perusteet
TAVOITE: Testa ymmärrystä ja turvallisuustietoutta, ei ulkoa oppimista
TASO: 5. luokka (10-11 vuotiaat)

Luo kysymyksiä jotka:
- Testaavat turvallisuuskäsitteiden ymmärtämistä
- Soveltavat sähkötietoa arkitilanteisiin
- Kehittävät vastuullista käyttäytymistä
- Käyttävät ikätasolle sopivaa kieltä

JSON-muoto: [kysymykset, vaihtoehdot, oikea vastaus, selitys]
```

**Iteration 3: Bloom's Taxonomy Focus**
```
Analysoi ympäristöoppi-teksti ja luo 10 kysymystä Bloomin taksonomiaa noudattaen:

VAIKEUSTASOT 5. luokalle:
- Taso 1-2: Muistaminen ja ymmärtäminen (40%)
- Taso 3-4: Soveltaminen ja analysointi (50%)
- Taso 5-6: Arviointi ja luominen (10%)

KYSYMYSTYYPIT:
- Mitä tarkoittaa...? (muistaminen)
- Miksi tapahtuu...? (ymmärtäminen)
- Miten voisit käyttää...? (soveltaminen)
- Vertaile ja analysoi... (analysointi)

Varmista että jokainen kysymys testaa eri kognitiivista tasoa.
```

**Iteration 4: Finnish Context Enhancement**
```
Luo 10 ympäristöopin kysymystä suomalaisesta näkökulmasta:

KONTEKSTI: Suomalainen peruskoulu, 5. luokka
KULTTUURI: Käytä suomalaisia esimerkkejä ja viittauksia
KIELI: Luonteva suomen kieli, ei käännöskieltä

KYSYMYSFORMAATTI:
- Selkeät ja yksiselitteiset kysymykset
- Neljä järkevää vastausvaihtoehtoa
- Realistiset harhauttajat (ei ilmeisen vääriä)
- Perusteltu selitys oikealle vastaukselle

Välttele:
- Ansoja ja temppukysymyksiä
- Liian helppoja tai vaikeita kysymyksiä
- Epäselviä muotoiluja
```

**Iteration 5: Question Type Distribution**
```
Luo täsmälleen 10 kysymystä seuraavalla jaottelulla:

KYSYMYSTYYPIT:
- 4 kpl: Faktakysymykset (mitä, missä, milloin)
- 3 kpl: Ymmärtämiskysymykset (miksi, miten)
- 2 kpl: Soveltamiskysymykset (entä jos, mitä tapahtuisi)
- 1 kpl: Arviointikysymys (vertaa, päättele)

LAATU-KRITEERIT:
✓ Perustuu annettuun tekstiin
✓ Ikätasolle sopiva (5. luokka)
✓ Selkeä suomen kieli
✓ Opettavainen, ei vain testaa muistia
```

---

## Phase 4: Iteration Strategy 🔄

### 4.1 Prompt Engineering Iterations

```markdown
ITERATION 1: BASELINE ENHANCEMENT
- Add explicit Finnish curriculum alignment
- Include Bloom's taxonomy levels
- Specify question distribution requirements

ITERATION 2: SUBJECT SPECIALIZATION
- Create subject-specific prompt templates
- Add domain vocabulary requirements
- Include typical exam patterns

ITERATION 3: GRADE SCAFFOLDING
- Implement grade-specific complexity rules
- Add vocabulary difficulty constraints
- Include age-appropriate contexts

ITERATION 4: PEDAGOGICAL OPTIMIZATION
- Balance memorization vs understanding
- Add critical thinking elements
- Include multi-step problems

ITERATION 5: CULTURAL LOCALIZATION
- Add Finnish cultural contexts
- Include local examples
- Ensure inclusive language
```

### 4.2 Feedback Loop Implementation
```
CONTINUOUS IMPROVEMENT CYCLE:
1. Generate Questions →
2. Evaluate Quality →
3. Identify Patterns →
4. Adjust Prompts →
5. A/B Test Changes →
6. Measure Impact →
7. Deploy Best Version →
(Repeat)
```

---

## Phase 5: Success Metrics & KPIs 📈

### 5.1 Target Metrics
```yaml
Quality Targets:
  Minimum Acceptable:
    - Accuracy: 95%
    - Grade Appropriateness: 7/10
    - Clarity: 8/10
    - Pedagogical Value: 7/10

  Excellence Goals:
    - Accuracy: 99%
    - Grade Appropriateness: 9/10
    - Clarity: 9/10
    - Pedagogical Value: 9/10
    - Teacher Approval Rate: 85%
```

### 5.2 Testing Checkpoints
```
MILESTONE REVIEW POINTS:
├── After 100 questions: Initial patterns
├── After 500 questions: Statistical significance
├── After 1000 questions: Reliability confirmation
└── After 2000 questions: Production readiness
```

---

## Phase 4: Results Tracking & Analysis 📊

### 4.1 Iteration Results Log

| Iteration | Prompt Type | Overall Score | Grade Appropriateness | Question Quality | Language Quality | Best Features | Issues Found |
|-----------|-------------|---------------|---------------------|-----------------|------------------|---------------|--------------|
| 1 | Baseline | - | - | - | - | - | - |
| 2 | Enhanced Pedagogical | - | - | - | - | - | - |
| 3 | Bloom's Taxonomy | - | - | - | - | - | - |
| 4 | Finnish Context | - | - | - | - | - | - |
| 5 | Question Distribution | - | - | - | - | - | - |
| ... | | | | | | | |
| 20 | Final Optimized | - | - | - | - | - | - |

### 4.2 Execution Schedule

**Day 1-2: Setup & Baseline**
- Extract OCR from page2.jpeg
- Run Iteration 1 (baseline)
- Establish evaluation criteria
- Document initial findings

**Day 3-7: Rapid Iterations (Iterations 2-10)**
- Test 2 variations per day
- Focus on major prompt structure changes
- Quick evaluation and documentation

**Day 8-12: Refinement Iterations (Iterations 11-20)**
- Test hybrid approaches
- Combine best elements from previous tests
- Fine-tune successful patterns

**Day 13: Analysis & Conclusion**
- Compare all iterations
- Identify optimal prompt
- Create final recommendations

---

## Phase 7: Documentation & Reporting 📝

### 7.1 Test Result Documentation
```markdown
For Each Test Session:
- Test ID & Timestamp
- Input Parameters
  - Image characteristics
  - Subject & Grade
  - Prompt version used
- Output Analysis
  - Questions generated
  - Quality scores
  - Issues identified
- Recommendations
  - Prompt adjustments
  - Parameter tuning
  - Future improvements
```

### 7.2 Pattern Recognition Log
```yaml
Common Issues to Track:
  - Question too easy/hard for grade
  - Vocabulary mismatches
  - Cultural context errors
  - Format inconsistencies
  - Subject matter confusion
  - Language/grammar issues

Success Patterns to Replicate:
  - Effective prompt phrases
  - Optimal parameter combinations
  - Subject-specific templates
  - Grade-appropriate patterns
```

---

## Phase 8: Implementation Recommendations 💡

### 8.1 Quick Wins (Immediate)
1. Add explicit grade-level vocabulary constraints
2. Include "avoid trick questions" instruction
3. Specify desired difficulty distribution
4. Add Finnish curriculum keywords

### 8.2 Medium-Term Improvements
1. Create subject-specific prompt templates
2. Implement question type rotation
3. Add pedagogical quality checks
4. Include example questions in prompts

### 8.3 Long-Term Enhancements
1. Build question quality ML classifier
2. Create teacher feedback system
3. Implement adaptive prompting
4. Develop question bank for comparison

---

## 🎯 Expected Outcomes

After completing this focused testing:
1. **Optimal prompt identified** from 20 variations
2. **Finnish teacher-quality standards** met
3. **Grade 5 geography question mastery** achieved
4. **Reusable prompt template** for geography subjects
5. **Quality improvement metrics** documented

---

## Test Execution Tracking

### Current Status: [ ] Ready to Start

### 20-Iteration Test Log

#### Quick Reference Test Form:
```
ITERATION #: ___
DATE: ___________
PROMPT TYPE: ___________

SCORES (Finnish Teacher Perspective):
├── Grade Appropriateness (1-10): ___
├── Learning Objectives (1-10): ___
├── Question Quality (1-10): ___
├── Language Quality (1-10): ___
└── Content Accuracy (Pass/Fail): ___

OVERALL SCORE: ___/10

TOP 3 STRENGTHS:
1. ________________________________
2. ________________________________
3. ________________________________

TOP 3 ISSUES:
1. ________________________________
2. ________________________________
3. ________________________________

NEXT ITERATION IDEA:
_____________________________________
```

#### Iteration Checklist:
- [ ] Iteration 1: Baseline (Current System)
- [ ] Iteration 2: Enhanced Pedagogical
- [ ] Iteration 3: Bloom's Taxonomy
- [ ] Iteration 4: Finnish Context
- [ ] Iteration 5: Question Distribution
- [ ] Iteration 6: Curriculum Keywords
- [ ] Iteration 7: Assessment Philosophy
- [ ] Iteration 8: Grade-Specific Language
- [ ] Iteration 9: Real-World Applications
- [ ] Iteration 10: Critical Thinking Focus
- [ ] Iteration 11: Best Elements Hybrid #1
- [ ] Iteration 12: Best Elements Hybrid #2
- [ ] Iteration 13: Format Optimization
- [ ] Iteration 14: Difficulty Calibration
- [ ] Iteration 15: Answer Quality Enhancement
- [ ] Iteration 16: Finnish Education Standards
- [ ] Iteration 17: Student Engagement Focus
- [ ] Iteration 18: Final Optimization #1
- [ ] Iteration 19: Final Optimization #2
- [ ] Iteration 20: Best Prompt Validation

---

## Ready to Execute?

**FOCUSED PLAN**: Test 20 prompt variations with 1 geography textbook page, evaluate each set of 10 questions from a Finnish teacher perspective, identify the optimal prompt for production use.

**Execution Time**: ~2-3 hours total
**Expected Result**: 30-50% improvement in question quality
**Deliverable**: Optimized prompt template for Ympäristöoppi subjects + detailed results document

**Next Step**: Begin Iteration 1 baseline testing using existing OCR text, then document findings.

---

## Sample Individual Question Evaluation

```
QUESTION #: ___
TEXT: "________________________________"

FINNISH TEACHER EVALUATION:
├── Would I use this in my class? (Y/N): ___
├── Grade appropriateness (1-10): ___
├── Tests understanding vs memory (1-10): ___
├── Clear and unambiguous (1-10): ___
├── Authentic Finnish language (1-10): ___

SPECIFIC FEEDBACK:
Good: ________________________________
Issues: ______________________________
Suggestions: _________________________
```