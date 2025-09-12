/**
 * Error Management System - Provides centralized error handling and logging
 * Standardizes error classification, logging, and user-friendly messages
 */

export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  DATABASE = 'DATABASE',
  FILE_PROCESSING = 'FILE_PROCESSING',
  NETWORK = 'NETWORK',
  INTERNAL = 'INTERNAL',
  RATE_LIMIT = 'RATE_LIMIT'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorContext {
  requestId?: string
  userId?: string
  endpoint?: string
  method?: string
  userAgent?: string
  timestamp?: string
  additionalData?: Record<string, any>
}

export interface ManagedError {
  code: string
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  details?: string
  userMessage: string
  context?: ErrorContext
  originalError?: Error
  stack?: string
  retryable: boolean
}

/**
 * Known error patterns and their handling
 */
export const ERROR_PATTERNS = {
  // File processing errors
  FILE_TOO_LARGE: {
    category: ErrorCategory.FILE_PROCESSING,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'File size exceeds the maximum limit of 10MB',
    retryable: false
  },
  UNSUPPORTED_FILE_TYPE: {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'File type not supported. Please upload JPEG, PNG, WebP, or HEIC files',
    retryable: false
  },
  TOO_MANY_FILES: {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'Too many files. Maximum 20 images allowed',
    retryable: false
  },
  
  // Gemini API errors
  GEMINI_API_ERROR: {
    category: ErrorCategory.EXTERNAL_SERVICE,
    severity: ErrorSeverity.HIGH,
    userMessage: 'AI processing service is temporarily unavailable',
    retryable: true
  },
  GEMINI_QUOTA_EXCEEDED: {
    category: ErrorCategory.RATE_LIMIT,
    severity: ErrorSeverity.HIGH,
    userMessage: 'Service quota exceeded. Please try again later',
    retryable: true
  },
  GEMINI_TIMEOUT: {
    category: ErrorCategory.EXTERNAL_SERVICE,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'Processing took too long. Please try with fewer or smaller images',
    retryable: true
  },
  
  // Database errors
  DATABASE_CONNECTION_ERROR: {
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.CRITICAL,
    userMessage: 'Database connection failed. Please try again',
    retryable: true
  },
  EXAM_CREATION_FAILED: {
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.HIGH,
    userMessage: 'Failed to save exam. Please try again',
    retryable: true
  },
  
  // Generic errors
  INTERNAL_SERVER_ERROR: {
    category: ErrorCategory.INTERNAL,
    severity: ErrorSeverity.HIGH,
    userMessage: 'An unexpected error occurred. Please try again',
    retryable: true
  },
  INVALID_REQUEST: {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'Invalid request format',
    retryable: false
  }
} as const

export type ErrorPatternKey = keyof typeof ERROR_PATTERNS

export class ErrorManager {
  /**
   * Create a managed error from a known pattern
   */
  static createFromPattern(
    patternKey: ErrorPatternKey,
    details?: string,
    context?: ErrorContext,
    originalError?: Error
  ): ManagedError {
    const pattern = ERROR_PATTERNS[patternKey]
    
    return {
      code: patternKey,
      category: pattern.category,
      severity: pattern.severity,
      message: details || pattern.userMessage,
      details,
      userMessage: pattern.userMessage,
      context: {
        timestamp: new Date().toISOString(),
        ...context
      },
      originalError,
      stack: originalError?.stack,
      retryable: pattern.retryable
    }
  }

  /**
   * Create a managed error from an unknown error
   */
  static createFromError(
    error: Error | unknown,
    context?: ErrorContext,
    category: ErrorCategory = ErrorCategory.INTERNAL
  ): ManagedError {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    
    // Try to match known error patterns
    const detectedPattern = this.detectErrorPattern(errorMessage)
    
    if (detectedPattern) {
      return this.createFromPattern(
        detectedPattern,
        errorMessage,
        context,
        error instanceof Error ? error : undefined
      )
    }

    // Create generic managed error
    return {
      code: 'UNKNOWN_ERROR',
      category,
      severity: ErrorSeverity.MEDIUM,
      message: errorMessage,
      userMessage: 'An unexpected error occurred. Please try again',
      context: {
        timestamp: new Date().toISOString(),
        ...context
      },
      originalError: error instanceof Error ? error : undefined,
      stack,
      retryable: true
    }
  }

  /**
   * Detect error pattern from error message
   */
  private static detectErrorPattern(message: string): ErrorPatternKey | null {
    const lowerMessage = message.toLowerCase()
    
    if (lowerMessage.includes('file too large') || lowerMessage.includes('size exceeds')) {
      return 'FILE_TOO_LARGE'
    }
    if (lowerMessage.includes('unsupported file') || lowerMessage.includes('invalid file type')) {
      return 'UNSUPPORTED_FILE_TYPE'
    }
    if (lowerMessage.includes('too many files') || lowerMessage.includes('maximum')) {
      return 'TOO_MANY_FILES'
    }
    if (lowerMessage.includes('gemini') && lowerMessage.includes('quota')) {
      return 'GEMINI_QUOTA_EXCEEDED'
    }
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return 'GEMINI_TIMEOUT'
    }
    if (lowerMessage.includes('database') || lowerMessage.includes('connection')) {
      return 'DATABASE_CONNECTION_ERROR'
    }
    if (lowerMessage.includes('exam') && lowerMessage.includes('failed')) {
      return 'EXAM_CREATION_FAILED'
    }
    
    return null
  }

  /**
   * Log error with appropriate level
   */
  static logError(managedError: ManagedError): void {
    const logData = {
      code: managedError.code,
      category: managedError.category,
      severity: managedError.severity,
      message: managedError.message,
      details: managedError.details,
      context: managedError.context,
      retryable: managedError.retryable
    }

    switch (managedError.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🚨 CRITICAL ERROR:', logData)
        if (managedError.stack) {
          console.error('Stack trace:', managedError.stack)
        }
        break
      
      case ErrorSeverity.HIGH:
        console.error('❌ HIGH SEVERITY ERROR:', logData)
        break
      
      case ErrorSeverity.MEDIUM:
        console.warn('⚠️  MEDIUM SEVERITY ERROR:', logData)
        break
      
      case ErrorSeverity.LOW:
        console.log('ℹ️  LOW SEVERITY ERROR:', logData)
        break
    }
  }

  /**
   * Get user-friendly error message with retry information
   */
  static getUserMessage(managedError: ManagedError): string {
    let message = managedError.userMessage
    
    if (managedError.retryable) {
      message += ' If the problem persists, please try again in a few minutes.'
    }
    
    return message
  }

  /**
   * Check if error should trigger alerting/monitoring
   */
  static shouldAlert(managedError: ManagedError): boolean {
    return managedError.severity === ErrorSeverity.CRITICAL || 
           managedError.severity === ErrorSeverity.HIGH
  }

  /**
   * Get HTTP status code for error
   */
  static getHttpStatus(managedError: ManagedError): number {
    switch (managedError.category) {
      case ErrorCategory.VALIDATION:
        return 400
      case ErrorCategory.AUTHENTICATION:
        return 401
      case ErrorCategory.AUTHORIZATION:
        return 403
      case ErrorCategory.RATE_LIMIT:
        return 429
      case ErrorCategory.EXTERNAL_SERVICE:
        return 502
      case ErrorCategory.DATABASE:
      case ErrorCategory.INTERNAL:
      default:
        return 500
    }
  }

  /**
   * Handle error with logging and return managed error
   */
  static handleError(
    error: Error | unknown,
    context?: ErrorContext,
    category?: ErrorCategory
  ): ManagedError {
    const managedError = this.createFromError(error, context, category)
    this.logError(managedError)
    return managedError
  }
}