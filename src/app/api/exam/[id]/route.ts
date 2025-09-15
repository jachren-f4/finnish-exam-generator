import { NextRequest } from 'next/server'
import { getExamForTaking, getExamState } from '@/lib/exam-service'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { ErrorManager, ErrorCategory } from '@/lib/utils/error-manager'
import { withPerformanceTracking, handleWithPerformance } from '@/lib/middleware/performance-middleware'
import { examCache } from '@/lib/utils/cache-manager'

async function examHandler(
  request: NextRequest,
  context: any,
  { params }: { params: Promise<{ id: string }> }
) {
  const errorContext = {
    endpoint: '/api/exam/[id]',
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

    // Check cache first
    context.timer.startPhase('Cache Check')
    const cachedExamState = examCache.get(`state:${examId}`)
    context.timer.endPhase('Cache Check')
    
    if (cachedExamState) {
      return ApiResponseBuilder.success({
        ...cachedExamState.exam,
        canReuse: cachedExamState.canReuse,
        hasBeenCompleted: cachedExamState.hasBeenCompleted,
        latestGrading: cachedExamState.latestGrading
      })
    }

    // First try to get exam state (includes completion status)
    const examState = await handleWithPerformance(
      () => getExamState(examId),
      'Get Exam State',
      context
    )
    
    if (!examState) {
      const managedError = ErrorManager.createFromPattern(
        'INVALID_REQUEST',
        'Exam not found',
        { ...errorContext, additionalData: { examId } }
      )
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.notFound(
        'Koetta ei löytynyt'
      )
    }

    console.log('Exam access check:', {
      examId,
      canReuse: examState.canReuse,
      status: examState.exam?.status,
      hasBeenCompleted: examState.hasBeenCompleted
    })

    // If exam hasn't been completed yet, only allow if status is 'created'
    if (!examState.canReuse && examState.exam?.status !== 'created') {
      console.log('Access denied:', {
        canReuse: examState.canReuse,
        status: examState.exam?.status,
        reason: 'Exam not reusable and not in created status'
      })
      const managedError = ErrorManager.createFromError(
        new Error('Exam not available for access'),
        { ...errorContext, additionalData: { examId, status: examState.exam?.status } },
        ErrorCategory.AUTHORIZATION
      )
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.forbidden(
        'Koe ei ole saatavilla'
      )
    }

    // Cache the exam state for future requests
    examCache.set(`state:${examId}`, examState, 300000) // 5 minutes

    // Return exam data along with state information
    return ApiResponseBuilder.success({
      ...examState.exam,
      canReuse: examState.canReuse,
      hasBeenCompleted: examState.hasBeenCompleted,
      latestGrading: examState.latestGrading
    })

  } catch (error) {
    const managedError = ErrorManager.handleError(error, errorContext)
    return ApiResponseBuilder.internalError(
      'Palvelinvirhe',
      'Kokeen haku epäonnistui'
    )
  }
}

// Export the GET handler with performance tracking
export const GET = withPerformanceTracking(examHandler)

// Handle CORS for exam pages
export async function OPTIONS(_request: NextRequest) {
  return ApiResponseBuilder.cors(
    ['GET', 'OPTIONS'],
    ['Content-Type'],
    '*'
  )
}