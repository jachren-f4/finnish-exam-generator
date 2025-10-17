# Apply ExamGenie Grading Migration to Staging

## Quick Instructions (2 minutes)

### 1. Open Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/tdrtybjaeugxhtcagluy/sql/new

### 2. Copy and Run the Migration SQL

**File:** `supabase/migrations/20251017000000_create_examgenie_grading.sql`

Or copy this SQL directly:

```sql
-- Create ExamGenie Grading Table with Attempt Tracking
-- Migration created: 2025-10-17
-- Purpose: Modern grading table for examgenie_exams with built-in attempt tracking

-- ============================================
-- EXAMGENIE_GRADING TABLE
-- ============================================
-- Stores grading results for ExamGenie exams with multi-attempt support
CREATE TABLE IF NOT EXISTS public.examgenie_grading (
    grading_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.examgenie_exams(id) ON DELETE CASCADE,

    -- Grading metadata
    grade_scale TEXT NOT NULL DEFAULT '4-10',
    grading_json JSONB NOT NULL,
    final_grade TEXT NOT NULL,
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    grading_prompt TEXT,

    -- Attempt tracking (built-in from day 1)
    attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number > 0),

    -- Ensure one grading record per attempt
    CONSTRAINT unique_exam_attempt UNIQUE (exam_id, attempt_number)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_examgenie_grading_exam_id
ON public.examgenie_grading(exam_id);

CREATE INDEX IF NOT EXISTS idx_examgenie_grading_attempt
ON public.examgenie_grading(exam_id, attempt_number DESC);

CREATE INDEX IF NOT EXISTS idx_examgenie_grading_graded_at
ON public.examgenie_grading(graded_at DESC);

-- Add comments for documentation
COMMENT ON TABLE public.examgenie_grading IS 'Grading results for ExamGenie exams with multi-attempt support';
COMMENT ON COLUMN public.examgenie_grading.attempt_number IS 'Tracks which attempt this is for the exam (1 = first attempt, 2 = second attempt, etc.)';
COMMENT ON COLUMN public.examgenie_grading.grading_json IS 'Complete grading details including per-question feedback, points, and percentages';

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.examgenie_grading ENABLE ROW LEVEL SECURITY;

-- Users can view grading for their own exams
CREATE POLICY "Users can view grading for own exams" ON public.examgenie_grading
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.examgenie_exams
            WHERE id = exam_id AND user_id = auth.uid()
        )
    );

-- Public can view grading for shared exams
CREATE POLICY "Public can view grading for shared exams" ON public.examgenie_grading
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.examgenie_exams
            WHERE id = exam_id AND sharing_url IS NOT NULL
        )
    );

-- Users can insert grading for their own exams
CREATE POLICY "Users can insert grading for own exams" ON public.examgenie_grading
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.examgenie_exams
            WHERE id = exam_id AND user_id = auth.uid()
        )
    );

-- Users can update grading for their own exams
CREATE POLICY "Users can update grading for own exams" ON public.examgenie_grading
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.examgenie_exams
            WHERE id = exam_id AND user_id = auth.uid()
        )
    );

-- Users can delete grading for their own exams
CREATE POLICY "Users can delete grading for own exams" ON public.examgenie_grading
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.examgenie_exams
            WHERE id = exam_id AND user_id = auth.uid()
        )
    );
```

### 3. Click "Run" (or Cmd/Ctrl + Enter)

You should see: "Success. No rows returned"

### 4. Verify Migration Applied

Run this verification query:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'examgenie_grading'
ORDER BY ordinal_position;
```

Expected columns:
- grading_id (uuid)
- exam_id (uuid)
- grade_scale (text)
- grading_json (jsonb)
- final_grade (text)
- graded_at (timestamp with time zone)
- grading_prompt (text)
- attempt_number (integer, default 1)

## What This Does

✅ **Fixes staging grading** - Exam submissions will now work on staging
✅ **Enables retake feature** - Built-in attempt tracking from day 1
✅ **Production safe** - Legacy exams in production continue working
✅ **Clean architecture** - New table only references ExamGenie tables

## After Migration

1. **Test exam submission:**
   ```bash
   curl -X POST https://exam-generator-staging.vercel.app/api/mobile/exam-questions \
     -F "images=@assets/images/test-image.jpg" \
     -F "category=core_academics" \
     -F "grade=5" \
     -F "student_id=fc495b10-c771-4bd1-8bb4-b2c5003b9613"
   ```

2. **Verify grading works** - Take exam, submit answers, check results

3. **Test retake feature** - Complete exam, then use retake cards on menu page

## Troubleshooting

**Error: relation already exists**
- Migration was already applied - safe to ignore

**Error: permission denied**
- Make sure you're logged into Supabase with correct account

**Error: foreign key constraint**
- Ensure `examgenie_exams` table exists first
- Run migration 001_examgenie_mvp_schema.sql if needed

## Database Architecture

**Before:**
- `examgenie_exams` ✅
- `examgenie_questions` ✅
- `examgenie_grading` ❌ (missing - causing failures)

**After:**
- `examgenie_exams` ✅
- `examgenie_questions` ✅
- `examgenie_grading` ✅ (created with attempt tracking)

**Production (unchanged):**
- Legacy tables (`exams`, `answers`, `grading`) ✅
- ExamGenie tables ✅
- Both systems work side-by-side

---

**Generated:** 2025-10-17
**Status:** Ready to apply
