import { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { OperationTimer } from '@/lib/utils/performance-logger'
import { RequestProcessor } from '@/lib/middleware/request-processor'
import { MobileApiService } from '@/lib/services/mobile-api-service'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { ErrorManager, ErrorCategory } from '@/lib/utils/error-manager'

/**
 * Refactored Mobile API Route - Handles exam generation requests
 * Uses new middleware and services for clean separation of concerns
 */
export async function POST(request: NextRequest) {
  const processingId = uuidv4()
  const timer = new OperationTimer('Mobile API Processing')
  
  // Build error context for better debugging
  const clientInfo = RequestProcessor.getClientInfo(request)
  const errorContext = {
    requestId: processingId,
    endpoint: '/api/mobile/exam-questions',
    method: 'POST',
    ...clientInfo
  }

  try {
    // Validate request method (though Next.js handles this, good practice)
    if (!RequestProcessor.validateMethod(request, ['POST'])) {
      return ApiResponseBuilder.methodNotAllowed(['POST'])
    }

    // Process and validate form data
    const processedData = await RequestProcessor.processFormData(
      request, 
      timer, 
      processingId
    )

    // Validate images
    const validation = RequestProcessor.validateImages(processedData.images)
    if (!validation.valid) {
      const managedError = ErrorManager.createFromPattern(
        validation.errors[0].includes('large') ? 'FILE_TOO_LARGE' :
        validation.errors[0].includes('type') ? 'UNSUPPORTED_FILE_TYPE' :
        validation.errors[0].includes('many') ? 'TOO_MANY_FILES' : 'INVALID_REQUEST',
        validation.errors[0],
        errorContext
      )
      
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.validationError(
        ErrorManager.getUserMessage(managedError),
        managedError.details,
        { requestId: processingId }
      )
    }

    // Log request details
    RequestProcessor.logRequest(processedData, {
      'Client IP': clientInfo.ip,
      'User Agent': clientInfo.userAgent.substring(0, 100)
    })

    // Process exam generation through service layer
    const result = await MobileApiService.generateExam({
      images: processedData.images,
      customPrompt: processedData.customPrompt,
      processingId
    })

    // Handle service result
    if (!result.success) {
      const managedError = ErrorManager.createFromError(
        new Error(result.error || 'Unknown service error'),
        errorContext,
        ErrorCategory.INTERNAL
      )
      
      ErrorManager.logError(managedError)
      return ApiResponseBuilder.internalError(
        ErrorManager.getUserMessage(managedError),
        result.details,
        { requestId: processingId }
      )
    }

    // Build successful response with exam URLs
    const examResult = result.examUrl ? {
      examUrl: result.examUrl,
      examId: result.examId!,
      gradingUrl: result.gradingUrl!
    } : null

    return ApiResponseBuilder.successWithExam(
      result.data,
      examResult,
      { 
        requestId: processingId,
        processingTime: result.data?.metadata.processingTime
      }
    )

  } catch (error) {
    // Handle unexpected errors
    const managedError = ErrorManager.handleError(error, errorContext)
    
    return ApiResponseBuilder.internalError(
      ErrorManager.getUserMessage(managedError),
      managedError.details,
      { 
        requestId: processingId
      }
    )
  }
}

// Handle CORS preflight requests
export async function OPTIONS(_request: NextRequest) {
  return ApiResponseBuilder.cors(
    ['POST', 'OPTIONS'],
    ['Content-Type', 'Authorization'],
    '*'
  )
}