-- ============================================================================
-- VALIDATION QUERIES: Verify Migration Success
-- ============================================================================
-- Run these queries AFTER migration to confirm everything worked
-- All should return expected results with no errors
-- ============================================================================

-- ============================================================================
-- 1. VERIFY ALL REQUIRED TABLES EXIST
-- ============================================================================
RAISE NOTICE '=== CHECKING REQUIRED TABLES ===';

SELECT
  tablename,
  CASE
    WHEN tablename IN ('examgenie_exams', 'examgenie_questions', 'examgenie_grading', 'students')
    THEN '✅ REQUIRED'
    ELSE '❌ UNEXPECTED'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- 2. VERIFY LEGACY TABLES ARE GONE
-- ============================================================================
RAISE NOTICE '=== CHECKING LEGACY TABLES ARE REMOVED ===';

SELECT
  tablename,
  '❌ ERROR - SHOULD BE DROPPED' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('exams', 'grading', 'answers')
ORDER BY tablename;

-- Result should be EMPTY (0 rows) - if any appear, migration failed

-- ============================================================================
-- 3. VERIFY examgenie_exams TABLE STRUCTURE
-- ============================================================================
RAISE NOTICE '=== CHECKING examgenie_exams COLUMNS ===';

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'examgenie_exams'
ORDER BY ordinal_position;

-- Should have these KEY columns:
-- - id (uuid, NOT NULL)
-- - user_id (uuid, NOT NULL)
-- - subject (text, NOT NULL)
-- - status (text, NOT NULL with CHECK constraint)
-- - final_questions (jsonb)
-- - summary_text (text)
-- - audio_url (text)
-- - audio_metadata (jsonb)

-- ============================================================================
-- 4. VERIFY examgenie_grading TABLE STRUCTURE
-- ============================================================================
RAISE NOTICE '=== CHECKING examgenie_grading COLUMNS ===';

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'examgenie_grading'
ORDER BY ordinal_position;

-- Should have:
-- - grading_id (uuid)
-- - exam_id (uuid, NOT NULL - FK to examgenie_exams)
-- - grade_scale (text, DEFAULT '4-10')
-- - grading_json (jsonb)
-- - final_grade (text)
-- - attempt_number (integer, DEFAULT 1)

-- ============================================================================
-- 5. VERIFY examgenie_questions TABLE STRUCTURE
-- ============================================================================
RAISE NOTICE '=== CHECKING examgenie_questions COLUMNS ===';

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'examgenie_questions'
ORDER BY ordinal_position;

-- Should have:
-- - id (uuid)
-- - exam_id (uuid, FK to examgenie_exams)
-- - question_number (integer)
-- - question_text (text)
-- - options (jsonb)
-- - correct_answer (text)
-- - explanation (text)

-- ============================================================================
-- 6. VERIFY students TABLE HAS NEW LANGUAGE COLUMNS
-- ============================================================================
RAISE NOTICE '=== CHECKING students TABLE FOR LANGUAGE COLUMNS ===';

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'students'
ORDER BY ordinal_position;

-- Should have NEW columns:
-- - language (character varying, DEFAULT 'en')
-- - language_name (character varying, DEFAULT 'English')

-- ============================================================================
-- 7. VERIFY FOREIGN KEY CONSTRAINTS
-- ============================================================================
RAISE NOTICE '=== CHECKING FOREIGN KEY CONSTRAINTS ===';

SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('examgenie_exams', 'examgenie_questions', 'examgenie_grading', 'students')
ORDER BY tc.table_name;

-- Should show FKs:
-- examgenie_exams -> auth.users(id)
-- examgenie_questions -> examgenie_exams(id)
-- examgenie_grading -> examgenie_exams(id)
-- students -> auth.users(id)

-- ============================================================================
-- 8. VERIFY EXAM_STATUS TYPE IS GONE
-- ============================================================================
RAISE NOTICE '=== CHECKING exam_status TYPE IS REMOVED ===';

SELECT
  typname,
  '❌ ERROR - SHOULD BE DROPPED' as status
FROM pg_type
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND typname = 'exam_status';

-- Result should be EMPTY (0 rows) - if it appears, type wasn't dropped

-- ============================================================================
-- 9. TEST FOREIGN KEY VALIDITY
-- ============================================================================
RAISE NOTICE '=== TESTING FOREIGN KEY VALIDITY ===';

-- This will error if FKs are broken:
-- If these fail, the migration failed and you need to rollback

SELECT 'examgenie_exams -> auth.users' as fk_test;
SELECT user_id FROM public.examgenie_exams
  WHERE user_id IS NOT NULL
  LIMIT 1;

SELECT 'examgenie_questions -> examgenie_exams' as fk_test;
SELECT exam_id FROM public.examgenie_questions
  LIMIT 1;

SELECT 'examgenie_grading -> examgenie_exams' as fk_test;
SELECT exam_id FROM public.examgenie_grading
  LIMIT 1;

-- ============================================================================
-- 10. CHECK TABLE SIZES (to confirm data handling)
-- ============================================================================
RAISE NOTICE '=== TABLE ROW COUNTS ===';

SELECT
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM ONLY public.examgenie_exams) as examgenie_exams_count,
  (SELECT COUNT(*) FROM ONLY public.examgenie_questions) as examgenie_questions_count,
  (SELECT COUNT(*) FROM ONLY public.examgenie_grading) as examgenie_grading_count,
  (SELECT COUNT(*) FROM ONLY public.students) as students_count
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'examgenie_exams'
LIMIT 1;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- If all queries above return expected results:
-- ✅ Migration successful!
--
-- Next steps:
-- 1. Test application endpoints (exam generation, grading)
-- 2. Check application logs for any connection errors
-- 3. Monitor performance (no performance regression expected)
-- ============================================================================
