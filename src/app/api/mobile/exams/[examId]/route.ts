import { NextRequest } from 'next/server'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { ErrorManager } from '@/lib/utils/error-manager'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/mobile/exams/[examId]
 *
 * Retrieves a single exam with all its questions
 *
 * Path Parameters:
 * - examId: UUID of the exam
 *
 * Returns:
 * - Full exam details including all questions
 * - Error if exam not found
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ examId: string }> }
) {
  // Await params in Next.js 15
  const params = await context.params
  const { examId } = params

  const errorContext = {
    endpoint: '/api/mobile/exams/[examId]',
    method: 'GET',
    examId: examId
  }

  try {

    // Validate examId format (basic UUID check)
    if (!examId || examId.length < 10) {
      return ApiResponseBuilder.validationError(
        'Invalid exam ID format',
        'Exam ID must be a valid UUID'
      )
    }

    // Check if Supabase admin client is available
    if (!supabaseAdmin) {
      const managedError = ErrorManager.createFromPattern(
        'DATABASE_CONNECTION_ERROR',
        'Database client not available',
        errorContext
      )
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.internalError(
        'Database service unavailable',
        managedError.details
      )
    }

    console.log(`Fetching exam details for: ${examId}`)

    // Query exam with all questions
    const { data: exam, error: examError } = await supabaseAdmin
      .from('examgenie_exams')
      .select(`
        id,
        student_id,
        user_id,
        subject,
        grade,
        status,
        share_id,
        created_at,
        completed_at,
        examgenie_questions (
          id,
          question_number,
          question_text,
          question_type,
          options,
          correct_answer,
          explanation,
          max_points
        )
      `)
      .eq('id', examId)
      .single()

    if (examError) {
      // Check if it's a "not found" error
      if (examError.code === 'PGRST116') {
        return ApiResponseBuilder.notFound(
          'Exam not found',
          `No exam exists with ID: ${examId}`
        )
      }

      console.error('Database error fetching exam:', examError)
      const managedError = ErrorManager.createFromError(
        new Error(examError.message),
        errorContext
      )
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.internalError(
        'Failed to retrieve exam',
        managedError.details
      )
    }

    if (!exam) {
      return ApiResponseBuilder.notFound(
        'Exam not found',
        `No exam exists with ID: ${examId}`
      )
    }

    // Sort questions by question_number
    const sortedQuestions = (exam.examgenie_questions || []).sort(
      (a: any, b: any) => a.question_number - b.question_number
    )

    // Transform data to match expected format
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const transformedExam = {
      exam_id: exam.id,
      student_id: exam.student_id,
      user_id: exam.user_id,
      subject: exam.subject,
      grade: exam.grade,
      status: exam.status,
      questions: sortedQuestions.map((q: any) => ({
        id: q.id,
        question_number: q.question_number,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options, // Already an array for multiple_choice
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        max_points: q.max_points
      })),
      exam_url: `${baseUrl}/exam/${exam.id}`,
      grading_url: `${baseUrl}/grading/${exam.id}`,
      created_at: exam.created_at,
      completed_at: exam.completed_at
    }

    console.log(`Successfully retrieved exam ${examId} with ${transformedExam.questions.length} questions`)

    return ApiResponseBuilder.success({
      exam: transformedExam
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/mobile/exams/[examId]:', error)
    const managedError = ErrorManager.handleError(error, errorContext)
    return ApiResponseBuilder.internalError(
      ErrorManager.getUserMessage(managedError),
      managedError.details
    )
  }
}

// Handle CORS preflight requests
export async function OPTIONS(_request: NextRequest) {
  return ApiResponseBuilder.cors(
    ['GET', 'OPTIONS'],
    ['Content-Type', 'Authorization'],
    '*'
  )
}