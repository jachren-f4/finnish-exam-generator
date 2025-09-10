-- Database migration notes for Finnish Exam Generator
-- Run these commands in Supabase SQL editor when ready to implement

-- Migration 1: Add prompt logging column to exams table
-- This will allow better analysis of prompt quality vs. exam results
ALTER TABLE exams ADD COLUMN prompt_text TEXT;
ALTER TABLE exams ADD COLUMN prompt_type VARCHAR(20) DEFAULT 'default';
ALTER TABLE exams ADD COLUMN prompt_length INTEGER;

-- Index for prompt analysis queries
CREATE INDEX idx_exams_prompt_type ON exams(prompt_type);
CREATE INDEX idx_exams_prompt_length ON exams(prompt_length);

-- Migration 2: Add prompt performance tracking
ALTER TABLE exams ADD COLUMN gemini_processing_time INTEGER; -- milliseconds
ALTER TABLE exams ADD COLUMN gemini_cost DECIMAL(10,6); -- cost in dollars

-- Note: For now, prompt data is stored in exam_json.metadata.prompt_used
-- This migration would move it to dedicated columns for better querying