import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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
}