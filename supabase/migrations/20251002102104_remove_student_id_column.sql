-- Migration: Remove student_id column from examgenie_exams table
-- This migration assumes user_id column already exists
-- Reason: The table already has user_id, we just need to remove student_id

-- Step 1: Check if student_id column exists and drop its foreign key constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'examgenie_exams'
        AND column_name = 'student_id'
    ) THEN
        -- Drop the foreign key constraint if it exists
        ALTER TABLE examgenie_exams
        DROP CONSTRAINT IF EXISTS examgenie_exams_student_id_fkey;

        -- Drop the index if it exists
        DROP INDEX IF EXISTS idx_examgenie_exams_student_id;

        -- Drop the student_id column
        ALTER TABLE examgenie_exams
        DROP COLUMN student_id;

        RAISE NOTICE 'student_id column removed successfully';
    ELSE
        RAISE NOTICE 'student_id column does not exist, skipping';
    END IF;
END $$;

-- Step 2: Ensure user_id has proper foreign key constraint to users table
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE examgenie_exams
    DROP CONSTRAINT IF EXISTS examgenie_exams_user_id_fkey;

    -- Add new foreign key constraint pointing to auth.users table
    -- ON DELETE CASCADE: If a user is deleted, their exams are also deleted
    ALTER TABLE examgenie_exams
    ADD CONSTRAINT examgenie_exams_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

    RAISE NOTICE 'user_id foreign key constraint added successfully';
END $$;

-- Step 3: Ensure index exists on user_id for query performance
CREATE INDEX IF NOT EXISTS idx_examgenie_exams_user_id
ON examgenie_exams(user_id);

-- Migration complete
-- The table now only has user_id column with proper constraints
