/**
 * JWT Validator Service
 *
 * Validates Supabase JWT tokens from Authorization headers.
 * Extracts user_id from valid tokens for authentication.
 *
 * Features:
 * - Validates JWT signature
 * - Checks token expiration
 * - Extracts user_id from token payload
 * - Handles Supabase-specific JWT format
 */

import { createClient } from '@supabase/supabase-js'

export interface JWTValidationResult {
  valid: boolean
  userId?: string
  email?: string
  error?: string
  expiresAt?: Date
  issuedAt?: Date
}

export class JWTValidator {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase credentials not configured')
    }

    // Create Supabase client for JWT validation
    this.supabase = createClient(supabaseUrl, supabaseAnonKey)
  }

  /**
   * Validate JWT token from Authorization header
   *
   * @param authHeader - Authorization header value (e.g., "Bearer <token>")
   * @returns Validation result with user info if valid
   */
  async validateToken(authHeader: string): Promise<JWTValidationResult> {
    try {
      // Check if header exists
      if (!authHeader) {
        return {
          valid: false,
          error: 'Authorization header missing'
        }
      }

      // Extract token from "Bearer <token>"
      const token = this.extractToken(authHeader)
      if (!token) {
        return {
          valid: false,
          error: 'Invalid Authorization header format. Expected: Bearer <token>'
        }
      }

      // Validate token using Supabase
      const { data, error } = await this.supabase.auth.getUser(token)

      if (error || !data.user) {
        return {
          valid: false,
          error: error?.message || 'Invalid token'
        }
      }

      // Token is valid - extract user information
      const user = data.user

      return {
        valid: true,
        userId: user.id,
        email: user.email,
        expiresAt: user.exp ? new Date(user.exp * 1000) : undefined,
        issuedAt: user.aud ? new Date(user.created_at!) : undefined
      }
    } catch (error) {
      console.error('[JWTValidator] Token validation error:', error)
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Token validation failed'
      }
    }
  }

  /**
   * Validate token and return user ID only (simplified)
   *
   * @param authHeader - Authorization header value
   * @returns User ID if valid, null otherwise
   */
  async validateAndGetUserId(authHeader: string): Promise<string | null> {
    const result = await this.validateToken(authHeader)
    return result.valid ? result.userId! : null
  }

  /**
   * Extract token from Authorization header
   * Supports formats: "Bearer <token>", "<token>"
   *
   * @param authHeader - Authorization header value
   * @returns Token string or null if invalid format
   */
  private extractToken(authHeader: string): string | null {
    if (!authHeader || typeof authHeader !== 'string') {
      return null
    }

    // Remove "Bearer " prefix if present (case-insensitive)
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    // Basic validation - JWT tokens have 3 parts separated by dots
    if (token.split('.').length !== 3) {
      return null
    }

    return token
  }

  /**
   * Decode JWT payload without validation (for debugging)
   * WARNING: Do not use for authentication - use validateToken() instead
   *
   * @param token - JWT token string
   * @returns Decoded payload or null if invalid
   */
  decodeTokenPayload(token: string): any | null {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        return null
      }

      const payload = parts[1]
      const decoded = Buffer.from(payload, 'base64').toString('utf-8')
      return JSON.parse(decoded)
    } catch (error) {
      console.error('[JWTValidator] Token decode error:', error)
      return null
    }
  }

  /**
   * Check if token is expired (without full validation)
   *
   * @param token - JWT token string
   * @returns True if expired, false if valid or unable to determine
   */
  isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeTokenPayload(token)
      if (!payload || !payload.exp) {
        return true // Assume expired if can't decode
      }

      const expirationTime = payload.exp * 1000 // Convert to milliseconds
      const now = Date.now()

      return now >= expirationTime
    } catch (error) {
      return true // Assume expired on error
    }
  }
}

// Singleton instance
let jwtValidatorInstance: JWTValidator | null = null

/**
 * Get the singleton JWT validator instance
 */
export function getJWTValidator(): JWTValidator {
  if (!jwtValidatorInstance) {
    jwtValidatorInstance = new JWTValidator()
    console.log('[JWTValidator] Initialized')
  }

  return jwtValidatorInstance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetJWTValidator(): void {
  jwtValidatorInstance = null
}

/**
 * Quick validation helper for middleware/routes
 * Returns user ID if valid, null otherwise
 */
export async function validateAuthHeader(authHeader: string | null): Promise<string | null> {
  if (!authHeader) {
    return null
  }

  const validator = getJWTValidator()
  return validator.validateAndGetUserId(authHeader)
}
