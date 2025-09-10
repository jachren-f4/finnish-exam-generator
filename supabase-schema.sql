-- Finnish Exam Generator Database Schema
-- Run this in your Supabase SQL Editor

-- Create exam status enum
CREATE TYPE exam_status AS ENUM ('created', 'answered', 'graded');

-- Create exams table
CREATE TABLE exams (
    exam_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject VARCHAR(100) NOT NULL,
    grade VARCHAR(50) NOT NULL,
    exam_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status exam_status DEFAULT 'created'
);

-- Create answers table
CREATE TABLE answers (
    answer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
    user_id VARCHAR(100), -- Optional for anonymous users
    answers_json JSONB NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create grading table
CREATE TABLE grading (
    grading_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
    grade_scale VARCHAR(50) DEFAULT '1-10',
    grading_json JSONB NOT NULL,
    final_grade VARCHAR(10) NOT NULL,
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_exams_created_at ON exams(created_at);
CREATE INDEX idx_answers_exam_id ON answers(exam_id);
CREATE INDEX idx_grading_exam_id ON grading(exam_id);

-- Create automatic status update trigger
CREATE OR REPLACE FUNCTION update_exam_status_on_answer()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE exams 
    SET status = 'answered' 
    WHERE exam_id = NEW.exam_id AND status = 'created';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_exam_status_on_answer
    AFTER INSERT ON answers
    FOR EACH ROW
    EXECUTE FUNCTION update_exam_status_on_answer();

-- Create automatic status update to graded
CREATE OR REPLACE FUNCTION update_exam_status_on_grading()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE exams 
    SET status = 'graded' 
    WHERE exam_id = NEW.exam_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_exam_status_on_grading
    AFTER INSERT ON grading
    FOR EACH ROW
    EXECUTE FUNCTION update_exam_status_on_grading();

-- Grant necessary permissions (adjust as needed for your setup)
-- These might be needed depending on your Supabase RLS policies
-- ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE answers ENABLE ROW LEVEL SECURITY;  
-- ALTER TABLE grading ENABLE ROW LEVEL SECURITY;