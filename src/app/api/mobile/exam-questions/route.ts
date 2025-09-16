import { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { OperationTimer } from '@/lib/utils/performance-logger'
import { RequestProcessor } from '@/lib/middleware/request-processor'
import { MobileApiService } from '@/lib/services/mobile-api-service'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { ErrorManager, ErrorCategory } from '@/lib/utils/error-manager'
import { withOptionalAuth } from '@/middleware/auth'
import { FINNISH_SUBJECTS, FinnishSubject } from '@/lib/supabase'

/**
 * ExamGenie MVP Mobile API Route - Handles subject-aware exam generation
 * Supports multi-user architecture with optional authentication
 */
export async function POST(request: NextRequest) {
  return withOptionalAuth(request, async (req, authContext) => {
    const processingId = uuidv4()
    const timer = new OperationTimer('ExamGenie Mobile API Processing')

    // Build error context for better debugging
    const clientInfo = RequestProcessor.getClientInfo(req)
    const errorContext = {
      requestId: processingId,
      endpoint: '/api/mobile/exam-questions',
      method: 'POST',
      userId: authContext.user?.id,
      ...clientInfo
    }

    try {
      // Validate request method (though Next.js handles this, good practice)
      if (!RequestProcessor.validateMethod(req, ['POST'])) {
        return ApiResponseBuilder.methodNotAllowed(['POST'])
      }

      // Process form data directly to extract both images and ExamGenie parameters
      const formData = await req.formData()

      // Extract images
      const images = formData.getAll('images') as File[]
      const customPrompt = formData.get('prompt') as string

      // Extract ExamGenie-specific parameters
      const subject = formData.get('subject')?.toString() as FinnishSubject
      const gradeStr = formData.get('grade')?.toString()
      const grade = gradeStr ? parseInt(gradeStr, 10) : undefined
      const student_id = formData.get('student_id')?.toString()

      // Create processed data structure
      const processedData = {
        images,
        customPrompt: customPrompt?.trim() || ''
      }

      // Validate subject if provided
      if (subject && !FINNISH_SUBJECTS.includes(subject as FinnishSubject)) {
        return ApiResponseBuilder.validationError(
          'Invalid subject. Must be one of the supported Finnish subjects.',
          `Valid subjects: ${FINNISH_SUBJECTS.join(', ')}`
        )
      }

      // Validate grade if provided
      if (grade && (typeof grade !== 'number' || grade < 1 || grade > 9)) {
        return ApiResponseBuilder.validationError(
          'Invalid grade. Must be between 1 and 9.',
          'Grade must be a number from 1 to 9 representing the student\'s school year.'
        )
      }

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
    console.log('=== MOBILE API REQUEST DETAILS ===')
    console.log('Processing ID:', processingId)
    console.log('Image count:', images.length)
    console.log('Subject:', subject || 'not specified')
    console.log('Grade:', grade || 'not specified')
    console.log('Student ID:', student_id || 'not specified')
    console.log('Client IP:', clientInfo.ip)
    console.log('User Agent:', clientInfo.userAgent.substring(0, 100))
    console.log('=== END REQUEST DETAILS ===')

      // Process exam generation through service layer with ExamGenie parameters
      const result = await MobileApiService.generateExam({
        images,
        customPrompt,
        processingId,
        // ExamGenie MVP parameters
        subject,
        grade,
        student_id,
        user_id: authContext.user?.id
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
  })
}

// Handle CORS preflight requests
export async function OPTIONS(_request: NextRequest) {
  return ApiResponseBuilder.cors(
    ['POST', 'OPTIONS'],
    ['Content-Type', 'Authorization'],
    '*'
  )
}

