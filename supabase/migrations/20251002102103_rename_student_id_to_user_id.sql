-- Migration: Rename student_id to user_id in examgenie_exams table
-- DEPRECATED: This migration is no longer needed as user_id column already exists
-- Use migration 20251002102104_remove_student_id_column.sql instead

-- This file is kept for historical reference only
-- The table schema already had user_id column when this was created

SELECT 'Migration 20251002102103 skipped - user_id column already exists' AS notice;
