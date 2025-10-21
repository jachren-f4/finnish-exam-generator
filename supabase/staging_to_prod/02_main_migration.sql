-- ============================================================================
-- PRODUCTION MIGRATION: Align with Staging Schema
-- ============================================================================
-- This migration:
-- 1. Creates new examgenie_grading table
-- 2. Adds language fields to students table
-- 3. Drops legacy tables (exams, grading, answers)
-- 4. Cleans up unused types
--
-- ⚠️  CRITICAL: Run in order. Stop on any error and run rollback.
-- ============================================================================

BEGIN;  -- Start transaction - rolls back all changes if any step fails

-- ============================================================================
-- PHASE 1: CREATE NEW TABLE - examgenie_grading
-- ============================================================================
-- Replaces legacy grading system
-- Uses new grade scales (4-10) and attempt tracking

CREATE TABLE IF NOT EXISTS public.examgenie_grading (
  grading_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  exam_id uuid NOT NULL,
  grade_scale text NOT NULL DEFAULT '4-10'::text,
  grading_json jsonb NOT NULL,
  final_grade text NOT NULL,
  graded_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  grading_prompt text,
  attempt_number integer NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  CONSTRAINT examgenie_grading_pkey PRIMARY KEY (grading_id),
  CONSTRAINT examgenie_grading_exam_id_fkey FOREIGN KEY (exam_id)
    REFERENCES public.examgenie_exams(id) ON DELETE CASCADE
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_examgenie_grading_exam_id
  ON public.examgenie_grading(exam_id);
CREATE INDEX IF NOT EXISTS idx_examgenie_grading_graded_at
  ON public.examgenie_grading(graded_at);

RAISE NOTICE 'Created table: examgenie_grading';

-- ============================================================================
-- PHASE 2: ADD LANGUAGE COLUMNS TO students TABLE
-- ============================================================================
-- Enables multi-language student profiles

ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS language character varying DEFAULT 'en'::character varying;

ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS language_name character varying DEFAULT 'English'::character varying;

RAISE NOTICE 'Added language columns to students table';

-- ============================================================================
-- PHASE 3: DROP LEGACY TABLES (IN DEPENDENCY ORDER)
-- ============================================================================
-- These are replaced by new schema

-- 3a. Drop answers table (references exams, must go first)
DROP TABLE IF EXISTS public.answers CASCADE;
RAISE NOTICE 'Dropped table: answers';

-- 3b. Drop grading table (references exams)
DROP TABLE IF EXISTS public.grading CASCADE;
RAISE NOTICE 'Dropped table: grading';

-- 3c. Drop exams table (legacy exam storage - safe to drop now that examgenie_exams exists)
DROP TABLE IF EXISTS public.exams CASCADE;
RAISE NOTICE 'Dropped table: exams';

-- ============================================================================
-- PHASE 4: CLEANUP UNUSED TYPES
-- ============================================================================
-- Remove custom types that are no longer referenced

-- Drop exam_status type if it exists and is not used elsewhere
DROP TYPE IF EXISTS public.exam_status CASCADE;
RAISE NOTICE 'Dropped type: exam_status';

COMMIT;  -- Commit all changes

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Migration completed successfully!
--
-- New schema includes:
-- ✅ examgenie_exams (main exam table)
-- ✅ examgenie_questions (questions for exams)
-- ✅ examgenie_grading (NEW - grading with new scales and attempt tracking)
-- ✅ students (with NEW language fields)
-- ✅ api_request_logs (in staging only, NOT in production)
--
-- Removed:
-- ❌ exams (legacy)
-- ❌ grading (legacy)
-- ❌ answers (legacy)
-- ❌ exam_status type (custom type no longer needed)
--
-- Next steps:
-- 1. Run validation queries (04_validation_queries.sql)
-- 2. Test application endpoints
-- 3. Monitor logs for errors
-- ============================================================================
