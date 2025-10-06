-- Add generation_prompt column to examgenie_exams table
-- This stores the full prompt sent to Gemini AI for exam generation
-- Useful for debugging, testing, and analyzing prompt effectiveness

ALTER TABLE examgenie_exams
ADD COLUMN generation_prompt TEXT;

-- Add comment to document the column's purpose
COMMENT ON COLUMN examgenie_exams.generation_prompt IS 'The complete prompt sent to Gemini AI during exam generation, including system instructions and user parameters';
