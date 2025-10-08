import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { OperationTimer } from '@/lib/utils/performance-logger'
import { RequestProcessor } from '@/lib/middleware/request-processor'
import { MobileApiService } from '@/lib/services/mobile-api-service'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { ErrorManager, ErrorCategory } from '@/lib/utils/error-manager'
import { withOptionalAuth } from '@/middleware/auth'
import { FINNISH_SUBJECTS, FinnishSubject } from '@/lib/supabase'
import { getRateLimiter } from '@/lib/services/rate-limiter'
import { getRequestLogger } from '@/lib/services/request-logger'
import { getJWTValidator } from '@/lib/services/jwt-validator'

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
      const category = formData.get('category')?.toString() // 'mathematics', 'core_academics', 'language_studies'
      const subject = formData.get('subject')?.toString() as FinnishSubject // For backwards compatibility
      const gradeStr = formData.get('grade')?.toString()
      const grade = gradeStr ? parseInt(gradeStr, 10) : undefined
      // Backward compatibility: Accept both user_id and student_id (mobile app currently sends student_id)
      const user_id = formData.get('user_id')?.toString() || formData.get('student_id')?.toString()
      const language = formData.get('language')?.toString() || 'en' // User's language for exam generation

      // --- OPTIONAL JWT VALIDATION (Phase 2) ---
      // Attempt to validate JWT from Authorization header
      // Falls back to user_id from body if JWT not provided (backwards compatibility)
      let jwtUserId: string | null = null
      let hasValidJwt = false
      const authHeader = req.headers.get('Authorization')

      if (authHeader) {
        const jwtValidator = getJWTValidator()
        const validationResult = await jwtValidator.validateToken(authHeader)

        if (validationResult.valid) {
          jwtUserId = validationResult.userId
          hasValidJwt = true
          console.log(`[JWT] Valid token for user: ${jwtUserId}`)
        } else {
          console.warn(`[JWT] Invalid token: ${validationResult.error}`)
        }
      }

      // Determine final user_id: JWT takes precedence over body
      const finalUserId = jwtUserId || user_id
      // --- END JWT VALIDATION ---

      // --- RATE LIMITING CHECK ---
      // Check rate limit BEFORE processing images to save resources
      if (!finalUserId) {
        return ApiResponseBuilder.validationError(
          'user_id tai student_id vaaditaan', // Finnish: user_id or student_id required
          'Rate limiting requires user identification',
          { requestId: processingId }
        )
      }

      const rateLimiter = getRateLimiter()
      const rateLimitResult = await rateLimiter.checkAllLimits(finalUserId)

      if (!rateLimitResult.allowed) {
        // Rate limit exceeded - return 429 with Finnish error message
        console.warn(`[RateLimit] User ${finalUserId} exceeded limit (${rateLimitResult.limit} per hour)`)

        // Log rate limit violation
        const logger = getRequestLogger()
        logger.logRequest({
          requestId: processingId,
          userId: finalUserId,
          endpoint: '/api/mobile/exam-questions',
          method: 'POST',
          ipAddress: clientInfo.ip,
          userAgent: clientInfo.userAgent,
          imageCount: images?.length || 0,
          hasValidJwt,
          authSource: hasValidJwt ? 'jwt' : (user_id ? 'body' : 'none'),
          requestMetadata: { grade, subject, category, language },
          responseStatus: 429,
          processingTimeMs: Date.now() - timer['startTime'],
          errorCode: 'RATE_LIMIT_EXCEEDED',
          rateLimitStatus: 'exceeded',
          rateLimitRemaining: 0,
        })

        return NextResponse.json(
          {
            error: 'Päivittäinen koeraja saavutettu', // Finnish: Daily exam limit reached
            error_code: 'RATE_LIMIT_EXCEEDED',
            limit: rateLimitResult.limit,
            remaining: 0,
            resetAt: rateLimitResult.resetAt.toISOString(),
            retryAfter: rateLimitResult.retryAfter,
            details: `Voit luoda uuden kokeen ${Math.ceil((rateLimitResult.retryAfter || 0) / 60)} minuutin kuluttua.`, // You can create a new exam in X minutes
            requestId: processingId
          },
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
              'X-RateLimit-Limit': rateLimitResult.limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': Math.floor(rateLimitResult.resetAt.getTime() / 1000).toString()
            }
          }
        )
      }

      // Log successful rate limit check
      console.log(`[RateLimit] User ${finalUserId} - Remaining: ${rateLimitResult.remaining}/${rateLimitResult.limit}`)
      console.log(`[Auth] JWT provided: ${hasValidJwt}, Source: ${hasValidJwt ? 'jwt' : (user_id ? 'body' : 'none')}`)
      // --- END RATE LIMITING ---

      // Create processed data structure
      const processedData = {
        images,
        customPrompt: customPrompt?.trim() || ''
      }

      // Validate category if provided (subject is now optional for backwards compatibility)
      const validCategories = ['mathematics', 'core_academics', 'language_studies']
      if (category && !validCategories.includes(category)) {
        return ApiResponseBuilder.validationError(
          'Invalid category. Must be one of: mathematics, core_academics, language_studies',
          'Category determines the type of exam questions to generate.'
        )
      }

      // Validate subject if provided (for backwards compatibility)
      if (subject && !category && !FINNISH_SUBJECTS.includes(subject as FinnishSubject)) {
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
    console.log('Category:', category || 'not specified')
    console.log('Subject:', subject || 'not specified (will be detected)')
    console.log('Grade:', grade || 'not specified')
    console.log('User ID (final):', finalUserId || 'not specified')
    console.log('User ID (from JWT):', jwtUserId || 'not provided')
    console.log('User ID (from body):', user_id || 'not provided')
    console.log('Auth Method:', hasValidJwt ? 'JWT' : (user_id ? 'Body' : 'None'))
    console.log('Language:', language)
    console.log('Client IP:', clientInfo.ip)
    console.log('User Agent:', clientInfo.userAgent.substring(0, 100))
    console.log('=== END REQUEST DETAILS ===')

      // Process exam generation through service layer with ExamGenie parameters
      const result = await MobileApiService.generateExam({
        images,
        customPrompt,
        processingId,
        // ExamGenie MVP parameters
        category: category || undefined,
        subject: subject && !category ? subject : undefined, // Only use subject if category not provided
        grade,
        language,
        user_id: finalUserId || authContext.user?.id // Use finalUserId (JWT or body) or authenticated user
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

    // Get updated rate limit status for response headers
    const finalRateLimitStatus = finalUserId ? await getRateLimiter().getUsage(finalUserId) : null

    const response = ApiResponseBuilder.successWithExam(
      result.data,
      examResult,
      {
        requestId: processingId,
        processingTime: result.data?.metadata.processingTime
      }
    )

    // Add rate limit headers to successful response
    if (finalRateLimitStatus) {
      response.headers.set('X-RateLimit-Limit', finalRateLimitStatus.hourlyLimit.toString())
      response.headers.set('X-RateLimit-Remaining', (finalRateLimitStatus.hourlyLimit - finalRateLimitStatus.hourly).toString())
      const resetTime = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      response.headers.set('X-RateLimit-Reset', Math.floor(resetTime.getTime() / 1000).toString())
    }

    // Log successful request
    const logger = getRequestLogger()
    logger.logRequest({
      requestId: processingId,
      userId: finalUserId,
      endpoint: '/api/mobile/exam-questions',
      method: 'POST',
      ipAddress: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      imageCount: images?.length || 0,
      hasValidJwt,
      authSource: hasValidJwt ? 'jwt' : (user_id ? 'body' : 'none'),
      requestMetadata: { grade, subject, category, language },
      responseStatus: 200,
      processingTimeMs: result.data?.metadata.processingTime,
      rateLimitStatus: 'passed',
      rateLimitRemaining: finalRateLimitStatus ? (finalRateLimitStatus.hourlyLimit - finalRateLimitStatus.hourly) : undefined,
    })

    return response

    } catch (error) {
      // Handle unexpected errors
      const managedError = ErrorManager.handleError(error, errorContext)

      // Log error
      const logger = getRequestLogger()
      logger.logRequest({
        requestId: processingId,
        userId: authContext.user?.id,
        endpoint: '/api/mobile/exam-questions',
        method: 'POST',
        ipAddress: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        hasValidJwt: false,
        authSource: 'none',
        responseStatus: 500,
        errorCode: managedError.code || 'INTERNAL_ERROR',
      })

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

