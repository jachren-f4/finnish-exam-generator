# 📋 Step-by-Step Prompt Testing Execution Plan

## 🎯 Overview
**Objective**: Test 20 prompt variations for Ympäristöoppi (Environmental Studies) question generation
**Duration**: ~2-3 hours
**Expected Output**: Optimal prompt + comprehensive results document

---

## 📝 Pre-Testing Setup (5 minutes)

### Step 1: Verify Materials
- [x] OCR text ready in `assets/images/page2_ocr.txt`
- [x] Testing plan document: `QUESTION_QUALITY_TESTING_PLAN.md`
- [x] Results template: `PROMPT_TESTING_RESULTS.md`
- [ ] Current system prompt location confirmed: `src/lib/config.ts`

### Step 2: Prepare Testing Environment
- [ ] Confirm API is running (localhost or production)
- [ ] Open results document for real-time updates
- [ ] Set up Finnish teacher evaluation mindset

---

## 🔬 Testing Execution (2-2.5 hours)

### Phase 1: Baseline Testing (15 minutes)

#### Step 3: Run Iteration 1 - Current System Baseline
```bash
# Test current system prompt
curl -X POST http://localhost:3000/api/mobile/exam-questions \
  -F "images=@assets/images/page2.jpeg" \
  -F "subject=Ympäristöoppi" \
  -F "grade=5"
```

**Tasks:**
- [ ] Execute API call
- [ ] Save raw response to file
- [ ] Extract 10 generated questions
- [ ] Evaluate each question (Finnish teacher perspective):
  - [ ] Grade appropriateness (1-10)
  - [ ] Learning objectives (1-10)
  - [ ] Question quality (1-10)
  - [ ] Language quality (1-10)
  - [ ] Content accuracy (Pass/Fail)
- [ ] Calculate overall score
- [ ] Document top 3 strengths
- [ ] Document top 3 issues
- [ ] Update results table

#### Step 4: Document Baseline Findings
- [ ] Record baseline score in results document
- [ ] Identify key areas for improvement
- [ ] Note specific problem patterns

---

### Phase 2: Core Improvements (60 minutes - Iterations 2-7)

#### Step 5: Iteration 2 - Enhanced Pedagogical Prompt
**Prompt Modification:**
```
Change system prompt to focus on:
- Ympäristöoppi curriculum alignment
- Safety-first educational approach
- Age-appropriate 5th grade language
- Understanding vs memorization
```

**Tasks:**
- [ ] Modify prompt in `src/lib/config.ts`
- [ ] Run API test
- [ ] Evaluate 10 questions
- [ ] Compare to baseline
- [ ] Document improvements/regressions
- [ ] Update results table

#### Step 6: Iteration 3 - Bloom's Taxonomy Focus
**Prompt Modification:**
```
Structure questions by cognitive levels:
- 40% Memory/Understanding
- 50% Application/Analysis
- 10% Evaluation/Creation
```

**Tasks:**
- [ ] Modify prompt
- [ ] Run test
- [ ] Evaluate with focus on cognitive complexity
- [ ] Document results

#### Step 7: Iteration 4 - Finnish Context Enhancement
**Prompt Modification:**
```
Add explicit Finnish cultural context:
- Finnish home safety standards
- Finnish electrical systems
- Local emergency procedures
- Natural Finnish language patterns
```

**Tasks:**
- [ ] Modify prompt
- [ ] Run test
- [ ] Evaluate authenticity
- [ ] Document cultural appropriateness

#### Step 8: Iteration 5 - Question Type Distribution
**Prompt Modification:**
```
Specify exact question type mix:
- 4 factual questions
- 3 comprehension questions
- 2 application questions
- 1 evaluation question
```

**Tasks:**
- [ ] Modify prompt
- [ ] Run test
- [ ] Check question type distribution
- [ ] Evaluate variety and balance

#### Step 9: Iteration 6 - Safety Education Focus
**Prompt Modification:**
```
Emphasize safety learning outcomes:
- Practical safety behaviors
- Risk recognition
- Emergency response knowledge
- Preventive thinking
```

**Tasks:**
- [ ] Modify prompt
- [ ] Run test
- [ ] Evaluate safety education value
- [ ] Document practical applicability

#### Step 10: Iteration 7 - Real-World Application
**Prompt Modification:**
```
Connect to student daily experiences:
- Home environment scenarios
- Age-appropriate responsibilities
- Family safety discussions
- Peer learning opportunities
```

**Tasks:**
- [ ] Modify prompt
- [ ] Run test
- [ ] Evaluate relatability
- [ ] Document engagement potential

**Phase 2 Review:**
- [ ] Compare all 7 iterations so far
- [ ] Identify top performing elements
- [ ] Note emerging patterns
- [ ] Plan hybrid approaches for Phase 3

---

### Phase 3: Optimization & Hybrids (45 minutes - Iterations 8-14)

#### Step 11: Create Hybrid Prompts (Iterations 8-11)
**Process:**
1. Identify best elements from Iterations 2-7
2. Combine top 2-3 approaches into hybrid prompts
3. Test 4 different hybrid combinations

**Tasks for each hybrid:**
- [ ] Design hybrid prompt combining best elements
- [ ] Run test
- [ ] Compare to individual components
- [ ] Document synergistic effects

#### Step 12: Fine-Tuning (Iterations 12-14)
**Focus Areas:**
- Answer quality enhancement
- Difficulty calibration
- Format consistency optimization

**Tasks:**
- [ ] Test refined versions of best hybrids
- [ ] Focus on fixing remaining issues
- [ ] Optimize for consistency

---

### Phase 4: Final Validation (30 minutes - Iterations 15-20)

#### Step 13: Best Candidate Testing (Iterations 15-18)
**Process:**
1. Select top 4 prompts from previous phases
2. Re-test with additional scrutiny
3. Validate consistency

**Tasks:**
- [ ] Run 4 final candidate tests
- [ ] Apply strictest evaluation criteria
- [ ] Look for edge cases or inconsistencies

#### Step 14: Final Optimization (Iterations 19-20)
**Process:**
1. Take absolute best performer
2. Make minor refinements
3. Validate final version

**Tasks:**
- [ ] Create two final refined versions
- [ ] Test both
- [ ] Select optimal prompt

---

## 📊 Results Analysis & Documentation (30 minutes)

### Step 15: Compile Results
- [ ] Complete results table for all 20 iterations
- [ ] Calculate improvement percentages
- [ ] Identify top 5 performers
- [ ] Document quality score progression

### Step 16: Finnish Teacher Analysis
- [ ] Write detailed analysis of what made questions high-quality
- [ ] Document common issues across iterations
- [ ] Provide authentic teacher's perspective
- [ ] Include best/worst example questions

### Step 17: Pattern Analysis
- [ ] Identify prompt elements that improved quality
- [ ] Document elements that reduced quality
- [ ] Define optimal prompt structure
- [ ] Create reusable guidelines

### Step 18: Production Recommendations
- [ ] Finalize optimal prompt for production
- [ ] Write implementation guidelines
- [ ] Create quality assurance checklist
- [ ] Document expected performance metrics

### Step 19: Complete Results Document
- [ ] Fill in executive summary
- [ ] Update all tables and metrics
- [ ] Add lessons learned section
- [ ] Include next steps recommendations

---

## ✅ Final Deliverables

### Step 20: Quality Check & Delivery
- [ ] Review completed results document
- [ ] Verify optimal prompt is production-ready
- [ ] Confirm all 20 iterations documented
- [ ] Check that improvement trajectory is clear

**Final Outputs:**
1. **Optimal Production Prompt** - Ready for `src/lib/config.ts`
2. **Complete Results Analysis** - `PROMPT_TESTING_RESULTS.md`
3. **Quality Improvement Data** - Quantified improvements
4. **Implementation Guidelines** - How to deploy the winning prompt

---

## 🚀 Success Criteria

**Minimum Acceptable Results:**
- [ ] 20% improvement in overall question quality
- [ ] 8/10 or higher in grade appropriateness
- [ ] 8/10 or higher in Finnish language quality
- [ ] 95%+ content accuracy rate

**Excellence Goals:**
- [ ] 30%+ improvement in overall question quality
- [ ] 9/10 or higher across all categories
- [ ] Production-ready prompt identified
- [ ] Clear guidelines for other subjects

---

## ⏰ Time Management

- **Setup**: 5 minutes
- **Baseline**: 15 minutes
- **Core Improvements**: 60 minutes (6 iterations × 10 min each)
- **Optimization**: 45 minutes (7 iterations × 6-7 min each)
- **Final Validation**: 30 minutes (6 iterations × 5 min each)
- **Analysis & Documentation**: 30 minutes
- **Total**: ~2.5 hours

---

**Ready to Execute**: This plan provides clear, actionable steps to systematically improve prompt quality and deliver production-ready results with comprehensive documentation.

---

## 📋 Complete Task Checklist

### 🔧 Pre-Testing Setup
- [ ] **Setup-1**: Verify OCR text ready in `assets/images/page2_ocr.txt`
- [ ] **Setup-2**: Confirm testing plan document exists: `QUESTION_QUALITY_TESTING_PLAN.md`
- [ ] **Setup-3**: Verify results template exists: `PROMPT_TESTING_RESULTS.md`
- [ ] **Setup-4**: Locate current system prompt in `src/lib/config.ts`
- [ ] **Setup-5**: Confirm API is running (localhost:3000 or production)
- [ ] **Setup-6**: Open results document for real-time updates
- [ ] **Setup-7**: Set Finnish teacher evaluation mindset

### 🏁 Phase 1: Baseline Testing
- [ ] **Iter1-1**: Execute current system prompt API call
- [ ] **Iter1-2**: Save raw response to file
- [ ] **Iter1-3**: Extract 10 generated questions
- [ ] **Iter1-4**: Rate grade appropriateness (1-10)
- [ ] **Iter1-5**: Rate learning objectives (1-10)
- [ ] **Iter1-6**: Rate question quality (1-10)
- [ ] **Iter1-7**: Rate language quality (1-10)
- [ ] **Iter1-8**: Check content accuracy (Pass/Fail)
- [ ] **Iter1-9**: Calculate overall baseline score
- [ ] **Iter1-10**: Document top 3 strengths
- [ ] **Iter1-11**: Document top 3 issues
- [ ] **Iter1-12**: Update results table with baseline
- [ ] **Iter1-13**: Identify key areas for improvement
- [ ] **Iter1-14**: Note specific problem patterns

### 🚀 Phase 2: Core Improvements (Iterations 2-7)
- [ ] **Iter2-1**: Modify prompt for Enhanced Pedagogical approach
- [ ] **Iter2-2**: Run API test for Iteration 2
- [ ] **Iter2-3**: Evaluate 10 questions (all criteria)
- [ ] **Iter2-4**: Compare to baseline scores
- [ ] **Iter2-5**: Document improvements/regressions
- [ ] **Iter2-6**: Update results table

- [ ] **Iter3-1**: Modify prompt for Bloom's Taxonomy focus
- [ ] **Iter3-2**: Run API test for Iteration 3
- [ ] **Iter3-3**: Evaluate cognitive complexity levels
- [ ] **Iter3-4**: Check question type distribution (40/50/10)
- [ ] **Iter3-5**: Document cognitive level effectiveness
- [ ] **Iter3-6**: Update results table

- [ ] **Iter4-1**: Modify prompt for Finnish Context Enhancement
- [ ] **Iter4-2**: Run API test for Iteration 4
- [ ] **Iter4-3**: Evaluate cultural appropriateness
- [ ] **Iter4-4**: Check Finnish language authenticity
- [ ] **Iter4-5**: Assess local context relevance
- [ ] **Iter4-6**: Update results table

- [ ] **Iter5-1**: Modify prompt for Question Type Distribution
- [ ] **Iter5-2**: Run API test for Iteration 5
- [ ] **Iter5-3**: Count question types (4 factual, 3 comprehension, 2 application, 1 evaluation)
- [ ] **Iter5-4**: Evaluate variety and balance
- [ ] **Iter5-5**: Check distribution compliance
- [ ] **Iter5-6**: Update results table

- [ ] **Iter6-1**: Modify prompt for Safety Education Focus
- [ ] **Iter6-2**: Run API test for Iteration 6
- [ ] **Iter6-3**: Evaluate practical safety behaviors
- [ ] **Iter6-4**: Check risk recognition elements
- [ ] **Iter6-5**: Assess emergency response knowledge
- [ ] **Iter6-6**: Update results table

- [ ] **Iter7-1**: Modify prompt for Real-World Application
- [ ] **Iter7-2**: Run API test for Iteration 7
- [ ] **Iter7-3**: Evaluate home environment relevance
- [ ] **Iter7-4**: Check age-appropriate scenarios
- [ ] **Iter7-5**: Assess student engagement potential
- [ ] **Iter7-6**: Update results table

- [ ] **Phase2-Review**: Compare all 7 iterations completed
- [ ] **Phase2-Patterns**: Identify top performing elements
- [ ] **Phase2-Plan**: Plan hybrid approaches for Phase 3

### 🔧 Phase 3: Optimization & Hybrids (Iterations 8-14)
- [ ] **Hybrid-1**: Design first hybrid combining best elements
- [ ] **Iter8-1**: Test Hybrid #1 - Run API call
- [ ] **Iter8-2**: Evaluate and compare to components
- [ ] **Iter8-3**: Update results table

- [ ] **Hybrid-2**: Design second hybrid combination
- [ ] **Iter9-1**: Test Hybrid #2 - Run API call
- [ ] **Iter9-2**: Evaluate synergistic effects
- [ ] **Iter9-3**: Update results table

- [ ] **Hybrid-3**: Design third hybrid combination
- [ ] **Iter10-1**: Test Hybrid #3 - Run API call
- [ ] **Iter10-2**: Compare hybrid performance
- [ ] **Iter10-3**: Update results table

- [ ] **Hybrid-4**: Design fourth hybrid combination
- [ ] **Iter11-1**: Test Hybrid #4 - Run API call
- [ ] **Iter11-2**: Evaluate best hybrid candidate
- [ ] **Iter11-3**: Update results table

- [ ] **Fine-1**: Create Answer Quality Enhancement version
- [ ] **Iter12-1**: Test refined version - Run API call
- [ ] **Iter12-2**: Focus on answer option quality
- [ ] **Iter12-3**: Update results table

- [ ] **Fine-2**: Create Difficulty Calibration version
- [ ] **Iter13-1**: Test calibrated version - Run API call
- [ ] **Iter13-2**: Check 5th grade difficulty level
- [ ] **Iter13-3**: Update results table

- [ ] **Fine-3**: Create Format Consistency version
- [ ] **Iter14-1**: Test consistency version - Run API call
- [ ] **Iter14-2**: Evaluate format uniformity
- [ ] **Iter14-3**: Update results table

### 🏆 Phase 4: Final Validation (Iterations 15-20)
- [ ] **Select-1**: Identify top 4 prompts from all previous iterations
- [ ] **Iter15-1**: Re-test Best Candidate #1 with strict criteria
- [ ] **Iter15-2**: Apply strictest evaluation standards
- [ ] **Iter15-3**: Look for edge cases/inconsistencies
- [ ] **Iter15-4**: Update results table

- [ ] **Iter16-1**: Re-test Best Candidate #2
- [ ] **Iter16-2**: Validate consistency and quality
- [ ] **Iter16-3**: Update results table

- [ ] **Iter17-1**: Re-test Best Candidate #3
- [ ] **Iter17-2**: Compare final candidates
- [ ] **Iter17-3**: Update results table

- [ ] **Iter18-1**: Re-test Best Candidate #4
- [ ] **Iter18-2**: Rank all final candidates
- [ ] **Iter18-3**: Update results table

- [ ] **Final-1**: Take absolute best performer
- [ ] **Final-2**: Create minor refinement version
- [ ] **Iter19-1**: Test Final Refinement #1
- [ ] **Iter19-2**: Evaluate refinement effectiveness
- [ ] **Iter19-3**: Update results table

- [ ] **Iter20-1**: Test Final Refinement #2
- [ ] **Iter20-2**: Select optimal final prompt
- [ ] **Iter20-3**: Complete results table

### 📊 Results Analysis & Documentation
- [ ] **Results-1**: Complete results table for all 20 iterations
- [ ] **Results-2**: Calculate improvement percentages
- [ ] **Results-3**: Identify and rank top 5 performers
- [ ] **Results-4**: Document quality score progression
- [ ] **Results-5**: Write Finnish teacher analysis section
- [ ] **Results-6**: Document common issues across iterations
- [ ] **Results-7**: Include best/worst example questions
- [ ] **Results-8**: Identify prompt elements that improved quality
- [ ] **Results-9**: Document elements that reduced quality
- [ ] **Results-10**: Define optimal prompt structure
- [ ] **Results-11**: Create reusable guidelines
- [ ] **Results-12**: Finalize optimal prompt for production
- [ ] **Results-13**: Write implementation guidelines
- [ ] **Results-14**: Create quality assurance checklist
- [ ] **Results-15**: Document expected performance metrics
- [ ] **Results-16**: Fill in executive summary
- [ ] **Results-17**: Add lessons learned section
- [ ] **Results-18**: Include next steps recommendations

### ✅ Final Quality Check & Delivery
- [ ] **Final-QC-1**: Review completed results document
- [ ] **Final-QC-2**: Verify optimal prompt is production-ready
- [ ] **Final-QC-3**: Confirm all 20 iterations documented
- [ ] **Final-QC-4**: Check improvement trajectory is clear
- [ ] **Final-QC-5**: Validate success criteria met
- [ ] **Final-QC-6**: Prepare final deliverables package

### 🎯 Success Criteria Validation
- [ ] **Success-1**: Achieved 20%+ improvement in overall question quality
- [ ] **Success-2**: Achieved 8/10+ in grade appropriateness
- [ ] **Success-3**: Achieved 8/10+ in Finnish language quality
- [ ] **Success-4**: Achieved 95%+ content accuracy rate
- [ ] **Success-5**: Production-ready prompt identified and documented
- [ ] **Success-6**: Clear implementation guidelines created

---

**Total Tasks**: 120+ individual tasks across 20 iterations
**Estimated Time**: 2.5-3 hours
**Success Tracking**: Checkboxes allow real-time progress monitoring