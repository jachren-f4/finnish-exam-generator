-- Add Grading Cost Tracking
-- Migration created: 2025-10-21
-- Purpose: Track Gemini API costs for exam grading operations

-- ============================================
-- ADD GRADING COST COLUMN
-- ============================================
-- Add grading_gemini_usage column to track costs per grading attempt
ALTER TABLE examgenie_grading
  ADD COLUMN IF NOT EXISTS grading_gemini_usage JSONB;

-- Add index for cost queries on graded_at (already exists, but verify)
CREATE INDEX IF NOT EXISTS idx_examgenie_grading_graded_at
  ON examgenie_grading(graded_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN examgenie_grading.grading_gemini_usage IS
  'Gemini API usage and cost data for batch grading operation.
   Structure: {
     "promptTokenCount": number,
     "candidatesTokenCount": number,
     "totalTokenCount": number,
     "estimatedCost": number (in USD),
     "inputCost": number (in USD),
     "outputCost": number (in USD),
     "model": string,
     "questionsGraded": number
   }
   Note: This represents the cost of grading ALL questions in the exam (batch grading).';

COMMENT ON INDEX idx_examgenie_grading_graded_at IS
  'Optimizes cost analytics queries that filter by graded_at date range.
   Used by admin dashboard for grading cost summaries.';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Grading cost tracking added successfully';
    RAISE NOTICE 'Column added: examgenie_grading.grading_gemini_usage';
END $$;
