import { createClient } from '@supabase/supabase-js'

// Provide fallbacks during build time to prevent initialization errors
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ptxwrdgvewdfrcacrdwc.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0eHdyZGd2ZXdkZnJjYWNyZHdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNjY3NDIsImV4cCI6MjA1MTk0Mjc0Mn0.nABZV_pFH2Bd9rCNLOJGJBYh_J_A3V6Q9dH6c3b_BYs'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Client-side Supabase client (with anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (with service key for admin operations)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

// Database types based on our schema
export interface DbExam {
  exam_id: string
  subject: string
  grade: string
  exam_json: any // JSONB field
  created_at: string
  status: 'created' | 'answered' | 'graded'
  diagnostic_image_urls?: string[] // Array of Supabase Storage URLs
  ocr_raw_text?: string // Raw OCR output before question processing
  diagnostic_enabled?: boolean
  creation_gemini_usage?: any // Gemini API usage data for exam creation
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
  diagnostic_image_urls?: string[]
  ocr_raw_text?: string
  diagnostic_enabled?: boolean
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
  grading_method?: 'gemini' | 'rule-based'
  usage_metadata?: any
}

// ExamGenie MVP types for multi-user architecture
export interface Student {
  id: string
  user_id: string
  name: string | null
  grade: number
  created_at: string
  updated_at: string
}

export interface ExamGenieExam {
  id: string
  user_id: string
  subject: string
  grade: string
  status: 'DRAFT' | 'PROCESSING' | 'READY' | 'FAILED'
  original_images: any | null
  processed_text: string | null
  raw_ai_response: string | null
  final_questions: any | null
  sharing_url: string | null
  share_id: string
  creation_gemini_usage: any | null
  created_at: string
  updated_at: string
  completed_at: string | null
  diagnostic_image_urls: string[] | null
  ocr_raw_text: string | null
  diagnostic_enabled: boolean
}

export interface ExamGenieQuestion {
  id: string
  exam_id: string
  question_number: number
  question_text: string
  question_type: string
  options: any | null
  correct_answer: string | null
  explanation: string | null
  max_points: number
  is_selected: boolean
  created_at: string
}

// Finnish subjects for exam generation
export const FINNISH_SUBJECTS = [
  'Äidinkieli',
  'Ympäristöoppi',
  'Biologia',
  'Maantieto',
  'Fysiikka',
  'Kemia',
  'Terveystieto',
  'Uskonto',
  'Elämänkatsomustieto',
  'Historia',
  'Yhteiskuntaoppi',
  'Kotitalous'
] as const

export type FinnishSubject = typeof FINNISH_SUBJECTS[number]

// Utility function to get auth user from request
export async function getAuthUser(supabaseClient: any) {
  const { data: { user }, error } = await supabaseClient.auth.getUser()
  if (error || !user) {
    throw new Error('Unauthorized')
  }
  return user
}