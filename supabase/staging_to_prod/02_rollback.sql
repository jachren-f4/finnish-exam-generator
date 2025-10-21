-- ============================================================================
-- ROLLBACK SCRIPT: Restore Legacy Schema
-- ============================================================================
-- ⚠️  ONLY RUN IF MIGRATION FAILS OR CAUSES CRITICAL ISSUES
--
-- This recreates:
-- - exam_status type
-- - exams table (legacy)
-- - grading table (legacy)
-- - answers table
-- - Removes new examgenie_grading table
-- - Removes language columns from students (if possible)
--
-- Data will be EMPTY (as we intentionally dropped it)
-- ============================================================================

BEGIN;  -- Start transaction

-- ============================================================================
-- PHASE 1: RESTORE CUSTOM TYPE
-- ============================================================================

CREATE TYPE public.exam_status AS ENUM ('created', 'processing', 'ready', 'failed');
RAISE NOTICE 'Created type: exam_status';

-- ============================================================================
-- PHASE 2: RESTORE LEGACY TABLES (IN CORRECT ORDER)
-- ============================================================================

-- 2a. Restore exams table (legacy exam storage)
CREATE TABLE IF NOT EXISTS public.exams (
  exam_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  subject character varying NOT NULL,
  grade character varying NOT NULL,
  exam_json jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  status public.exam_status DEFAULT 'created'::public.exam_status,
  prompt_text text,
  prompt_type character varying DEFAULT 'default'::character varying,
  prompt_length integer,
  gemini_processing_time integer,
  gemini_cost numeric,
  diagnostic_image_urls ARRAY,
  ocr_raw_text text,
  diagnostic_enabled boolean DEFAULT false,
  creation_gemini_usage jsonb,
  CONSTRAINT exams_pkey PRIMARY KEY (exam_id)
);
CREATE INDEX IF NOT EXISTS idx_exams_created_at ON public.exams(created_at);
RAISE NOTICE 'Restored table: exams';

-- 2b. Restore grading table (legacy grading system)
CREATE TABLE IF NOT EXISTS public.grading (
  grading_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  exam_id uuid NOT NULL,
  grade_scale character varying DEFAULT '1-10'::character varying,
  grading_json jsonb NOT NULL,
  final_grade character varying NOT NULL,
  graded_at timestamp with time zone DEFAULT now(),
  grading_prompt text,
  CONSTRAINT grading_pkey PRIMARY KEY (grading_id),
  CONSTRAINT grading_exam_id_fkey FOREIGN KEY (exam_id)
    REFERENCES public.exams(exam_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_grading_exam_id ON public.grading(exam_id);
CREATE INDEX IF NOT EXISTS idx_grading_graded_at ON public.grading(graded_at);
RAISE NOTICE 'Restored table: grading';

-- 2c. Restore answers table
CREATE TABLE IF NOT EXISTS public.answers (
  answer_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  exam_id uuid NOT NULL,
  user_id character varying,
  answers_json jsonb NOT NULL,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT answers_pkey PRIMARY KEY (answer_id),
  CONSTRAINT answers_exam_id_fkey FOREIGN KEY (exam_id)
    REFERENCES public.exams(exam_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_answers_exam_id ON public.answers(exam_id);
CREATE INDEX IF NOT EXISTS idx_answers_submitted_at ON public.answers(submitted_at);
RAISE NOTICE 'Restored table: answers';

-- ============================================================================
-- PHASE 3: REMOVE NEW SCHEMA CHANGES
-- ============================================================================

-- 3a. Drop examgenie_grading table (new table we created)
DROP TABLE IF EXISTS public.examgenie_grading CASCADE;
RAISE NOTICE 'Dropped table: examgenie_grading';

-- 3b. Remove language columns from students (if they exist)
-- Note: If other code depends on these, this will fail - that's OK, it warns us
ALTER TABLE public.students
DROP COLUMN IF EXISTS language_name;

ALTER TABLE public.students
DROP COLUMN IF EXISTS language;

RAISE NOTICE 'Removed language columns from students table';

COMMIT;  -- Commit all changes

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Rollback completed!
--
-- Schema is back to legacy state:
-- ✅ exams (legacy - empty)
-- ✅ grading (legacy - empty)
-- ✅ answers (legacy - empty)
-- ✅ exam_status type
-- ✅ examgenie_exams, examgenie_questions still exist (not affected)
--
-- Next steps:
-- 1. Investigate why migration failed
-- 2. Fix the issue
-- 3. Re-run migration (02_main_migration.sql)
-- ============================================================================
