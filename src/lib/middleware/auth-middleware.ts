/**
 * Authentication Middleware
 * Handles JWT token validation, user authentication, and authorization
 */

import { NextRequest, NextResponse } from 'next/server'
import { TokenManager, tokenManager, TokenPayload, TokenValidationResult } from '../auth/token-manager'
import { ApiResponseBuilder } from '../utils/api-response'
import { ErrorManager } from '../utils/error-manager'
import { metricsCollector } from '../utils/metrics-collector'

export interface AuthContext {
  user: TokenPayload
  isAuthenticated: true
}

export interface UnauthenticatedContext {
  user: null
  isAuthenticated: false
}

export type AuthenticationContext = AuthContext | UnauthenticatedContext

export interface AuthOptions {
  required?: boolean
  roles?: string[]
  skipPaths?: string[]
  rateLimit?: {
    windowMs: number
    maxRequests: number
  }
}

/**
 * Extract device information from request
 */
function getDeviceInfo(request: NextRequest) {
  return {
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') 
      || request.headers.get('x-real-ip') 
      || request.headers.get('x-forwarded-host')
      || 'unknown'
  }
}

/**
 * Check if path should skip authentication
 */
function shouldSkipPath(pathname: string, skipPaths: string[]): boolean {
  return skipPaths.some(skipPath => {
    if (skipPath.endsWith('*')) {
      const prefix = skipPath.slice(0, -1)
      return pathname.startsWith(prefix)
    }
    return pathname === skipPath
  })
}

/**
 * Authentication middleware wrapper
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, context: AuthenticationContext, ...args: T) => Promise<NextResponse>,
  options: AuthOptions = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = Date.now()
    const { pathname } = request.nextUrl
    
    // Default options
    const {
      required = true,
      roles = [],
      skipPaths = [],
    } = options

    // Skip authentication for certain paths
    if (shouldSkipPath(pathname, skipPaths)) {
      return handler(request, { user: null, isAuthenticated: false }, ...args)
    }

    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = TokenManager.extractBearerToken(authHeader)

    if (!token) {
      // Record authentication failure
      metricsCollector.recordAuthAttempt({
        success: false,
        reason: 'no_token',
        endpoint: pathname,
        timestamp: new Date(),
        duration: Date.now() - startTime
      })

      if (required) {
        return ApiResponseBuilder.unauthorized(
          'Authentication required',
          'Missing or invalid authorization token'
        )
      }
      
      return handler(request, { user: null, isAuthenticated: false }, ...args)
    }

    // Validate token
    const validation = await tokenManager.validateAccessToken(token)

    if (!validation.isValid) {
      // Record authentication failure
      metricsCollector.recordAuthAttempt({
        success: false,
        reason: validation.error || 'unknown',
        endpoint: pathname,
        timestamp: new Date(),
        duration: Date.now() - startTime
      })

      if (validation.error === 'expired' && validation.shouldRefresh) {
        return ApiResponseBuilder.unauthorized(
          'Token expired',
          'Please refresh your authentication token',
          { shouldRefresh: true }
        )
      }

      if (required) {
        return ApiResponseBuilder.unauthorized(
          'Authentication failed',
          'Invalid or expired token'
        )
      }

      return handler(request, { user: null, isAuthenticated: false }, ...args)
    }

    const { payload } = validation

    // Check role-based authorization
    if (roles.length > 0 && payload?.role) {
      if (!roles.includes(payload.role)) {
        // Record authorization failure
        metricsCollector.recordAuthAttempt({
          success: false,
          reason: 'insufficient_permissions',
          endpoint: pathname,
          timestamp: new Date(),
          duration: Date.now() - startTime,
          userId: payload.userId
        })

        return ApiResponseBuilder.forbidden(
          'Insufficient permissions',
          `Required role: ${roles.join(' or ')}`
        )
      }
    }

    // Record successful authentication
    metricsCollector.recordAuthAttempt({
      success: true,
      endpoint: pathname,
      timestamp: new Date(),
      duration: Date.now() - startTime,
      userId: payload!.userId
    })

    // Call handler with authenticated context
    return handler(request, { user: payload!, isAuthenticated: true }, ...args)
  }
}

/**
 * Simplified authentication wrapper for optional auth
 */
export function withOptionalAuth<T extends any[]>(
  handler: (request: NextRequest, context: AuthenticationContext, ...args: T) => Promise<NextResponse>
) {
  return withAuth(handler, { required: false })
}

/**
 * Role-based authentication wrapper
 */
export function withRoles<T extends any[]>(
  roles: string[],
  handler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<NextResponse>
) {
  return withAuth(
    async (request: NextRequest, context: AuthenticationContext, ...args: T) => {
      // TypeScript knows context.isAuthenticated is true due to roles requirement
      return handler(request, context as AuthContext, ...args)
    },
    { required: true, roles }
  )
}

/**
 * Admin-only authentication wrapper
 */
export function withAdminAuth<T extends any[]>(
  handler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<NextResponse>
) {
  return withRoles(['admin'], handler)
}

/**
 * Token refresh endpoint handler
 */
export async function handleTokenRefresh(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return ApiResponseBuilder.validationError(
        'Refresh token required',
        'Missing refresh token in request body'
      )
    }

    const deviceInfo = getDeviceInfo(request)
    const tokenPair = await tokenManager.refreshTokenPair(refreshToken, deviceInfo)

    if (!tokenPair) {
      return ApiResponseBuilder.unauthorized(
        'Invalid refresh token',
        'Refresh token is expired or revoked'
      )
    }

    return ApiResponseBuilder.success({
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresAt: tokenPair.expiresAt.toISOString(),
      refreshExpiresAt: tokenPair.refreshExpiresAt.toISOString()
    })

  } catch (error) {
    ErrorManager.logError(error, {
      endpoint: '/api/auth/refresh',
      method: 'POST'
    })

    return ApiResponseBuilder.internalError(
      'Token refresh failed',
      'Unable to process token refresh request'
    )
  }
}

/**
 * Login handler (simplified - would integrate with your auth provider)
 */
export async function handleLogin(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return ApiResponseBuilder.validationError(
        'Missing credentials',
        'Email and password are required'
      )
    }

    // Simplified authentication - replace with real authentication logic
    // This would typically validate against your user database
    const isValidCredentials = await validateCredentials(email, password)
    
    if (!isValidCredentials) {
      return ApiResponseBuilder.unauthorized(
        'Invalid credentials',
        'Email or password is incorrect'
      )
    }

    // Get user data (simplified)
    const userData = await getUserByEmail(email)
    if (!userData) {
      return ApiResponseBuilder.unauthorized(
        'User not found',
        'No user found with provided email'
      )
    }

    const deviceInfo = getDeviceInfo(request)
    const tokenPair = await tokenManager.generateTokenPair(
      userData.id,
      userData.email,
      userData.role,
      deviceInfo
    )

    return ApiResponseBuilder.success({
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role
      },
      tokens: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresAt: tokenPair.expiresAt.toISOString(),
        refreshExpiresAt: tokenPair.refreshExpiresAt.toISOString()
      }
    })

  } catch (error) {
    ErrorManager.logError(error, {
      endpoint: '/api/auth/login',
      method: 'POST'
    })

    return ApiResponseBuilder.internalError(
      'Login failed',
      'Unable to process login request'
    )
  }
}

/**
 * Logout handler
 */
export async function handleLogout(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract token to get session ID
    const authHeader = request.headers.get('authorization')
    const token = TokenManager.extractBearerToken(authHeader)
    
    if (token) {
      const validation = await tokenManager.validateAccessToken(token)
      if (validation.isValid && validation.payload?.sessionId) {
        // Revoke the session
        await tokenManager.revokeSession(validation.payload.sessionId)
      }
    }

    return ApiResponseBuilder.success({
      message: 'Logout successful'
    })

  } catch (error) {
    ErrorManager.logError(error, {
      endpoint: '/api/auth/logout',
      method: 'POST'
    })

    return ApiResponseBuilder.internalError(
      'Logout failed',
      'Unable to process logout request'
    )
  }
}

/**
 * Validate credentials (simplified mock implementation)
 */
async function validateCredentials(email: string, password: string): Promise<boolean> {
  // This is a mock implementation - replace with real authentication
  // In production, you would:
  // 1. Hash the password with bcrypt/argon2
  // 2. Query your user database
  // 3. Compare hashed passwords
  
  // Mock validation for demo purposes
  return email.includes('@') && password.length >= 6
}

/**
 * Get user by email (simplified mock implementation)
 */
async function getUserByEmail(email: string): Promise<{
  id: string;
  email: string;
  role: string;
} | null> {
  // Mock user data - replace with database query
  return {
    id: `user_${Date.now()}`,
    email,
    role: 'user'
  }
}

/**
 * Middleware for API key authentication (for service-to-service communication)
 */
export function withApiKey<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const apiKey = request.headers.get('x-api-key')
    
    if (!apiKey) {
      return ApiResponseBuilder.unauthorized(
        'API key required',
        'Missing X-API-Key header'
      )
    }

    // Validate API key format
    if (!apiKey.startsWith('gocr_')) {
      return ApiResponseBuilder.unauthorized(
        'Invalid API key format',
        'API key must start with gocr_ prefix'
      )
    }

    // In production, you would validate the API key against your database
    // For now, we'll accept any properly formatted key
    
    return handler(request, ...args)
  }
}