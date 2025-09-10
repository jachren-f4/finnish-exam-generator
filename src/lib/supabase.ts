import { createClient } from '@supabase/supabase-js'

// Provide fallbacks during build time to prevent initialization errors
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ptxwrdgvewdfrcacrdwc.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0eHdyZGd2ZXdkZnJjYWNyZHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNjY3NDIsImV4cCI6MjA1MTk0Mjc0Mn0.nABZV_pFH2Bd9rCNLOJGJBYh_J_A3V6Q9dH6c3b_BYs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types based on our schema
export interface DbExam {
  exam_id: string
  subject: string
  grade: string
  exam_json: any // JSONB field
  created_at: string
  status: 'created' | 'answered' | 'graded'
}

export interface DbAnswer {
  answer_id: string
  exam_id: string
  user_id?: string
  answers_json: any // JSONB field
  submitted_at: string
}

export interface DbGrading {
  grading_id: string
  exam_id: string
  grade_scale: string
  grading_json: any // JSONB field
  final_grade: string
  graded_at: string
}

// Enhanced types for our current Gemini format
export interface ExamData {
  exam_id: string
  subject: string
  grade: string
  status: 'created' | 'answered' | 'graded'
  created_at: string
  questions: QuestionData[]
  total_questions: number
  max_total_points: number
}

export interface QuestionData {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_in_the_blank'
  options?: string[]
  max_points: number
  explanation?: string
}

export interface StudentAnswer {
  question_id: string
  answer_text: string
}

export interface GradingResult {
  exam_id: string
  subject: string
  grade: string
  status: 'graded'
  final_grade: string
  grade_scale: string
  total_points: number
  max_total_points: number
  percentage: number
  questions: GradedQuestion[]
  graded_at: string
  submitted_at: string
  created_at: string
  questions_count: number
  questions_correct: number
  questions_partial: number
  questions_incorrect: number
  grading_metadata?: {
    gemini_graded: number
    rule_based_graded: number
    primary_method: 'gemini' | 'rule-based'
    gemini_available: boolean
    total_gemini_usage?: any
    grading_prompt?: string
  }
}

export interface GradedQuestion {
  id: string
  question_text: string
  expected_answer: string
  student_answer: string
  points_awarded: number
  max_points: number
  feedback: string
  percentage: number
  question_type: string
  options?: string[]
  grade_reasoning?: string
  grading_method?: 'gemini' | 'rule-based'
  usage_metadata?: any
}