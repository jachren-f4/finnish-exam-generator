-- Add system user for mobile API requests
-- This migration creates a system user to handle unauthenticated mobile API requests

-- First, insert a system user into auth.users table
-- Note: This requires manual insertion since we can't directly insert into auth.users
-- We'll use a placeholder UUID for the system user

-- Create a function to get or create system user ID
CREATE OR REPLACE FUNCTION get_system_user_id()
RETURNS UUID AS $$
BEGIN
    -- Return a fixed UUID for system user
    -- This UUID should be manually inserted into auth.users if needed
    RETURN '00000000-0000-0000-0000-000000000001'::UUID;
END;
$$ LANGUAGE plpgsql;

-- Update examgenie_exams table to allow mobile API usage
-- We'll modify the RLS policies to handle system user cases

-- Add a policy for system user access (mobile API)
CREATE POLICY "System user can create exams" ON public.examgenie_exams
    FOR INSERT WITH CHECK (user_id = get_system_user_id());

CREATE POLICY "System user can view own exams" ON public.examgenie_exams
    FOR SELECT USING (user_id = get_system_user_id());

CREATE POLICY "System user can update own exams" ON public.examgenie_exams
    FOR UPDATE USING (user_id = get_system_user_id());

-- Add a policy for system user questions
CREATE POLICY "System user can insert questions" ON public.examgenie_questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.examgenie_exams
            WHERE id = exam_id AND user_id = get_system_user_id()
        )
    );

CREATE POLICY "System user can view questions" ON public.examgenie_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.examgenie_exams
            WHERE id = exam_id AND user_id = get_system_user_id()
        )
    );

-- Add comment for documentation
COMMENT ON FUNCTION get_system_user_id() IS 'Returns the system user ID for mobile API requests that do not have authentication';