-- Add key_concepts and gamification columns to examgenie_exams table
-- Part of Key Concepts Integration (Phase 2)
-- See: /KEY_CONCEPTS_INTEGRATION_PLAN.md

-- Add key_concepts column (JSONB array of concept objects)
ALTER TABLE examgenie_exams
ADD COLUMN IF NOT EXISTS key_concepts JSONB DEFAULT NULL;

-- Add gamification column (JSONB object with boss questions and rewards)
ALTER TABLE examgenie_exams
ADD COLUMN IF NOT EXISTS gamification JSONB DEFAULT NULL;

-- Create index for key_concepts to enable fast queries
CREATE INDEX IF NOT EXISTS idx_examgenie_exams_key_concepts
ON examgenie_exams USING GIN (key_concepts);

-- Create index for gamification to enable fast queries
CREATE INDEX IF NOT EXISTS idx_examgenie_exams_gamification
ON examgenie_exams USING GIN (gamification);

-- Add comments for documentation
COMMENT ON COLUMN examgenie_exams.key_concepts IS 'Gamified learning concepts extracted from exam (imageCount × 3). Structure: [{ concept_name, definition, difficulty, category, related_question_ids, badge_title, mini_game_hint }]';
COMMENT ON COLUMN examgenie_exams.gamification IS 'Gamification elements for exam completion. Structure: { completion_message, boss_question_open, boss_question_multiple_choice, reward_text }';

-- Example key_concepts structure:
-- [
--   {
--     "concept_name": "Newtonin toinen laki",
--     "definition": "Kappaleen kiihtyvyys on suoraan verrannollinen siihen kohdistuvaan voimaan ja kääntäen verrannollinen massaan (F = ma).",
--     "difficulty": "intermediate",
--     "category": "Mekaniikka",
--     "related_question_ids": [1, 3, 7],
--     "badge_title": "Voimalaki Mestari",
--     "mini_game_hint": "Mikä yhtälö yhdistää voiman, massan ja kiihtyvyyden?"
--   }
-- ]

-- Example gamification structure:
-- {
--   "completion_message": "Mahtavaa! Olet suorittanut fysiikan kokeen.",
--   "boss_question_open": "Selitä, miten Newtonin lait vaikuttavat auton jarrutukseen.",
--   "boss_question_multiple_choice": {
--     "question": "Mikä seuraavista yhdistää parhaiten kaikki kolme Newtonin lakia?",
--     "options": ["Liike", "Voima", "Energia", "Massa"],
--     "correct_answer": "Voima"
--   },
--   "reward_text": "Ansaitsit 5 Genie Dollaria!"
-- }
