import { NextRequest } from 'next/server'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { ErrorManager } from '@/lib/utils/error-manager'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/mobile/stats
 *
 * Retrieves statistics for a specific user's exams
 *
 * Query Parameters:
 * - user_id (required): UUID of the user
 * - student_id (deprecated): Still accepted for backward compatibility
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
    // Extract user_id from query parameters (backward compatible with student_id)
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id') || searchParams.get('student_id')

    // Validate required parameter
    if (!userId) {
      return ApiResponseBuilder.validationError(
        'user_id parameter is required',
        'Provide the user UUID in the query string: ?user_id=xxx (student_id still supported for backward compatibility)'
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

    console.log(`Fetching statistics for user: ${userId}`)

    // Query all exams for the user
    const { data: exams, error: examsError } = await supabaseAdmin
      .from('examgenie_exams')
      .select('id, subject, status, created_at')
      .eq('user_id', userId)

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

    console.log(`Statistics for user ${userId}:`, stats)

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