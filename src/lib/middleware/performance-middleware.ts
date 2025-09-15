/**
 * Performance Middleware for automatic API instrumentation
 * Tracks request timing, metrics collection, and performance monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { metricsCollector, RequestMetrics } from '../utils/metrics-collector'
import { OperationTimer } from '../utils/performance-logger'
import { PERFORMANCE_CONFIG } from '../config'

export interface PerformanceContext {
  requestId: string
  timer: OperationTimer
  startTime: number
  endpoint: string
  method: string
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Extract clean endpoint name from URL
 */
function extractEndpoint(pathname: string): string {
  // Replace dynamic segments with placeholders
  return pathname
    .replace(/\/api/, '')
    .replace(/\/[a-f0-9-]{36}/g, '/[id]') // UUIDs
    .replace(/\/[a-f0-9]{8,}/g, '/[id]') // Long hex IDs
    .replace(/\/\d+/g, '/[id]') // Numeric IDs
    .replace(/\/+/g, '/') // Multiple slashes
    .replace(/\/$/, '') // Trailing slash
    || '/'
}

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') 
    || request.headers.get('x-real-ip') 
    || request.headers.get('x-forwarded-host')
    || 'unknown'
}

/**
 * Calculate request/response sizes
 */
function calculateSizes(request: NextRequest, response?: NextResponse): {
  request: number
  response: number
} {
  const requestSize = parseInt(request.headers.get('content-length') || '0')
  const responseSize = response 
    ? parseInt(response.headers.get('content-length') || '0')
    : 0

  return { request: requestSize, response: responseSize }
}

/**
 * Middleware wrapper for automatic performance tracking
 */
export function withPerformanceTracking<T extends any[]>(
  handler: (request: NextRequest, context: PerformanceContext, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const requestId = generateRequestId()
    const startTime = Date.now()
    const endpoint = extractEndpoint(request.nextUrl.pathname)
    const method = request.method
    
    // Create performance context
    const timer = new OperationTimer(`${method} ${endpoint}`)
    const context: PerformanceContext = {
      requestId,
      timer,
      startTime,
      endpoint,
      method
    }

    // Log request start
    if (PERFORMANCE_CONFIG.TIMING_ENABLED) {
      console.log(`🚀 [${requestId}] ${method} ${request.nextUrl.pathname} started`)
    }

    let response: NextResponse
    let statusCode = 200
    let error: string | undefined

    try {
      // Call the actual handler
      response = await handler(request, context, ...args)
      statusCode = response.status
    } catch (err) {
      statusCode = 500
      error = err instanceof Error ? err.message : 'Unknown error'
      
      // Create error response
      response = NextResponse.json(
        { error: 'Internal server error', requestId },
        { status: 500 }
      )
    }

    // Calculate metrics
    const duration = Date.now() - startTime
    const sizes = calculateSizes(request, response)
    
    // Record metrics
    const metrics: RequestMetrics = {
      requestId,
      endpoint,
      method,
      statusCode,
      duration,
      timestamp: new Date(startTime),
      userAgent: request.headers.get('user-agent') || undefined,
      ip: getClientIP(request),
      size: sizes,
      error
    }

    metricsCollector.recordRequest(metrics)

    // Complete the operation timer
    timer.complete({
      statusCode,
      requestSize: sizes.request,
      responseSize: sizes.response,
      error
    })

    // Add performance headers to response
    response.headers.set('x-request-id', requestId)
    response.headers.set('x-response-time', `${duration}ms`)
    
    if (PERFORMANCE_CONFIG.TIMING_ENABLED) {
      response.headers.set('x-debug-timing', 'enabled')
    }

    return response
  }
}

/**
 * Simple performance wrapper for existing handlers
 */
export function performanceWrapper(
  handler: (request: NextRequest) => Promise<NextResponse>,
  operationName?: string
) {
  return withPerformanceTracking(async (request: NextRequest, context: PerformanceContext) => {
    // Update operation name if provided
    if (operationName) {
      context.timer = new OperationTimer(operationName)
    }
    
    return handler(request)
  })
}

/**
 * Enhanced error handling with performance tracking
 */
export async function handleWithPerformance<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: PerformanceContext
): Promise<T> {
  const timer = context?.timer || new OperationTimer(operationName)
  const phaseTimer = timer.startPhase(operationName)
  
  try {
    const result = await operation()
    timer.endPhase(operationName)
    return result
  } catch (error) {
    timer.endPhase(operationName)
    
    // Log the error with context
    if (PERFORMANCE_CONFIG.TIMING_ENABLED) {
      console.error(`❌ [${context?.requestId || 'unknown'}] ${operationName} failed:`, error)
    }
    
    throw error
  }
}

/**
 * Track external service calls
 */
export async function trackExternalCall<T>(
  serviceName: string,
  operation: () => Promise<T>,
  context?: PerformanceContext
): Promise<T> {
  const operationName = `External Call: ${serviceName}`
  return handleWithPerformance(operation, operationName, context)
}

/**
 * Track database operations
 */
export async function trackDatabaseOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  context?: PerformanceContext
): Promise<T> {
  const fullOperationName = `Database: ${operationName}`
  return handleWithPerformance(operation, fullOperationName, context)
}

/**
 * Middleware for rate limiting (basic implementation)
 */
export class RateLimiter {
  private requests = new Map<string, number[]>()
  private windowMs: number
  private maxRequests: number

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests
    
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000)
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []
    
    // Filter requests within the current window
    const validRequests = requests.filter(time => now - time < this.windowMs)
    
    if (validRequests.length >= this.maxRequests) {
      return false
    }
    
    // Add current request
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    
    return true
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs)
      if (validRequests.length === 0) {
        this.requests.delete(identifier)
      } else {
        this.requests.set(identifier, validRequests)
      }
    }
  }

  getRemainingRequests(identifier: string): number {
    const requests = this.requests.get(identifier) || []
    const now = Date.now()
    const validRequests = requests.filter(time => now - time < this.windowMs)
    return Math.max(0, this.maxRequests - validRequests.length)
  }

  getResetTime(identifier: string): Date {
    const requests = this.requests.get(identifier) || []
    if (requests.length === 0) {
      return new Date()
    }
    const oldestRequest = Math.min(...requests)
    return new Date(oldestRequest + this.windowMs)
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter(60000, 1000) // 1000 requests per minute

/**
 * Rate limiting middleware
 */
export function withRateLimit(
  rateLimiter: RateLimiter = globalRateLimiter,
  getIdentifier: (request: NextRequest) => string = (req) => getClientIP(req)
) {
  return function<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const identifier = getIdentifier(request)
      
      if (!rateLimiter.isAllowed(identifier)) {
        const resetTime = rateLimiter.getResetTime(identifier)
        
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            retryAfter: resetTime.toISOString()
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((resetTime.getTime() - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': rateLimiter['maxRequests'].toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': resetTime.toISOString()
            }
          }
        )
      }

      const response = await handler(request, ...args)
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', rateLimiter['maxRequests'].toString())
      response.headers.set('X-RateLimit-Remaining', rateLimiter.getRemainingRequests(identifier).toString())
      response.headers.set('X-RateLimit-Reset', rateLimiter.getResetTime(identifier).toISOString())
      
      return response
    }
  }
}