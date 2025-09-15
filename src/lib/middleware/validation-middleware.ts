/**
 * Request Validation Middleware
 * Comprehensive input validation, sanitization, and security checks
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiResponseBuilder } from '../utils/api-response'
import { ErrorManager } from '../utils/error-manager'
import DOMPurify from 'isomorphic-dompurify'

export interface ValidationConfig {
  body?: z.ZodSchema<any>
  query?: z.ZodSchema<any>
  params?: z.ZodSchema<any>
  headers?: z.ZodSchema<any>
  files?: {
    maxSize?: number // bytes
    allowedTypes?: string[]
    maxFiles?: number
  }
  sanitize?: boolean
  csrfProtection?: boolean
  rateLimitBypass?: boolean
}

export interface ValidatedRequest<T = any> extends NextRequest {
  validatedBody?: T
  validatedQuery?: Record<string, any>
  validatedParams?: Record<string, any>
  validatedHeaders?: Record<string, any>
  sanitizedData?: T
}

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Sanitize string input to prevent XSS
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return String(input)
    
    // Use DOMPurify for XSS prevention
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    })
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject<T extends Record<string, any>>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj
    
    const sanitized = {} as T
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key as keyof T] = this.sanitizeString(value) as T[keyof T]
      } else if (Array.isArray(value)) {
        sanitized[key as keyof T] = value.map(item => 
          typeof item === 'string' ? this.sanitizeString(item) : 
          typeof item === 'object' ? this.sanitizeObject(item) : item
        ) as T[keyof T]
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key as keyof T] = this.sanitizeObject(value) as T[keyof T]
      } else {
        sanitized[key as keyof T] = value
      }
    }
    
    return sanitized
  }

  /**
   * Check for SQL injection patterns
   */
  static containsSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(--|\/\*|\*\/|;)/g,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /('|(\\')|('')|(%27)|(\-\-)|(\%2D\%2D))/g,
      /(\b(xp_|sp_|admin|information_schema)\b)/gi
    ]
    
    return sqlPatterns.some(pattern => pattern.test(input))
  }

  /**
   * Check for NoSQL injection patterns
   */
  static containsNoSQLInjection(input: string): boolean {
    const noSQLPatterns = [
      /(\$where|\$ne|\$gt|\$lt|\$in|\$nin|\$exists)/gi,
      /(javascript:|function\s*\()/gi,
      /(\{\s*\$)/g,
      /(\\u[0-9a-fA-F]{4})/g
    ]
    
    return noSQLPatterns.some(pattern => pattern.test(input))
  }

  /**
   * Validate against injection attacks
   */
  static validateNoInjection(input: string): { isValid: boolean; threat?: string } {
    if (this.containsSQLInjection(input)) {
      return { isValid: false, threat: 'sql_injection' }
    }
    
    if (this.containsNoSQLInjection(input)) {
      return { isValid: false, threat: 'nosql_injection' }
    }
    
    return { isValid: true }
  }
}

/**
 * File validation utilities
 */
export class FileValidator {
  static readonly SAFE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json'
  ]

  static readonly DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', 
    '.jar', '.php', '.asp', '.jsp', '.py', '.rb', '.sh', '.ps1'
  ]

  /**
   * Validate file type and size
   */
  static validateFile(file: File, config?: ValidationConfig['files']): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    
    // Check file size
    if (config?.maxSize && file.size > config.maxSize) {
      errors.push(`File size (${file.size} bytes) exceeds maximum (${config.maxSize} bytes)`)
    }
    
    // Check file type
    if (config?.allowedTypes && !config.allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} not allowed`)
    }
    
    // Check for dangerous extensions
    const fileName = file.name.toLowerCase()
    const hasDangerousExtension = this.DANGEROUS_EXTENSIONS.some(ext => 
      fileName.endsWith(ext)
    )
    
    if (hasDangerousExtension) {
      errors.push(`File extension not allowed for security reasons`)
    }
    
    // Verify file type matches content (basic check)
    if (file.type.startsWith('image/') && !fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      errors.push(`File type and extension mismatch`)
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars
      .replace(/_{2,}/g, '_') // Replace multiple underscores
      .substring(0, 255) // Limit length
  }
}

/**
 * CSRF protection utilities
 */
export class CSRFProtection {
  private static readonly SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']
  
  /**
   * Generate CSRF token
   */
  static generateToken(): string {
    return Buffer.from(`${Date.now()}_${Math.random().toString(36)}`).toString('base64')
  }

  /**
   * Validate CSRF token
   */
  static validateToken(request: NextRequest): boolean {
    if (this.SAFE_METHODS.includes(request.method)) {
      return true // CSRF protection not needed for safe methods
    }
    
    const tokenFromHeader = request.headers.get('x-csrf-token')
    const tokenFromCookie = request.cookies.get('csrf-token')?.value
    
    return !!(tokenFromHeader && tokenFromCookie && tokenFromHeader === tokenFromCookie)
  }
}

/**
 * Main validation middleware
 */
export function withValidation<T extends any[]>(
  config: ValidationConfig,
  handler: (request: ValidatedRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const validationErrors: string[] = []
    const validatedRequest = request as ValidatedRequest
    
    try {
      // CSRF Protection
      if (config.csrfProtection && !CSRFProtection.validateToken(request)) {
        return ApiResponseBuilder.forbidden(
          'CSRF validation failed - Missing or invalid CSRF token'
        )
      }

      // Parse request body if present
      let body: any = null
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        try {
          const contentType = request.headers.get('content-type')
          
          if (contentType?.includes('application/json')) {
            body = await request.json()
          } else if (contentType?.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData()
            body = Object.fromEntries(formData.entries())
          } else if (contentType?.includes('multipart/form-data')) {
            const formData = await request.formData()
            body = Object.fromEntries(formData.entries())
            
            // Validate files if present
            if (config.files) {
              const files = Array.from(formData.entries())
                .filter(([_, value]) => value instanceof File)
                .map(([key, file]) => ({ key, file: file as File }))
              
              if (config.files.maxFiles && files.length > config.files.maxFiles) {
                validationErrors.push(`Too many files: ${files.length} > ${config.files.maxFiles}`)
              }
              
              for (const { key, file } of files) {
                const validation = FileValidator.validateFile(file, config.files)
                if (!validation.isValid) {
                  validationErrors.push(`File ${key}: ${validation.errors.join(', ')}`)
                }
              }
            }
          }
        } catch (error) {
          validationErrors.push('Invalid request body format')
        }
      }

      // Parse query parameters
      const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries())

      // Validate body schema
      if (config.body && body) {
        try {
          const validation = config.body.safeParse(body)
          if (!validation.success) {
            validationErrors.push(...validation.error.issues.map(e =>
              `Body ${e.path.join('.')}: ${e.message}`
            ))
          } else {
            validatedRequest.validatedBody = validation.data
          }
        } catch (error) {
          validationErrors.push('Body validation failed')
        }
      }

      // Validate query schema
      if (config.query) {
        try {
          const validation = config.query.safeParse(queryParams)
          if (!validation.success) {
            validationErrors.push(...validation.error.issues.map(e =>
              `Query ${e.path.join('.')}: ${e.message}`
            ))
          } else {
            validatedRequest.validatedQuery = validation.data
          }
        } catch (error) {
          validationErrors.push('Query validation failed')
        }
      }

      // Validate parameters (from route params)
      if (config.params) {
        // Note: Route params would need to be passed separately in Next.js
        // This is a placeholder for when params are available
      }

      // Validate headers
      if (config.headers) {
        try {
          const headerObj = Object.fromEntries(request.headers.entries())
          const validation = config.headers.safeParse(headerObj)
          if (!validation.success) {
            validationErrors.push(...validation.error.issues.map(e =>
              `Header ${e.path.join('.')}: ${e.message}`
            ))
          } else {
            validatedRequest.validatedHeaders = validation.data
          }
        } catch (error) {
          validationErrors.push('Headers validation failed')
        }
      }

      // Check for injection attacks in all string inputs
      const checkInjection = (data: any, path = ''): void => {
        if (typeof data === 'string') {
          const injectionCheck = InputSanitizer.validateNoInjection(data)
          if (!injectionCheck.isValid) {
            validationErrors.push(`Potential ${injectionCheck.threat} detected in ${path || 'input'}`)
          }
        } else if (typeof data === 'object' && data !== null) {
          for (const [key, value] of Object.entries(data)) {
            checkInjection(value, path ? `${path}.${key}` : key)
          }
        }
      }

      if (body) checkInjection(body, 'body')
      checkInjection(queryParams, 'query')

      // Return validation errors if any
      if (validationErrors.length > 0) {
        const managedError = ErrorManager.createFromError(
          new Error('Validation failed'),
          {
            endpoint: request.nextUrl.pathname,
            method: request.method,
            additionalData: { errors: validationErrors }
          }
        )
        ErrorManager.logError(managedError)

        return ApiResponseBuilder.validationError(
          'Validation failed - ' + validationErrors.join('; ')
        )
      }

      // Sanitize data if requested
      if (config.sanitize) {
        if (body) {
          validatedRequest.sanitizedData = InputSanitizer.sanitizeObject(body)
        }
      }

      // Call the handler with validated request
      return handler(validatedRequest, ...args)

    } catch (error) {
      const managedError = ErrorManager.createFromError(
        error,
        {
          endpoint: request.nextUrl.pathname,
          method: request.method,
          additionalData: { validationConfig: config }
        }
      )
      ErrorManager.logError(managedError)

      return ApiResponseBuilder.internalError(
        'Validation middleware error - Unable to validate request'
      )
    }
  }
}

/**
 * Pre-defined validation schemas for common use cases
 */
export const ValidationSchemas = {
  // Authentication
  login: z.object({
    email: z.string().email('Invalid email format').min(1, 'Email required'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  }),

  refreshToken: z.object({
    refreshToken: z.string().min(1, 'Refresh token required')
  }),

  // Exam processing
  examProcess: z.object({
    examId: z.string().uuid('Invalid exam ID format'),
    options: z.object({
      extractText: z.boolean().optional(),
      detectHandwriting: z.boolean().optional(),
      language: z.string().optional()
    }).optional()
  }),

  // File upload
  fileUpload: z.object({
    file: z.any(), // File validation happens separately
    metadata: z.object({
      description: z.string().max(500, 'Description too long').optional(),
      tags: z.array(z.string()).max(10, 'Too many tags').optional()
    }).optional()
  }),

  // Query parameters
  paginationQuery: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional()
  }),

  // Common headers
  authHeaders: z.object({
    authorization: z.string().regex(/^Bearer /, 'Authorization must be Bearer token'),
    'content-type': z.string().optional(),
    'user-agent': z.string().optional()
  }).partial(),

  // UUID parameter
  uuidParam: z.object({
    id: z.string().uuid('Invalid ID format')
  })
}

/**
 * Pre-configured validation middleware for common scenarios
 */
export const ValidationConfigs = {
  // Basic JSON API validation
  jsonAPI: {
    sanitize: true,
    csrfProtection: false
  },

  // Authentication endpoints
  auth: {
    body: ValidationSchemas.login,
    sanitize: true,
    csrfProtection: true
  },

  // File upload validation
  fileUpload: {
    files: {
      maxSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      allowedTypes: ['image/jpeg', 'image/png', 'application/pdf']
    },
    sanitize: true
  },

  // Admin endpoints - strict validation
  admin: {
    headers: ValidationSchemas.authHeaders,
    sanitize: true,
    csrfProtection: true
  }
}

// Install isomorphic-dompurify for safe HTML sanitization
// This is a placeholder - in practice you'd install: npm install isomorphic-dompurify