import { NextRequest } from 'next/server'
import { supabase, ExamAttempt } from '@/lib/supabase'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { ErrorManager } from '@/lib/utils/error-manager'

/**
 * GET /api/exam/[id]/attempts
 * Returns all grading attempts for an exam, ordered by attempt number
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const errorContext = {
    endpoint: '/api/exam/[id]/attempts',
    method: 'GET'
  }

  try {
    const resolvedParams = await params
    const examId = resolvedParams.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(examId)) {
      const managedError = ErrorManager.createFromPattern(
        'INVALID_REQUEST',
        'Invalid exam ID format',
        errorContext
      )
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.validationError(
        'Virheellinen kokeen tunniste',
        'Kokeen tunniste ei ole oikeassa muodossa'
      )
    }

    // Try ExamGenie grading table first (modern)
    let gradingData = null
    let gradingError = null

    const examGenieResult = await supabase
      .from('examgenie_grading')
      .select('attempt_number, final_grade, grading_json, graded_at')
      .eq('exam_id', examId)
      .order('attempt_number', { ascending: true })

    if (!examGenieResult.error && examGenieResult.data && examGenieResult.data.length > 0) {
      gradingData = examGenieResult.data
    } else {
      // Fall back to legacy grading table (for production)
      const legacyResult = await supabase
        .from('grading')
        .select('attempt_number, final_grade, grading_json, graded_at')
        .eq('exam_id', examId)
        .order('attempt_number', { ascending: true })

      gradingData = legacyResult.data
      gradingError = legacyResult.error
    }

    if (gradingError) {
      console.error('Error fetching exam attempts:', gradingError)
      const managedError = ErrorManager.createFromPattern(
        'DATABASE_TIMEOUT',
        'Failed to fetch exam attempts',
        { ...errorContext, additionalData: { examId, error: gradingError } }
      )
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.internalError(
        'Tietokantatvirhe',
        'Kokeen yritysten haku epäonnistui'
      )
    }

    if (!gradingData || gradingData.length === 0) {
      // No attempts yet - return empty array
      return ApiResponseBuilder.success({
        exam_id: examId,
        attempts: [],
        total_attempts: 0
      })
    }

    // Transform data to ExamAttempt format
    const attempts: ExamAttempt[] = gradingData.map((grading: any) => {
      const gradingJson = grading.grading_json
      return {
        attempt_number: grading.attempt_number || 1,
        final_grade: grading.final_grade,
        percentage: gradingJson?.percentage || 0,
        total_points: gradingJson?.total_points || 0,
        max_total_points: gradingJson?.max_total_points || 0,
        questions_correct: gradingJson?.questions_correct || 0,
        questions_incorrect: gradingJson?.questions_incorrect || 0,
        graded_at: grading.graded_at
      }
    })

    return ApiResponseBuilder.success({
      exam_id: examId,
      attempts,
      total_attempts: attempts.length,
      latest_attempt: attempts[attempts.length - 1]
    })

  } catch (error) {
    const managedError = ErrorManager.handleError(error, errorContext)
    return ApiResponseBuilder.internalError(
      'Palvelinvirhe',
      'Kokeen yritysten haku epäonnistui'
    )
  }
}

// Handle CORS for exam attempts
export async function OPTIONS(_request: NextRequest) {
  return ApiResponseBuilder.cors(
    ['GET', 'OPTIONS'],
    ['Content-Type'],
    '*'
  )
}
