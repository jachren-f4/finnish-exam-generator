import { NextRequest } from 'next/server'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { ErrorManager } from '@/lib/utils/error-manager'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/mobile/exams
 *
 * Retrieves all exams for a specific student
 *
 * Query Parameters:
 * - student_id (required): UUID of the student
 *
 * Returns:
 * - List of exams with metadata (sorted by most recent first)
 * - Empty array if no exams found
 */
export async function GET(request: NextRequest) {
  const errorContext = {
    endpoint: '/api/mobile/exams',
    method: 'GET'
  }

  try {
    // Extract student_id from query parameters
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')

    // Validate required parameter
    if (!studentId) {
      return ApiResponseBuilder.validationError(
        'student_id parameter is required',
        'Provide the student UUID in the query string: ?student_id=xxx'
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

    console.log(`Fetching exams for student: ${studentId}`)

    // Query exams with question count
    const { data: exams, error: examsError } = await supabaseAdmin
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
        examgenie_questions(count)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })

    if (examsError) {
      console.error('Database error fetching exams:', examsError)
      const managedError = ErrorManager.createFromError(
        new Error(examsError.message),
        errorContext
      )
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.internalError(
        'Failed to retrieve exams',
        managedError.details
      )
    }

    // Transform data to match expected format
    const transformedExams = (exams || []).map((exam: any) => {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      return {
        exam_id: exam.id,
        student_id: exam.student_id,
        user_id: exam.user_id,
        subject: exam.subject,
        grade: exam.grade,
        status: exam.status,
        question_count: exam.examgenie_questions?.[0]?.count || 0,
        exam_url: `${baseUrl}/exam/${exam.id}`,
        grading_url: `${baseUrl}/grading/${exam.id}`,
        created_at: exam.created_at,
        completed_at: exam.completed_at
      }
    })

    console.log(`Found ${transformedExams.length} exams for student ${studentId}`)

    return ApiResponseBuilder.success({
      exams: transformedExams,
      total: transformedExams.length
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/mobile/exams:', error)
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