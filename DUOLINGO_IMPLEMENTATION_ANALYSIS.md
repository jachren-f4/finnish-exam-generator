# Duolingo-Style Learning System: Existing Codebase Analysis & Implementation Plan

## Executive Summary

After analyzing the existing ExamGenie codebase, I've identified significant reusable infrastructure that can accelerate the Duolingo-style learning system implementation. The codebase is well-architected with clear separation of concerns, making it ideal for extending into a progressive learning platform.

**Key Finding**: We can reuse ~70% of existing infrastructure and need to add ~30% new components for the learning path system.

---

## Current System Architecture Analysis

### What We Have: Component Inventory

#### ✅ **1. AI Integration Layer (FULLY REUSABLE)**

**Location**: `/src/lib/services/ai-providers/`

**Components**:
- `GeminiProvider` - Wraps Gemini API with temperature=0 for deterministic output
- `AIProvider` interface - Abstract provider pattern (supports multi-provider)
- `QuestionGeneratorService` - Handles question generation with retry logic
- Automatic retry on 503 errors with exponential backoff

**Reusability**: **100%** - Can be used as-is for learning path generation
- Already supports custom prompts (perfect for our new learning path prompt)
- Already has temperature=0 configured (deterministic learning paths)
- Already tracks costs and usage metadata
- Provider abstraction allows future AI model switching

**What We'll Do**:
- Add new method: `generateLearningPath()` alongside existing `generateQuestionsFromImages()`
- Reuse all retry logic, error handling, cost tracking
- No modifications needed to core provider code

---

#### ✅ **2. Database Infrastructure (MOSTLY REUSABLE)**

**Location**: `/src/lib/supabase.ts`, `/supabase/migrations/`

**Current Schema**:
```sql
-- examgenie_exams table
- id (uuid)
- user_id (uuid) → FK to auth.users
- subject, grade, status
- processed_text, raw_ai_response
- share_id, sharing_url
- creation_gemini_usage (JSONB)
- generation_prompt (text)
- ai_provider (varchar)
- completed_at (timestamp)
- created_at, updated_at

-- examgenie_questions table
- id (uuid)
- exam_id (uuid) → FK to examgenie_exams
- question_number (int)
- question_text, question_type
- options (JSONB), correct_answer
- explanation (text)
- max_points (int)
- is_selected (boolean)
```

**Reusability**: **80%** - Existing structure is solid, need additions

**What We Can Reuse**:
- User authentication system (auth.users integration)
- Question storage schema (same structure works for lesson questions)
- JSONB fields for flexible metadata storage
- Existing RLS policies and user management

**What We Need to Add** (new tables):
```sql
-- learning_paths (stores the AI-generated learning structure)
CREATE TABLE learning_paths (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  source_exam_id UUID REFERENCES examgenie_exams(id), -- Links to original upload
  material_analysis JSONB, -- AI's concept extraction
  total_concepts INT,
  total_lessons INT,
  estimated_duration_minutes INT,
  skill_tree_structure JSONB, -- Dependency graph for UI
  created_at TIMESTAMP DEFAULT NOW()
);

-- lessons (individual micro-lessons in the path)
CREATE TABLE lessons (
  id UUID PRIMARY KEY,
  path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
  sequence_order INT,
  title VARCHAR(200),
  subtitle VARCHAR(300),
  concept_ids INT[], -- Array of concept IDs from learning_path
  tier VARCHAR(20), -- 'foundational', 'intermediate', 'advanced'
  depends_on_lesson_ids UUID[], -- Prerequisites
  unlocks_lesson_ids UUID[], -- What this lesson unlocks
  estimated_duration_minutes INT,
  learning_objectives TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- student_progress (tracks individual student journey)
CREATE TABLE student_progress (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES auth.users(id),
  path_id UUID REFERENCES learning_paths(id),
  current_lesson_id UUID REFERENCES lessons(id),
  completed_lesson_ids UUID[], -- Array of completed lesson UUIDs
  xp_total INT DEFAULT 0,
  xp_level INT DEFAULT 1,
  streak_days INT DEFAULT 0,
  last_activity_date DATE,
  concept_mastery_scores JSONB, -- {concept_id: mastery_percentage}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- lesson_attempts (detailed performance tracking)
CREATE TABLE lesson_attempts (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES auth.users(id),
  lesson_id UUID REFERENCES lessons(id),
  path_id UUID REFERENCES learning_paths(id),
  questions_correct INT,
  questions_total INT,
  accuracy_percentage DECIMAL(5,2),
  xp_earned INT,
  time_spent_seconds INT,
  completed BOOLEAN DEFAULT FALSE,
  attempted_at TIMESTAMP DEFAULT NOW()
);

-- question_attempts (granular analytics for adaptive learning)
CREATE TABLE question_attempts (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES auth.users(id),
  lesson_id UUID REFERENCES lessons(id),
  question_id UUID REFERENCES examgenie_questions(id),
  concept_id INT, -- From learning_path.material_analysis
  student_answer TEXT,
  is_correct BOOLEAN,
  time_spent_seconds INT,
  attempted_at TIMESTAMP DEFAULT NOW()
);
```

**Migration Strategy**:
- Keep all existing tables (backward compatibility for exam mode)
- Add new tables via Supabase migrations
- Reuse `examgenie_questions` table (works for both exams and lessons)
- Reuse `examgenie_exams` table to store original material upload

---

#### ✅ **3. File Processing & Image Handling (FULLY REUSABLE)**

**Location**: `/src/lib/utils/file-handler.ts`

**Components**:
- `FileProcessor.save()` - Saves uploaded images to /tmp
- `FileProcessor.cleanupByMetadata()` - Cleanup after processing
- Supports JPEG, PNG, WebP, HEIC (max 10MB, 20 files)
- Base64 encoding for Gemini API

**Reusability**: **100%** - Works identically for learning path creation

**What We'll Do**:
- Use exact same flow: Upload textbook → Process images → Send to Gemini
- No changes needed to file handling logic

---

#### ✅ **4. Security & Rate Limiting (FULLY REUSABLE)**

**Location**: `/src/lib/services/rate-limiter.ts`, `/src/lib/services/jwt-validator.ts`

**Current Implementation**:
- In-memory rate limiting: 10/hour, 50/day per user
- Automatic cleanup every 5 minutes
- Optional JWT authentication (falls back to user_id in body)
- Request logging to `api_request_logs` table

**Reusability**: **100%** - Perfect fit for learning mode

**What We'll Do**:
- Apply same rate limits to learning path creation
- Track lesson attempts separately (no rate limit on taking lessons)
- Reuse JWT validation for mobile app integration
- Extend request logging to include lesson_id, path_id

**Consideration**:
- May want separate rate limits for "Create Learning Path" vs "Start Lesson"
- Example: 5 learning paths per day, unlimited lesson attempts

---

#### ✅ **5. Question Shuffling Logic (FULLY REUSABLE)**

**Location**: `/src/lib/utils/question-shuffler.ts`

**Components**:
- Fisher-Yates shuffle algorithm
- Shuffles multiple-choice options before storage
- Tracks correct answer position distribution

**Reusability**: **100%** - Lessons need same shuffling

**What We'll Do**:
- Apply shuffle to lesson questions (same as exam questions)
- Maintain statistical tracking for quality assurance

---

#### ✅ **6. API Response Handling (FULLY REUSABLE)**

**Location**: `/src/lib/utils/api-response.ts`, `/src/lib/utils/error-manager.ts`

**Components**:
- Standardized JSON response builder
- Error categorization and user-friendly messages
- CORS handling
- Rate limit headers

**Reusability**: **100%** - Same patterns for new endpoints

**What We'll Do**:
- Create new endpoints following same patterns:
  - `POST /api/learning/create-path`
  - `GET /api/learning/paths/{id}`
  - `POST /api/learning/lessons/{id}/start`
  - `POST /api/learning/lessons/{id}/submit`

---

#### ✅ **7. Prompt System (PARTIALLY REUSABLE)**

**Location**: `/src/lib/config.ts`

**Current Prompts**:
- `getCategoryAwarePrompt()` - Generates 15 exam questions
- `getLanguageStudiesPrompt()` - Language-specific questions
- Temperature=0, deterministic output
- Category-aware (mathematics, core_academics, language_studies)

**Reusability**: **30%** - Structure reusable, content must change

**What We Can Reuse**:
- Prompt architecture (multi-category support)
- Language detection logic
- Grade-level awareness
- JSON schema enforcement pattern

**What We Need to Replace**:
- Entire prompt content (exam → learning path)
- Output schema (questions → concepts + lessons + dependencies)
- Add new prompt: Learning Path Generation (from our `LEARNING_PATH_PROMPT.md`)
- Keep exam prompt for "Exam Mode" (dual-mode system)

---

### What We DON'T Have: Missing Components

#### ❌ **1. Learning Path Generation Service**

**Needed**: New service class to handle learning path creation

**Implementation**:
```typescript
// /src/lib/services/learning-path-service.ts
export class LearningPathService {
  static async createLearningPath(
    images: File[],
    userId: string,
    grade?: number,
    subject?: string
  ): Promise<LearningPath> {
    // 1. Upload images (reuse FileProcessor)
    // 2. Call Gemini with learning path prompt (reuse QuestionGeneratorService)
    // 3. Parse AI response (new: validate learning path schema)
    // 4. Store in learning_paths table (new)
    // 5. Store lessons in lessons table (new)
    // 6. Initialize student_progress record (new)
    // 7. Return learning path with skill tree
  }
}
```

**Complexity**: Medium (builds on existing patterns)

---

#### ❌ **2. Lesson Management Service**

**Needed**: Service to handle lesson lifecycle

**Implementation**:
```typescript
// /src/lib/services/lesson-service.ts
export class LessonService {
  static async startLesson(
    lessonId: string,
    studentId: string
  ): Promise<LessonSession> {
    // 1. Check prerequisites (are previous lessons completed?)
    // 2. Check if already completed (allow replay?)
    // 3. Generate questions for this lesson (on-demand or cached?)
    // 4. Create lesson_attempts record
    // 5. Return lesson + questions
  }

  static async submitLessonAnswer(
    lessonId: string,
    questionId: string,
    studentId: string,
    answer: string
  ): Promise<AnswerResult> {
    // 1. Check correctness (reuse grading logic)
    // 2. Record question_attempts
    // 3. Calculate XP earned
    // 4. Return feedback + next question
  }

  static async completeLesson(
    lessonId: string,
    studentId: string
  ): Promise<LessonCompletionResult> {
    // 1. Calculate final score
    // 2. Update student_progress (completed_lesson_ids, xp_total)
    // 3. Update concept_mastery_scores
    // 4. Check unlock conditions (unlock next lessons)
    // 5. Update streak tracking
    // 6. Return completion summary + unlocked lessons
  }
}
```

**Complexity**: High (new business logic)

---

#### ❌ **3. Progress Tracking Service**

**Needed**: Manage XP, streaks, mastery scores

**Implementation**:
```typescript
// /src/lib/services/progress-service.ts
export class ProgressService {
  static async updateXP(studentId: string, xpEarned: number): Promise<XPUpdate> {
    // 1. Add XP to student_progress
    // 2. Check if level-up threshold reached
    // 3. Award badges if milestones hit
    // 4. Return new XP total + level
  }

  static async updateStreak(studentId: string): Promise<StreakUpdate> {
    // 1. Check last_activity_date
    // 2. If consecutive day: increment streak_days
    // 3. If broken (>1 day gap): reset to 1
    // 4. Update last_activity_date
    // 5. Return new streak count
  }

  static async updateConceptMastery(
    studentId: string,
    conceptId: number,
    accuracy: number
  ): Promise<MasteryUpdate> {
    // 1. Get current mastery score for concept
    // 2. Apply weighted average (old score + new performance)
    // 3. Update concept_mastery_scores JSONB
    // 4. Return new mastery percentage
  }

  static async getStudentDashboard(studentId: string, pathId: string): Promise<Dashboard> {
    // 1. Get student_progress record
    // 2. Get completed lessons + upcoming lessons
    // 3. Get concept mastery breakdown
    // 4. Get XP/level/streak data
    // 5. Return unified dashboard data
  }
}
```

**Complexity**: Medium (mostly CRUD with calculations)

---

#### ❌ **4. Adaptive Question Generation**

**Needed**: Generate questions dynamically based on student performance

**Implementation**:
```typescript
// /src/lib/services/adaptive-question-service.ts
export class AdaptiveQuestionService {
  static async generateLessonQuestions(
    lessonId: string,
    studentId: string,
    conceptIds: number[]
  ): Promise<Question[]> {
    // 1. Get student's previous performance on these concepts
    // 2. Determine difficulty level (struggling → easier, mastering → harder)
    // 3. Build adaptive prompt for Gemini:
    //    "Generate 5 questions for [concept], difficulty: [easy/medium/hard]"
    // 4. Call Gemini (reuse QuestionGeneratorService)
    // 5. Shuffle options (reuse shuffleQuestionsOptions)
    // 6. Store in examgenie_questions (reuse existing table)
    // 7. Return questions
  }

  static async generateReviewQuestions(
    studentId: string,
    weakConceptIds: number[]
  ): Promise<Question[]> {
    // 1. Get worst-performing concepts from concept_mastery_scores
    // 2. Generate targeted review questions
    // 3. Mix difficulty levels (reinforcement + challenge)
    // 4. Return review question set
  }
}
```

**Complexity**: High (AI prompt engineering + performance analysis)

---

#### ❌ **5. UI Components for Learning Mode**

**Needed**: New React components for skill tree, lesson flow, progress display

**Current UI** (Exam Mode):
- `/src/app/exam/[id]/page.tsx` - Take exam page
- `/src/app/grading/[id]/page.tsx` - Grading results
- `/src/components/exam/NavigationDots.tsx` - Progress indicator

**New UI Needed**:
```
/src/app/learn/[pathId]/page.tsx
  - Skill tree visualization
  - Lesson selection interface
  - Progress overview

/src/app/learn/lesson/[lessonId]/page.tsx
  - Lesson introduction screen
  - Question-by-question interface (reuse exam UI)
  - Immediate feedback display
  - Lesson completion summary

/src/components/learn/SkillTree.tsx
  - Interactive dependency graph
  - Show locked/unlocked lessons
  - Visual progress indicators

/src/components/learn/ProgressDashboard.tsx
  - XP bar with level
  - Streak counter
  - Concept mastery meters
  - Badges/achievements

/src/components/learn/LessonCard.tsx
  - Lesson preview
  - Prerequisites check
  - Estimated duration
  - Start button
```

**Complexity**: High (significant frontend work)

---

## Implementation Strategy: Phased Approach

### Phase 1: Backend Foundation (Week 1-2)

**Goal**: Build core learning path infrastructure without UI

**Tasks**:
1. **Database Schema** (Day 1-2)
   - Create migration: `learning_paths`, `lessons`, `student_progress`, `lesson_attempts`, `question_attempts`
   - Add indexes for performance
   - Set up RLS policies

2. **Learning Path Service** (Day 3-5)
   - Implement `LearningPathService.createLearningPath()`
   - Integrate new learning path prompt
   - Validate AI response schema
   - Store structured learning path

3. **API Endpoints** (Day 6-7)
   - `POST /api/learning/create-path` (create from textbook upload)
   - `GET /api/learning/paths/{id}` (retrieve learning path)
   - `GET /api/learning/paths/{id}/lessons` (get all lessons)

**Validation**:
- Test learning path creation with sample textbook images
- Verify AI returns valid concept map + lessons
- Confirm database storage works correctly

---

### Phase 2: Lesson System (Week 3-4)

**Goal**: Implement lesson taking and progress tracking

**Tasks**:
1. **Lesson Service** (Day 1-3)
   - Implement `LessonService.startLesson()`
   - Implement `LessonService.submitLessonAnswer()`
   - Implement `LessonService.completeLesson()`
   - Prerequisite checking logic

2. **Progress Service** (Day 4-5)
   - XP calculation and leveling
   - Streak tracking (daily check)
   - Concept mastery updates (weighted average)

3. **API Endpoints** (Day 6-7)
   - `POST /api/learning/lessons/{id}/start`
   - `POST /api/learning/lessons/{id}/submit-answer`
   - `POST /api/learning/lessons/{id}/complete`
   - `GET /api/learning/progress/{studentId}`

**Validation**:
- Test lesson unlock logic (dependencies work)
- Verify XP/streak calculations
- Confirm mastery scores update correctly

---

### Phase 3: Adaptive Learning (Week 5)

**Goal**: Add intelligence to question generation

**Tasks**:
1. **Adaptive Question Service** (Day 1-3)
   - Performance-based difficulty adjustment
   - Dynamic question generation per lesson
   - Review question generator for weak concepts

2. **Spaced Repetition** (Day 4-5)
   - Implement Fibonacci spacing algorithm
   - Trigger review questions in later lessons
   - Track "next review date" per concept

**Validation**:
- Test difficulty adaptation (struggle → easier questions)
- Verify spaced repetition timing
- Confirm weak concepts resurface appropriately

---

### Phase 4: Frontend UI (Week 6-8)

**Goal**: Build student-facing learning experience

**Tasks**:
1. **Skill Tree Visualization** (Week 6)
   - Interactive graph component
   - Locked/unlocked state display
   - Click-to-start lesson

2. **Lesson Flow UI** (Week 7)
   - Lesson intro screen
   - Question interface (adapt exam UI)
   - Immediate feedback display
   - Completion celebration screen

3. **Progress Dashboard** (Week 8)
   - XP/level display
   - Streak counter
   - Concept mastery breakdown
   - Badges/achievements

**Validation**:
- User testing with 5-10 students
- Measure engagement (lessons completed per session)
- Collect feedback on UI/UX

---

### Phase 5: Gamification & Polish (Week 9-10)

**Goal**: Add motivational elements

**Tasks**:
1. **Badges & Achievements** (Day 1-2)
   - Define milestone badges
   - Award system
   - Badge display in UI

2. **Leaderboards** (Day 3-4)
   - Class-based leaderboards
   - XP rankings
   - Privacy controls

3. **Push Notifications** (Day 5-7)
   - Streak reminders
   - New lesson unlocked alerts
   - Weekly progress summary

4. **Polish** (Day 8-10)
   - Animations and transitions
   - Loading states
   - Error handling
   - Accessibility

---

## What We Can Reuse vs. What's New

### Reusable Components (70%)

| Component | Location | Reusability | Notes |
|-----------|----------|-------------|-------|
| Gemini Integration | `/src/lib/services/ai-providers/` | 100% | Add new method, keep existing |
| File Processing | `/src/lib/utils/file-handler.ts` | 100% | Use as-is |
| Rate Limiting | `/src/lib/services/rate-limiter.ts` | 100% | Extend with lesson-specific limits |
| JWT Auth | `/src/lib/services/jwt-validator.ts` | 100% | Use as-is |
| Question Shuffling | `/src/lib/utils/question-shuffler.ts` | 100% | Use as-is |
| Error Handling | `/src/lib/utils/error-manager.ts` | 100% | Extend error codes |
| API Response Builder | `/src/lib/utils/api-response.ts` | 100% | Use patterns |
| Database Client | `/src/lib/supabase.ts` | 90% | Add new table types |
| Question Schema | `examgenie_questions` table | 100% | Reuse for lesson questions |
| User Management | `auth.users` integration | 100% | Reuse for student_id |

### New Components (30%)

| Component | Type | Complexity | Estimated Time |
|-----------|------|------------|----------------|
| Learning Path Prompt | Prompt Engineering | Medium | 2 days (test & iterate) |
| Learning Path Service | Backend Service | Medium | 3 days |
| Lesson Service | Backend Service | High | 5 days |
| Progress Service | Backend Service | Medium | 3 days |
| Adaptive Question Service | Backend Service | High | 5 days |
| Database Schema | Migration | Medium | 2 days |
| Skill Tree UI | React Component | High | 5 days |
| Lesson Flow UI | React Component | Medium | 4 days |
| Progress Dashboard UI | React Component | Medium | 3 days |
| API Endpoints | Next.js Routes | Medium | 4 days |

**Total Estimated Time**: 8-10 weeks (single developer)

---

## Dual-Mode Architecture: Exam vs. Learning

**Key Decision**: Keep both modes, don't replace exam mode

### User Flow Branching

```
Upload Textbook Images
    ↓
Choose Mode:
    ├── Exam Mode (Current System)
    │   - Generate 15 questions
    │   - Take exam
    │   - Get grade
    │   - Done
    │
    └── Learning Mode (New System)
        - Generate learning path
        - Start progressive lessons
        - Track progress
        - Master concepts over time
```

### Code Organization

```
/src/lib/services/
  ├── exam-creator.ts           # Existing: One-shot exam generation
  ├── learning-path-service.ts  # New: Learning path creation
  ├── lesson-service.ts         # New: Lesson management
  └── progress-service.ts       # New: XP/streak/mastery

/src/app/
  ├── exam/[id]/              # Existing: Exam mode
  ├── grading/[id]/           # Existing: Grading results
  └── learn/                  # New: Learning mode
      ├── [pathId]/           # Skill tree overview
      └── lesson/[lessonId]/  # Lesson taking interface

/src/lib/config.ts
  - getCategoryAwarePrompt()      # Existing: Exam questions
  - getLearningPathPrompt()       # New: Learning path generation
```

**Benefits**:
- Gradual rollout (learning mode is opt-in)
- A/B testing (compare engagement between modes)
- Flexibility (teachers choose best fit per class)
- Lower risk (exam mode continues working)

---

## API Cost Analysis

### Current System (Exam Mode)

**Cost per exam**: ~$0.001
- 1 API call to Gemini
- Generates 15 questions
- No follow-up calls

### New System (Learning Mode)

**Initial Learning Path Creation**: ~$0.002
- 1 API call with learning path prompt
- Returns concept map + 5-7 lesson structure
- No questions generated yet (just structure)

**Per-Lesson Question Generation**: ~$0.0005 each
- On-demand when student starts lesson
- 5-7 questions per lesson
- Only generated if student actually takes the lesson

**Total Cost for Full Path** (6 lessons, all completed):
- Initial: $0.002
- Lessons: 6 × $0.0005 = $0.003
- **Total**: ~$0.005

**Cost Comparison**:
- Exam Mode: $0.001 per student
- Learning Mode: $0.005 per student (5× higher)
- But: 6× more engagement (6 lessons vs. 1 exam)
- **Cost per interaction**: Actually lower ($0.0008 per lesson vs. $0.001 per exam)

**Optimization Strategies**:
1. **Question Caching**: Generate 80% of questions upfront, 20% on-demand
2. **Question Pooling**: Reuse questions across students (shuffle options)
3. **Lazy Loading**: Only generate lessons as student progresses (saves cost if student abandons)

---

## Migration Path for Existing Users

### Backward Compatibility

**Existing Flutter App**:
- Continue using `/api/mobile/exam-questions` (exam mode)
- No changes required

**Gradual Migration**:
1. **Phase 1**: Add new endpoints, keep old ones
2. **Phase 2**: Flutter app adds "Learning Mode" toggle
3. **Phase 3**: Track adoption (% using learning mode)
4. **Phase 4**: If 95%+ adoption, deprecate exam mode (optional)

### Database Compatibility

**Existing Data**:
- All `examgenie_exams` records remain valid
- All `examgenie_questions` records remain valid
- No data migration needed

**New Data**:
- `learning_paths` references existing `examgenie_exams` (source_exam_id)
- `lessons` use same `examgenie_questions` table
- Clean separation (no conflicts)

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI prompt doesn't generate valid learning paths | Medium | High | Extensive testing with diverse textbooks; fallback to exam mode |
| Database schema changes break existing features | Low | High | Thorough migration testing; separate tables for new features |
| Performance issues with skill tree rendering | Medium | Medium | Pagination; lazy loading; optimize graph algorithm |
| Rate limiting too restrictive for learning mode | Low | Medium | Separate limits for path creation vs. lesson attempts |
| Cost overruns from excessive API calls | Low | Medium | Implement caching; set per-user monthly caps |

### Product Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Students prefer exam mode (simpler) | Medium | High | User testing; iterate on UX; A/B test both modes |
| Teachers don't understand new system | Medium | Medium | Clear documentation; tutorial videos; onboarding flow |
| Gamification feels childish (older students) | Low | Medium | Configurable UI; option to hide XP/badges |
| 20-page constraint limits lesson quality | High | Medium | Set expectations; focus on depth over breadth |

---

## Key Architectural Decisions

### Decision 1: Two-Prompt Strategy

**Rationale**: Separate material analysis from question generation

**Prompt 1**: Learning Path Generation (once per upload)
- Input: Textbook images
- Output: Concepts + lessons + dependencies
- Cost: $0.002

**Prompt 2**: Lesson Question Generation (per lesson)
- Input: Lesson concepts + student performance data
- Output: 5-7 questions tailored to lesson
- Cost: $0.0005

**Why?**
- Enables adaptive difficulty (adjust prompt 2 based on performance)
- Saves costs (only generate questions for started lessons)
- Allows question variation (re-generate with tweaks on retry)

---

### Decision 2: Reuse examgenie_questions Table

**Rationale**: Questions are questions, regardless of context

**Benefits**:
- No schema duplication
- Reuse existing shuffle logic
- Consistent question format across modes
- Simpler grading service integration

**Trade-off**:
- Can't add lesson-specific fields without affecting exam mode
- Solution: Use `metadata` JSONB field for lesson-specific data

---

### Decision 3: In-Memory Progress vs. Database

**Choice**: Database-backed progress tracking

**Rationale**:
- Persistent across sessions (critical for streaks)
- Mobile app needs to sync progress
- Analytics require historical data
- Minimal performance impact (indexed queries)

**Implementation**:
- All progress writes go to database
- Cache frequently-read data (current lesson, XP total) in client state
- Use optimistic UI updates (update local state immediately, sync to DB async)

---

### Decision 4: On-Demand vs. Pre-Generated Questions

**Choice**: Hybrid approach

**Pre-Generate (80%)**:
- First 5 questions per lesson
- Cached in database
- Immediate availability

**On-Demand (20%)**:
- Review questions (based on weak concepts)
- Retry questions (variations of failed questions)
- Challenge mode questions (after mastery)

**Benefits**:
- Fast lesson start (no wait for AI)
- Adaptive content (adjusts to performance)
- Cost-efficient (don't generate unused questions)

---

## Success Metrics

### Engagement Metrics

**Exam Mode (Baseline)**:
- Average session duration: ~10 minutes
- Completion rate: ~85%
- Return rate: ~10% (students retake exams)

**Learning Mode (Targets)**:
- Average session duration: >15 minutes
- Lesson completion rate: >70%
- Return rate: >50% (students come back for next lesson)
- Streak retention: >30% (3+ consecutive days)

### Learning Outcome Metrics

**Measure**:
- Concept mastery scores over time
- Improvement on review questions (weak → strong)
- Time to mastery (how many attempts to reach 90%?)

**Target**:
- 20%+ improvement in weak concept scores after review
- 80%+ students master all concepts in 1 week

### Business Metrics

**Costs**:
- Average API cost per student path: <$0.01
- Cost per active daily user: <$0.03

**Adoption**:
- 30%+ of users try learning mode (vs. exam mode)
- 50%+ of learning mode users complete 3+ lessons

---

## Technical Debt & Future Improvements

### Phase 1 Compromises

**What We'll Defer**:
1. **Social Features**: Leaderboards, friend challenges (add in Phase 5)
2. **Offline Mode**: Client-side question caching (requires service worker)
3. **Multi-Device Sync**: Real-time progress sync (use polling initially)
4. **Advanced Analytics**: Teacher dashboards with class insights
5. **AI Tutoring**: Conversational help for struggling students

### Future Enhancements

**v2.0 Features**:
- **Spaced Repetition Algorithm**: Fibonacci → Anki-style SM-2
- **Concept Dependency Graph**: Visualize how concepts connect
- **Custom Learning Paths**: Teachers manually create lessons
- **Voice Narration**: Read questions aloud (accessibility)
- **Dark Mode**: UI theming
- **Multiple Languages**: Translate UI (not just content)

---

## Development Checklist

### Pre-Development

- [ ] Finalize learning path prompt (test with 10 diverse textbooks)
- [ ] Design database schema (review with team)
- [ ] Define API contracts (OpenAPI spec)
- [ ] Set up Supabase staging environment
- [ ] Create development branch: `feature/learning-mode`

### Phase 1: Backend Foundation

- [ ] Create database migrations
- [ ] Implement `LearningPathService`
- [ ] Build API endpoint: `POST /api/learning/create-path`
- [ ] Write integration tests
- [ ] Deploy to staging
- [ ] Test with 5 sample textbooks

### Phase 2: Lesson System

- [ ] Implement `LessonService`
- [ ] Implement `ProgressService`
- [ ] Build API endpoints (start/submit/complete)
- [ ] Add rate limiting for lessons
- [ ] Write unit tests
- [ ] Integration testing

### Phase 3: Adaptive Learning

- [ ] Implement `AdaptiveQuestionService`
- [ ] Build spaced repetition logic
- [ ] Test difficulty adaptation
- [ ] Validate review question quality

### Phase 4: Frontend

- [ ] Build skill tree component
- [ ] Build lesson flow UI
- [ ] Build progress dashboard
- [ ] Mobile responsiveness testing
- [ ] User acceptance testing (5-10 students)

### Phase 5: Launch

- [ ] Production deployment
- [ ] Monitor error rates
- [ ] Track engagement metrics
- [ ] Collect user feedback
- [ ] Iterate on UX issues

---

## Conclusion

The existing ExamGenie codebase provides a **solid foundation** for building the Duolingo-style learning system. We can reuse approximately **70% of existing infrastructure**:

**Fully Reusable (100%)**:
- AI provider abstraction
- File processing
- Rate limiting & security
- Question shuffling
- Error handling
- Authentication

**Partially Reusable (30-80%)**:
- Database schema (extend, don't replace)
- Prompt system (structure reusable, content new)
- API patterns (new endpoints, same conventions)

**New Development (30%)**:
- Learning path service
- Lesson management
- Progress tracking
- Adaptive question generation
- Skill tree UI
- Gamification elements

**Estimated Timeline**: 8-10 weeks for MVP (single developer)

**Key Success Factors**:
1. Thorough prompt testing (learning path quality is critical)
2. Database schema design (get it right from the start)
3. Gradual rollout (don't break existing exam mode)
4. User feedback loop (iterate based on actual student usage)

**Biggest Risks**:
1. AI prompt may not reliably generate valid learning paths from 20 pages
2. Students may find gamification distracting rather than motivating
3. Limited source material (20 pages) constrains lesson depth

**Recommended Next Steps**:
1. **Validate the concept** (test learning path prompt with 10 textbooks)
2. **Design database schema** (get stakeholder approval)
3. **Build MVP backend** (Phases 1-2, no UI)
4. **Create proof-of-concept UI** (1-2 lessons, basic skill tree)
5. **User testing** (5-10 students, gather feedback)
6. **Iterate and polish** (based on findings)

This approach minimizes risk by validating core assumptions before investing in full frontend development, while maximizing code reuse from the existing, well-architected system.
