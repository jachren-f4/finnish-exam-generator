-- Add Cost Tracking Infrastructure
-- Migration created: 2025-10-21
-- Purpose: Add index for date-based cost queries and ensure cost tracking is enabled

-- ============================================
-- ADD CREATED_AT INDEX FOR COST QUERIES
-- ============================================
-- This index is critical for fast cost analytics queries that filter by date range
CREATE INDEX IF NOT EXISTS idx_examgenie_exams_created_at
  ON examgenie_exams(created_at DESC);

-- Add comment for documentation
COMMENT ON INDEX idx_examgenie_exams_created_at IS
  'Optimizes cost analytics queries that filter by created_at date range.
   Used by admin dashboard for 30-day cost summaries.';

-- Verify that creation_gemini_usage column exists (should already exist from earlier migration)
-- This is just a safety check - column was created in 001_examgenie_mvp_schema.sql
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'examgenie_exams'
        AND column_name = 'creation_gemini_usage'
    ) THEN
        RAISE EXCEPTION 'creation_gemini_usage column does not exist on examgenie_exams table';
    END IF;
END $$;

-- Update comment on creation_gemini_usage column for clarity
COMMENT ON COLUMN examgenie_exams.creation_gemini_usage IS
  'Gemini API usage and cost data for exam generation.
   Structure: {
     "promptTokenCount": number,
     "candidatesTokenCount": number,
     "totalTokenCount": number,
     "estimatedCost": number (in USD),
     "inputCost": number (in USD),
     "outputCost": number (in USD),
     "model": string,
     "mathRetryAttempts": number (optional, only for math exams)
   }';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Cost tracking infrastructure added successfully';
    RAISE NOTICE 'Index created: idx_examgenie_exams_created_at';
END $$;
