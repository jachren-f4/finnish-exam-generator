-- ExamGenie MVP Database Schema Migration
-- This migration creates the necessary tables for multi-user support,
-- student management, and enhanced exam functionality

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STUDENTS TABLE
-- ============================================
-- Stores student profiles linked to authenticated users
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    grade INTEGER CHECK (grade >= 1 AND grade <= 9),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Add index for user_id for faster queries
    CONSTRAINT students_user_id_idx UNIQUE (user_id, id)
);

-- Create index for faster user lookups
CREATE INDEX idx_students_user_id ON public.students(user_id);

-- ============================================
-- ENHANCED EXAMS TABLE
-- ============================================
-- Note: We'll need to migrate existing exams table or create new one
-- This assumes creating a new structure
CREATE TABLE IF NOT EXISTS public.examgenie_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,

    -- Exam metadata
    subject TEXT NOT NULL,
    grade TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PROCESSING', 'READY', 'FAILED')),

    -- Content fields
    original_images JSONB,
    processed_text TEXT,
    raw_ai_response TEXT,
    final_questions JSONB,

    -- Sharing
    sharing_url TEXT UNIQUE,
    share_id TEXT UNIQUE DEFAULT substring(md5(random()::text) from 1 for 8),

    -- Usage tracking (from existing Gemini usage)
    creation_gemini_usage JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Diagnostic fields (from existing schema)
    diagnostic_image_urls TEXT[],
    ocr_raw_text TEXT,
    diagnostic_enabled BOOLEAN DEFAULT FALSE
);

-- Create indexes for better query performance
CREATE INDEX idx_examgenie_exams_user_id ON public.examgenie_exams(user_id);
CREATE INDEX idx_examgenie_exams_student_id ON public.examgenie_exams(student_id);
CREATE INDEX idx_examgenie_exams_status ON public.examgenie_exams(status);
CREATE INDEX idx_examgenie_exams_share_id ON public.examgenie_exams(share_id);

-- ============================================
-- QUESTIONS TABLE
-- ============================================
-- Individual questions for replacement functionality
CREATE TABLE IF NOT EXISTS public.examgenie_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES public.examgenie_exams(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice',
    options JSONB,
    correct_answer TEXT,
    explanation TEXT,
    max_points INTEGER DEFAULT 2,
    is_selected BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Ensure unique question numbers per exam
    CONSTRAINT unique_exam_question_number UNIQUE (exam_id, question_number)
);

-- Create index for faster exam lookups
CREATE INDEX idx_questions_exam_id ON public.examgenie_questions(exam_id);
CREATE INDEX idx_questions_selected ON public.examgenie_questions(exam_id, is_selected);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examgenie_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examgenie_questions ENABLE ROW LEVEL SECURITY;

-- STUDENTS RLS POLICIES
-- Users can only see and modify their own students
CREATE POLICY "Users can view own students" ON public.students
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own students" ON public.students
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own students" ON public.students
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own students" ON public.students
    FOR DELETE USING (auth.uid() = user_id);

-- EXAMS RLS POLICIES
-- Users can only see their own exams, except for shared exams
CREATE POLICY "Users can view own exams" ON public.examgenie_exams
    FOR SELECT USING (auth.uid() = user_id);

-- Public can view shared exams (for sharing functionality)
CREATE POLICY "Public can view shared exams" ON public.examgenie_exams
    FOR SELECT USING (sharing_url IS NOT NULL);

CREATE POLICY "Users can insert own exams" ON public.examgenie_exams
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exams" ON public.examgenie_exams
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exams" ON public.examgenie_exams
    FOR DELETE USING (auth.uid() = user_id);

-- QUESTIONS RLS POLICIES
-- Questions follow exam ownership
CREATE POLICY "Users can view questions for own exams" ON public.examgenie_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.examgenie_exams
            WHERE id = exam_id AND user_id = auth.uid()
        )
    );

-- Public can view questions for shared exams
CREATE POLICY "Public can view questions for shared exams" ON public.examgenie_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.examgenie_exams
            WHERE id = exam_id AND sharing_url IS NOT NULL
        )
    );

CREATE POLICY "Users can insert questions for own exams" ON public.examgenie_questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.examgenie_exams
            WHERE id = exam_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update questions for own exams" ON public.examgenie_questions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.examgenie_exams
            WHERE id = exam_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete questions for own exams" ON public.examgenie_questions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.examgenie_exams
            WHERE id = exam_id AND user_id = auth.uid()
        )
    );

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_examgenie_exams_updated_at BEFORE UPDATE ON public.examgenie_exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION NOTES
-- ============================================
-- TODO: After this schema is applied:
-- 1. Migrate data from existing 'exams' table to 'examgenie_exams'
-- 2. Update API endpoints to use new table names
-- 3. Enable Google OAuth in Supabase dashboard
-- 4. Configure service role key in environment variables
-- 5. Test RLS policies with different users