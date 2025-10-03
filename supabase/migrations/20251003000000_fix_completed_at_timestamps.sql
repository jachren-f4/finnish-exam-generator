-- Migration: Fix completed_at timestamps for existing exams
-- This migration resets completed_at to NULL for exams that haven't actually been completed
-- (where completed_at was incorrectly set to the same value as created_at during creation)

-- Reset completed_at to NULL for exams that haven't been graded
-- We identify these as exams where:
-- 1. completed_at is not NULL (was incorrectly set)
-- 2. completed_at equals created_at (indicates it was auto-set during creation)
-- 3. No grading record exists for this exam (hasn't actually been completed)

UPDATE examgenie_exams
SET completed_at = NULL
WHERE completed_at IS NOT NULL
  AND completed_at = created_at
  AND NOT EXISTS (
    SELECT 1 FROM grading WHERE grading.exam_id = examgenie_exams.id
  );

-- Log the results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % exam records with incorrect completed_at timestamps', updated_count;
END $$;
