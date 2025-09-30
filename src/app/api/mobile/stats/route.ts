import { NextRequest } from 'next/server'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { ErrorManager } from '@/lib/utils/error-manager'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/mobile/stats
 *
 * Retrieves statistics for a specific student's exams
 *
 * Query Parameters:
 * - student_id (required): UUID of the student
 *
 * Returns:
 * - Total exam count
 * - Exams created this week
 * - Breakdown by subject
 * - Breakdown by status
 */
export async function GET(request: NextRequest) {
  const errorContext = {
    endpoint: '/api/mobile/stats',
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

    console.log(`Fetching statistics for student: ${studentId}`)

    // Query all exams for the student
    const { data: exams, error: examsError } = await supabaseAdmin
      .from('examgenie_exams')
      .select('id, subject, status, created_at')
      .eq('student_id', studentId)

    if (examsError) {
      console.error('Database error fetching exam statistics:', examsError)
      const managedError = ErrorManager.createFromError(
        new Error(examsError.message),
        errorContext
      )
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.internalError(
        'Failed to retrieve statistics',
        managedError.details
      )
    }

    const examList = exams || []

    // Calculate statistics
    const totalExams = examList.length

    // Calculate "this week" (last 7 days)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const examsThisWeek = examList.filter((exam: any) => {
      const createdDate = new Date(exam.created_at)
      return createdDate >= oneWeekAgo
    }).length

    // Group by subject
    const examsBySubject: Record<string, number> = {}
    examList.forEach((exam: any) => {
      const subject = exam.subject || 'Unknown'
      examsBySubject[subject] = (examsBySubject[subject] || 0) + 1
    })

    // Group by status
    const examsByStatus: Record<string, number> = {}
    examList.forEach((exam: any) => {
      const status = exam.status || 'UNKNOWN'
      examsByStatus[status] = (examsByStatus[status] || 0) + 1
    })

    const stats = {
      total_exams: totalExams,
      exams_this_week: examsThisWeek,
      exams_by_subject: examsBySubject,
      exams_by_status: examsByStatus
    }

    console.log(`Statistics for student ${studentId}:`, stats)

    return ApiResponseBuilder.success({
      stats
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/mobile/stats:', error)
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