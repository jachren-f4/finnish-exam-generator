-- Add Audio Generation Cost Tracking
-- Migration created: 2025-10-21
-- Purpose: Track Google Cloud TTS costs for audio summary generation

-- ============================================
-- ADD AUDIO COST COLUMN
-- ============================================
-- Add audio_generation_cost column to track TTS costs per exam
ALTER TABLE examgenie_exams
  ADD COLUMN IF NOT EXISTS audio_generation_cost JSONB;

-- Add comment for documentation
COMMENT ON COLUMN examgenie_exams.audio_generation_cost IS
  'Google Cloud Text-to-Speech API cost data for audio summary generation.
   Structure: {
     "characterCount": number,
     "voiceType": string ("STANDARD" | "NEURAL2" | "WAVENET"),
     "estimatedCost": number (in USD),
     "pricePerMillion": number (in USD),
     "generatedAt": string (ISO timestamp)
   }

   Pricing (2025):
   - Standard voices: $4.00 per 1M characters
   - Neural2 voices: $16.00 per 1M characters
   - Wavenet voices: $16.00 per 1M characters';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Audio generation cost tracking added successfully';
    RAISE NOTICE 'Column added: examgenie_exams.audio_generation_cost';
END $$;
