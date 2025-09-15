import { NextRequest } from 'next/server'
import { getGradingResults } from '@/lib/exam-service'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { ErrorManager, ErrorCategory } from '@/lib/utils/error-manager'
import { performanceWrapper } from '@/lib/middleware/performance-middleware'
import { gradingCache } from '@/lib/utils/cache-manager'

async function gradingHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const errorContext = {
    endpoint: '/api/exam/[id]/grade',
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
    const cachedGrading = gradingCache.getGrading(examId)
    if (cachedGrading) {
      return ApiResponseBuilder.success({
        success: true,
        ...cachedGrading
      })
    }

    const gradingResult = await getGradingResults(examId)
    
    if (!gradingResult) {
      const managedError = ErrorManager.createFromPattern(
        'INVALID_REQUEST',
        'Grading results not found',
        { ...errorContext, additionalData: { examId } }
      )
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.notFound(
        'Arvostelutuloste ei löytynyt'
      )
    }

    // Cache successful result
    gradingCache.setGrading(examId, gradingResult)

    return ApiResponseBuilder.success({
      success: true,
      ...gradingResult
    })

  } catch (error) {
    const managedError = ErrorManager.handleError(error, errorContext)
    return ApiResponseBuilder.internalError(
      'Palvelinvirhe',
      'Arvostelutulosten haku epäonnistui'
    )
  }
}

// Export with performance tracking
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return performanceWrapper(
    (req: NextRequest) => gradingHandler(req, context),
    'Get Grading Results'
  )(request)
}

// Handle CORS for grading results
export async function OPTIONS(_request: NextRequest) {
  return ApiResponseBuilder.cors(
    ['GET', 'OPTIONS'],
    ['Content-Type'],
    '*'
  )
}