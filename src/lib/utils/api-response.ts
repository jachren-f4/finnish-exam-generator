import { NextResponse } from 'next/server'

export interface ApiSuccessResponse<T = any> {
  success: true
  data?: T
  metadata?: {
    timestamp: string
    processingTime?: number
    requestId?: string
    [key: string]: any
  }
  // Additional fields for mobile API compatibility
  exam_url?: string
  exam_id?: string
  grading_url?: string
}

export interface ApiErrorResponse {
  success: false
  error: string
  details?: string
  code?: string
  metadata?: {
    timestamp: string
    requestId?: string
    [key: string]: any
  }
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

export interface ResponseOptions {
  status?: number
  headers?: Record<string, string>
  requestId?: string
  processingTime?: number
}

/**
 * API Response Builder - Provides consistent response formatting across all API endpoints
 * Ensures uniform structure and proper HTTP status codes
 */
export class ApiResponseBuilder {
  /**
   * Create a successful response
   */
  static success<T>(
    data?: T,
    options: ResponseOptions = {}
  ): NextResponse<ApiSuccessResponse<T>> {
    const response: ApiSuccessResponse<T> = {
      success: true,
      metadata: {
        timestamp: new Date().toISOString(),
        ...(options.requestId && { requestId: options.requestId }),
        ...(options.processingTime && { processingTime: options.processingTime })
      }
    }

    if (data !== undefined) {
      response.data = data
    }

    const status = options.status || 200
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    return NextResponse.json(response, { status, headers })
  }

  /**
   * Create a successful response with exam URLs (mobile API compatibility)
   */
  static successWithExam<T>(
    data: T,
    examResult: { examUrl: string; examId: string; gradingUrl: string } | null,
    options: ResponseOptions = {}
  ): NextResponse<ApiSuccessResponse<T>> {
    const response: ApiSuccessResponse<T> = {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        ...(options.requestId && { requestId: options.requestId }),
        ...(options.processingTime && { processingTime: options.processingTime })
      }
    }

    // Add exam URLs at root level for Flutter app compatibility
    if (examResult) {
      response.exam_url = examResult.examUrl
      response.exam_id = examResult.examId
      response.grading_url = examResult.gradingUrl
    }

    const status = options.status || 200
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    return NextResponse.json(response, { status, headers })
  }

  /**
   * Create an error response
   */
  static error(
    error: string,
    details?: string,
    options: ResponseOptions = {}
  ): NextResponse<ApiErrorResponse> {
    const response: ApiErrorResponse = {
      success: false,
      error,
      metadata: {
        timestamp: new Date().toISOString(),
        ...(options.requestId && { requestId: options.requestId })
      }
    }

    if (details) {
      response.details = details
    }

    const status = options.status || 500
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    return NextResponse.json(response, { status, headers })
  }

  /**
   * Create a validation error response (400)
   */
  static validationError(
    message: string,
    details?: string,
    options: Omit<ResponseOptions, 'status'> = {}
  ): NextResponse<ApiErrorResponse> {
    return this.error(message, details, { ...options, status: 400 })
  }

  /**
   * Create an unauthorized error response (401)
   */
  static unauthorized(
    message: string = 'Unauthorized',
    options: Omit<ResponseOptions, 'status'> = {}
  ): NextResponse<ApiErrorResponse> {
    return this.error(message, undefined, { ...options, status: 401 })
  }

  /**
   * Create a forbidden error response (403)
   */
  static forbidden(
    message: string = 'Forbidden',
    options: Omit<ResponseOptions, 'status'> = {}
  ): NextResponse<ApiErrorResponse> {
    return this.error(message, undefined, { ...options, status: 403 })
  }

  /**
   * Create a not found error response (404)
   */
  static notFound(
    message: string = 'Not found',
    details?: string,
    options: Omit<ResponseOptions, 'status'> = {}
  ): NextResponse<ApiErrorResponse> {
    return this.error(message, details, { ...options, status: 404 })
  }

  /**
   * Create a method not allowed error response (405)
   */
  static methodNotAllowed(
    allowedMethods: string[] = [],
    options: Omit<ResponseOptions, 'status' | 'headers'> = {}
  ): NextResponse<ApiErrorResponse> {
    const headers: Record<string, string> = allowedMethods.length > 0 
      ? { Allow: allowedMethods.join(', ') }
      : {}

    return this.error(
      'Method not allowed',
      `Allowed methods: ${allowedMethods.join(', ')}`,
      { ...options, status: 405, headers }
    )
  }

  /**
   * Create a too many requests error response (429)
   */
  static tooManyRequests(
    message: string = 'Too many requests',
    retryAfter?: number,
    options: Omit<ResponseOptions, 'status'> = {}
  ): NextResponse<ApiErrorResponse> {
    const headers: Record<string, string> = retryAfter 
      ? { 'Retry-After': retryAfter.toString() }
      : {}

    return this.error(message, undefined, { 
      ...options, 
      status: 429, 
      headers: { ...headers, ...options.headers }
    })
  }

  /**
   * Create an internal server error response (500)
   */
  static internalError(
    message: string = 'Internal server error',
    details?: string,
    options: Omit<ResponseOptions, 'status'> = {}
  ): NextResponse<ApiErrorResponse> {
    return this.error(message, details, { ...options, status: 500 })
  }

  /**
   * Create CORS preflight response
   */
  static cors(
    allowedMethods: string[] = ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: string[] = ['Content-Type', 'Authorization'],
    allowedOrigins: string = '*'
  ): NextResponse {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigins,
        'Access-Control-Allow-Methods': allowedMethods.join(', '),
        'Access-Control-Allow-Headers': allowedHeaders.join(', '),
        'Access-Control-Max-Age': '86400'
      }
    })
  }
}