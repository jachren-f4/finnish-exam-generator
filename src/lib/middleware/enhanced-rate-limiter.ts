/**
 * Enhanced Rate Limiting System
 * Per-user and per-endpoint rate limiting with flexible policies
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiResponseBuilder } from '../utils/api-response'
import { TokenManager, tokenManager } from '../auth/token-manager'
import { metricsCollector } from '../utils/metrics-collector'
import { globalCache } from '../utils/cache-manager'

export interface RateLimitRule {
  windowMs: number      // Time window in milliseconds
  maxRequests: number   // Maximum requests in window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (request: NextRequest, userId?: string) => string
  onLimitReached?: (identifier: string, resetTime: Date) => void
}

export interface RateLimitConfig {
  global?: RateLimitRule
  perUser?: RateLimitRule
  perEndpoint?: Record<string, RateLimitRule>
  perUserPerEndpoint?: Record<string, RateLimitRule>
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  resetTime: Date
  retryAfter: number
}

export interface RateLimitStatus {
  allowed: boolean
  info: RateLimitInfo
  limitType: 'global' | 'per-user' | 'per-endpoint' | 'per-user-per-endpoint'
}

/**
 * Advanced Rate Limiter with multiple policy support
 */
export class EnhancedRateLimiter {
  private requests = new Map<string, number[]>()
  
  constructor(private config: RateLimitConfig) {
    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  /**
   * Check if request is allowed under all applicable rate limits
   */
  checkRateLimit(request: NextRequest, userId?: string): RateLimitStatus {
    const now = Date.now()
    const pathname = request.nextUrl.pathname
    const ip = this.getClientIP(request)

    // Check in order of specificity (most specific first)
    
    // 1. Per-user per-endpoint limit
    const userEndpointRule = this.getUserEndpointRule(pathname, userId)
    if (userEndpointRule && userId) {
      const key = `user:${userId}:endpoint:${pathname}`
      const status = this.checkLimit(key, userEndpointRule, now)
      if (!status.allowed) {
        return { ...status, limitType: 'per-user-per-endpoint' }
      }
    }

    // 2. Per-endpoint limit
    const endpointRule = this.getEndpointRule(pathname)
    if (endpointRule) {
      const key = `endpoint:${pathname}`
      const status = this.checkLimit(key, endpointRule, now)
      if (!status.allowed) {
        return { ...status, limitType: 'per-endpoint' }
      }
    }

    // 3. Per-user limit
    if (this.config.perUser && userId) {
      const key = this.config.perUser.keyGenerator 
        ? this.config.perUser.keyGenerator(request, userId)
        : `user:${userId}`
      const status = this.checkLimit(key, this.config.perUser, now)
      if (!status.allowed) {
        return { ...status, limitType: 'per-user' }
      }
    }

    // 4. Global limit
    if (this.config.global) {
      const key = this.config.global.keyGenerator 
        ? this.config.global.keyGenerator(request, userId)
        : `global:${ip}`
      const status = this.checkLimit(key, this.config.global, now)
      if (!status.allowed) {
        return { ...status, limitType: 'global' }
      }
    }

    // If we get here, all rate limits pass
    return {
      allowed: true,
      info: {
        limit: 0,
        remaining: 0,
        resetTime: new Date(),
        retryAfter: 0
      },
      limitType: 'global'
    }
  }

  /**
   * Record a request (after it's processed)
   */
  recordRequest(request: NextRequest, userId?: string, statusCode?: number): void {
    const now = Date.now()
    const pathname = request.nextUrl.pathname
    const ip = this.getClientIP(request)

    // Record for all applicable limits
    
    // Per-user per-endpoint
    const userEndpointRule = this.getUserEndpointRule(pathname, userId)
    if (userEndpointRule && userId && this.shouldRecord(userEndpointRule, statusCode)) {
      const key = `user:${userId}:endpoint:${pathname}`
      this.addRequest(key, now)
    }

    // Per-endpoint
    const endpointRule = this.getEndpointRule(pathname)
    if (endpointRule && this.shouldRecord(endpointRule, statusCode)) {
      const key = `endpoint:${pathname}`
      this.addRequest(key, now)
    }

    // Per-user
    if (this.config.perUser && userId && this.shouldRecord(this.config.perUser, statusCode)) {
      const key = this.config.perUser.keyGenerator 
        ? this.config.perUser.keyGenerator(request, userId)
        : `user:${userId}`
      this.addRequest(key, now)
    }

    // Global
    if (this.config.global && this.shouldRecord(this.config.global, statusCode)) {
      const key = this.config.global.keyGenerator 
        ? this.config.global.keyGenerator(request, userId)
        : `global:${ip}`
      this.addRequest(key, now)
    }
  }

  /**
   * Check a specific rate limit
   */
  private checkLimit(key: string, rule: RateLimitRule, now: number): RateLimitStatus {
    const requests = this.requests.get(key) || []
    
    // Filter requests within the current window
    const validRequests = requests.filter(time => now - time < rule.windowMs)
    
    const remaining = Math.max(0, rule.maxRequests - validRequests.length)
    const oldestRequest = validRequests.length > 0 ? Math.min(...validRequests) : now
    const resetTime = new Date(oldestRequest + rule.windowMs)
    const retryAfter = Math.ceil((resetTime.getTime() - now) / 1000)

    const info: RateLimitInfo = {
      limit: rule.maxRequests,
      remaining,
      resetTime,
      retryAfter
    }

    if (validRequests.length >= rule.maxRequests) {
      // Call rate limit reached callback if configured
      if (rule.onLimitReached) {
        rule.onLimitReached(key, resetTime)
      }

      return {
        allowed: false,
        info,
        limitType: 'global' // Will be overridden by caller
      }
    }

    return {
      allowed: true,
      info,
      limitType: 'global' // Will be overridden by caller
    }
  }

  /**
   * Add a request to the tracking
   */
  private addRequest(key: string, timestamp: number): void {
    const requests = this.requests.get(key) || []
    requests.push(timestamp)
    this.requests.set(key, requests)
  }

  /**
   * Check if request should be recorded based on rule configuration
   */
  private shouldRecord(rule: RateLimitRule, statusCode?: number): boolean {
    if (!statusCode) return true
    
    if (rule.skipSuccessfulRequests && statusCode >= 200 && statusCode < 400) {
      return false
    }
    
    if (rule.skipFailedRequests && statusCode >= 400) {
      return false
    }
    
    return true
  }

  /**
   * Get per-endpoint rule
   */
  private getEndpointRule(pathname: string): RateLimitRule | undefined {
    if (!this.config.perEndpoint) return undefined
    
    // Try exact match first
    if (this.config.perEndpoint[pathname]) {
      return this.config.perEndpoint[pathname]
    }
    
    // Try pattern matching
    for (const [pattern, rule] of Object.entries(this.config.perEndpoint)) {
      if (this.matchesPattern(pathname, pattern)) {
        return rule
      }
    }
    
    return undefined
  }

  /**
   * Get per-user per-endpoint rule
   */
  private getUserEndpointRule(pathname: string, userId?: string): RateLimitRule | undefined {
    if (!this.config.perUserPerEndpoint || !userId) return undefined
    
    // Try exact match first
    if (this.config.perUserPerEndpoint[pathname]) {
      return this.config.perUserPerEndpoint[pathname]
    }
    
    // Try pattern matching
    for (const [pattern, rule] of Object.entries(this.config.perUserPerEndpoint)) {
      if (this.matchesPattern(pathname, pattern)) {
        return rule
      }
    }
    
    return undefined
  }

  /**
   * Simple pattern matching for endpoints
   */
  private matchesPattern(pathname: string, pattern: string): boolean {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1)
      return pathname.startsWith(prefix)
    }
    return pathname === pattern
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for') 
      || request.headers.get('x-real-ip') 
      || request.headers.get('x-forwarded-host')
      || 'unknown'
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now()
    
    for (const [key, requests] of this.requests.entries()) {
      // Find the maximum window size from all rules
      const maxWindow = Math.max(
        this.config.global?.windowMs || 0,
        this.config.perUser?.windowMs || 0,
        ...Object.values(this.config.perEndpoint || {}).map(r => r.windowMs),
        ...Object.values(this.config.perUserPerEndpoint || {}).map(r => r.windowMs)
      )
      
      const validRequests = requests.filter(time => now - time < maxWindow)
      
      if (validRequests.length === 0) {
        this.requests.delete(key)
      } else {
        this.requests.set(key, validRequests)
      }
    }
  }

  /**
   * Get current rate limit status for debugging
   */
  getStatus(request: NextRequest, userId?: string): Record<string, RateLimitInfo> {
    const now = Date.now()
    const pathname = request.nextUrl.pathname
    const ip = this.getClientIP(request)
    const status: Record<string, RateLimitInfo> = {}

    // Global status
    if (this.config.global) {
      const key = this.config.global.keyGenerator 
        ? this.config.global.keyGenerator(request, userId)
        : `global:${ip}`
      const limitStatus = this.checkLimit(key, this.config.global, now)
      status.global = limitStatus.info
    }

    // Per-user status
    if (this.config.perUser && userId) {
      const key = this.config.perUser.keyGenerator 
        ? this.config.perUser.keyGenerator(request, userId)
        : `user:${userId}`
      const limitStatus = this.checkLimit(key, this.config.perUser, now)
      status.perUser = limitStatus.info
    }

    return status
  }
}

/**
 * Middleware wrapper for enhanced rate limiting
 */
export function withEnhancedRateLimit<T extends any[]>(
  rateLimiter: EnhancedRateLimiter,
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now()
    
    // Extract user ID from token if present
    let userId: string | undefined
    const authHeader = request.headers.get('authorization')
    const token = TokenManager.extractBearerToken(authHeader || undefined)
    
    if (token) {
      const validation = await tokenManager.validateAccessToken(token)
      if (validation.isValid && validation.payload) {
        userId = validation.payload.userId
      }
    }

    // Check rate limits
    const rateLimitStatus = rateLimiter.checkRateLimit(request, userId)
    
    if (!rateLimitStatus.allowed) {
      // Record rate limit violation
      metricsCollector.recordAuthAttempt({
        success: false,
        reason: `rate_limit_${rateLimitStatus.limitType}`,
        endpoint: request.nextUrl.pathname,
        timestamp: new Date(),
        duration: Date.now() - startTime,
        userId,
        ip: request.headers.get('x-forwarded-for') || undefined
      })

      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitStatus.info.resetTime.toISOString(),
          limitType: rateLimitStatus.limitType
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitStatus.info.retryAfter.toString(),
            'X-RateLimit-Limit': rateLimitStatus.info.limit.toString(),
            'X-RateLimit-Remaining': rateLimitStatus.info.remaining.toString(),
            'X-RateLimit-Reset': rateLimitStatus.info.resetTime.toISOString(),
            'X-RateLimit-Type': rateLimitStatus.limitType
          }
        }
      )
    }

    // Execute the handler
    const response = await handler(request, ...args)
    
    // Record the request for rate limiting
    rateLimiter.recordRequest(request, userId, response.status)
    
    // Add rate limit headers to successful responses
    const status = rateLimiter.getStatus(request, userId)
    if (status.global) {
      response.headers.set('X-RateLimit-Limit', status.global.limit.toString())
      response.headers.set('X-RateLimit-Remaining', status.global.remaining.toString())
      response.headers.set('X-RateLimit-Reset', status.global.resetTime.toISOString())
    }
    
    return response
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimitConfigs = {
  // Strict rate limiting for authentication endpoints
  auth: new EnhancedRateLimiter({
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 50, // 50 attempts per IP per 15 minutes
      onLimitReached: (key, resetTime) => {
        console.warn(`🚨 Auth rate limit reached for ${key}, resets at ${resetTime}`)
      }
    },
    perEndpoint: {
      '/api/auth/login': {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5, // 5 login attempts per IP per 15 minutes
        skipSuccessfulRequests: true
      },
      '/api/auth/refresh': {
        windowMs: 5 * 60 * 1000, // 5 minutes
        maxRequests: 10 // 10 refresh attempts per 5 minutes
      }
    }
  }),

  // General API rate limiting
  api: new EnhancedRateLimiter({
    global: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 1000 // 1000 requests per IP per minute
    },
    perUser: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 500 // 500 requests per user per minute
    },
    perUserPerEndpoint: {
      '/api/exam/*/process': {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10 // 10 exam processing requests per user per minute
      }
    }
  }),

  // Restrictive rate limiting for expensive operations
  expensive: new EnhancedRateLimiter({
    perUser: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 100 // 100 expensive operations per user per hour
    },
    perEndpoint: {
      '/api/performance/dashboard': {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 30 // 30 dashboard requests per minute
      }
    }
  })
}