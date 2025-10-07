-- Add ai_provider column to track which AI provider generated each exam
-- This allows for quality comparison between Gemini and OpenAI (ChatGPT-4o-mini)

ALTER TABLE examgenie_exams
ADD COLUMN ai_provider VARCHAR(20) DEFAULT 'gemini';

COMMENT ON COLUMN examgenie_exams.ai_provider IS 'The AI provider used for exam generation (gemini, openai)';

-- Add index for performance when filtering by provider
CREATE INDEX idx_examgenie_exams_ai_provider ON examgenie_exams(ai_provider);
