/**
 * JWT Token Management System
 * Handles token generation, validation, refresh strategies, and security
 */

import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { globalCache } from '../utils/cache-manager'

export interface TokenPayload {
  userId: string
  email: string
  role?: string
  sessionId: string
  iat?: number
  exp?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  refreshExpiresAt: Date
}

export interface TokenValidationResult {
  isValid: boolean
  payload?: TokenPayload
  error?: 'expired' | 'invalid' | 'revoked' | 'malformed'
  shouldRefresh?: boolean
}

export interface RefreshTokenData {
  userId: string
  sessionId: string
  deviceFingerprint?: string
  createdAt: Date
  lastUsed: Date
  isRevoked: boolean
}

/**
 * Secure JWT Token Manager with refresh token strategy
 */
export class TokenManager {
  private static instance: TokenManager
  private readonly ACCESS_TOKEN_SECRET: string
  private readonly REFRESH_TOKEN_SECRET: string
  private readonly ACCESS_TOKEN_EXPIRY = '15m' // 15 minutes
  private readonly REFRESH_TOKEN_EXPIRY = '7d' // 7 days
  private readonly REFRESH_TOKEN_ROTATION_THRESHOLD = 1000 * 60 * 60 * 24 // 24 hours

  constructor() {
    // Use environment variables or generate secure fallbacks
    this.ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || this.generateSecureSecret()
    this.REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || this.generateSecureSecret()
    
    if (!process.env.JWT_ACCESS_SECRET) {
      console.warn('⚠️  JWT_ACCESS_SECRET not set, using generated secret (not recommended for production)')
    }
  }

  static getInstance(): TokenManager {
    if (!this.instance) {
      this.instance = new TokenManager()
    }
    return this.instance
  }

  /**
   * Generate a secure secret for JWT signing
   */
  private generateSecureSecret(): string {
    return crypto.randomBytes(64).toString('hex')
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Create device fingerprint from request headers
   */
  private createDeviceFingerprint(userAgent?: string, ip?: string): string {
    const components = [
      userAgent || 'unknown-agent',
      ip || 'unknown-ip',
      Date.now().toString()
    ].join('|')
    
    return crypto.createHash('sha256').update(components).digest('hex')
  }

  /**
   * Generate token pair (access + refresh tokens)
   */
  async generateTokenPair(
    userId: string,
    email: string,
    role?: string,
    deviceInfo?: { userAgent?: string; ip?: string }
  ): Promise<TokenPair> {
    const sessionId = this.generateSessionId()
    const deviceFingerprint = deviceInfo ? 
      this.createDeviceFingerprint(deviceInfo.userAgent, deviceInfo.ip) : undefined

    // Create access token payload
    const accessPayload: TokenPayload = {
      userId,
      email,
      role,
      sessionId
    }

    // Generate tokens
    const accessToken = jwt.sign(accessPayload, this.ACCESS_TOKEN_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      issuer: 'gemini-ocr-api',
      audience: 'gemini-ocr-client'
    })

    const refreshToken = jwt.sign(
      { userId, sessionId },
      this.REFRESH_TOKEN_SECRET,
      {
        expiresIn: this.REFRESH_TOKEN_EXPIRY,
        issuer: 'gemini-ocr-api',
        audience: 'gemini-ocr-client'
      }
    )

    // Store refresh token data
    const refreshData: RefreshTokenData = {
      userId,
      sessionId,
      deviceFingerprint,
      createdAt: new Date(),
      lastUsed: new Date(),
      isRevoked: false
    }

    await this.storeRefreshToken(refreshToken, refreshData)

    // Calculate expiration dates
    const accessDecoded = jwt.decode(accessToken) as jwt.JwtPayload
    const refreshDecoded = jwt.decode(refreshToken) as jwt.JwtPayload

    return {
      accessToken,
      refreshToken,
      expiresAt: new Date((accessDecoded.exp || 0) * 1000),
      refreshExpiresAt: new Date((refreshDecoded.exp || 0) * 1000)
    }
  }

  /**
   * Validate access token
   */
  async validateAccessToken(token: string): Promise<TokenValidationResult> {
    try {
      const payload = jwt.verify(token, this.ACCESS_TOKEN_SECRET, {
        issuer: 'gemini-ocr-api',
        audience: 'gemini-ocr-client'
      }) as TokenPayload

      // Check if session is still active
      const isSessionActive = await this.isSessionActive(payload.sessionId)
      if (!isSessionActive) {
        return {
          isValid: false,
          error: 'revoked'
        }
      }

      return {
        isValid: true,
        payload
      }

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        // Try to decode to get session info for refresh decision
        try {
          const decoded = jwt.decode(token) as TokenPayload
          return {
            isValid: false,
            error: 'expired',
            shouldRefresh: true,
            payload: decoded
          }
        } catch {
          return { isValid: false, error: 'malformed' }
        }
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return { isValid: false, error: 'invalid' }
      }

      return { isValid: false, error: 'malformed' }
    }
  }

  /**
   * Validate and refresh tokens
   */
  async refreshTokenPair(
    refreshToken: string,
    deviceInfo?: { userAgent?: string; ip?: string }
  ): Promise<TokenPair | null> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.REFRESH_TOKEN_SECRET, {
        issuer: 'gemini-ocr-api',
        audience: 'gemini-ocr-client'
      }) as { userId: string; sessionId: string }

      // Get stored refresh token data
      const refreshData = await this.getRefreshTokenData(refreshToken)
      if (!refreshData || refreshData.isRevoked) {
        return null
      }

      // Check device fingerprint if available
      if (deviceInfo && refreshData.deviceFingerprint) {
        const currentFingerprint = this.createDeviceFingerprint(
          deviceInfo.userAgent,
          deviceInfo.ip
        )
        if (currentFingerprint !== refreshData.deviceFingerprint) {
          // Potential token theft - revoke session
          await this.revokeSession(payload.sessionId)
          return null
        }
      }

      // Update last used timestamp
      refreshData.lastUsed = new Date()
      await this.updateRefreshTokenData(refreshToken, refreshData)

      // Get user data for new token (simplified - would normally fetch from database)
      const userData = await this.getUserData(payload.userId)
      if (!userData) {
        return null
      }

      // Check if we should rotate the refresh token
      const shouldRotate = this.shouldRotateRefreshToken(refreshData)
      
      if (shouldRotate) {
        // Revoke old refresh token
        await this.revokeRefreshToken(refreshToken)
        
        // Generate entirely new token pair
        return this.generateTokenPair(
          userData.userId,
          userData.email,
          userData.role,
          deviceInfo
        )
      } else {
        // Just generate new access token
        const sessionId = payload.sessionId
        const accessPayload: TokenPayload = {
          userId: userData.userId,
          email: userData.email,
          role: userData.role,
          sessionId
        }

        const accessToken = jwt.sign(accessPayload, this.ACCESS_TOKEN_SECRET, {
          expiresIn: this.ACCESS_TOKEN_EXPIRY,
          issuer: 'gemini-ocr-api',
          audience: 'gemini-ocr-client'
        })

        const accessDecoded = jwt.decode(accessToken) as jwt.JwtPayload
        const refreshDecoded = jwt.decode(refreshToken) as jwt.JwtPayload

        return {
          accessToken,
          refreshToken, // Keep same refresh token
          expiresAt: new Date((accessDecoded.exp || 0) * 1000),
          refreshExpiresAt: new Date((refreshDecoded.exp || 0) * 1000)
        }
      }

    } catch (error) {
      return null
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    // Mark session as revoked in cache
    globalCache.set(`session:revoked:${sessionId}`, true, 7 * 24 * 60 * 60 * 1000) // 7 days
    
    // In a real application, you would also update the database
    // await database.revokeSession(sessionId)
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    // In a real application, fetch all sessions for user and revoke them
    // This is a simplified implementation using cache patterns
    
    // Mark user sessions as globally revoked
    globalCache.set(`user:sessions:revoked:${userId}`, Date.now(), 7 * 24 * 60 * 60 * 1000)
    
    // In production, you would:
    // const userSessions = await database.getUserSessions(userId)
    // await Promise.all(userSessions.map(session => this.revokeSession(session.sessionId)))
  }

  /**
   * Check if session is still active
   */
  private async isSessionActive(sessionId: string): Promise<boolean> {
    // Check if specifically revoked
    const isRevoked = globalCache.get(`session:revoked:${sessionId}`)
    if (isRevoked) {
      return false
    }

    // In production, you would check database for session validity
    return true
  }

  /**
   * Store refresh token data
   */
  private async storeRefreshToken(token: string, data: RefreshTokenData): Promise<void> {
    const key = `refresh_token:${this.hashToken(token)}`
    globalCache.set(key, data, 7 * 24 * 60 * 60 * 1000) // 7 days
  }

  /**
   * Get refresh token data
   */
  private async getRefreshTokenData(token: string): Promise<RefreshTokenData | null> {
    const key = `refresh_token:${this.hashToken(token)}`
    return globalCache.get(key) || null
  }

  /**
   * Update refresh token data
   */
  private async updateRefreshTokenData(token: string, data: RefreshTokenData): Promise<void> {
    const key = `refresh_token:${this.hashToken(token)}`
    globalCache.set(key, data, 7 * 24 * 60 * 60 * 1000) // 7 days
  }

  /**
   * Revoke refresh token
   */
  private async revokeRefreshToken(token: string): Promise<void> {
    const key = `refresh_token:${this.hashToken(token)}`
    const data = globalCache.get(key) as RefreshTokenData | null
    
    if (data) {
      data.isRevoked = true
      globalCache.set(key, data, 7 * 24 * 60 * 60 * 1000)
    }
  }

  /**
   * Hash token for secure storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  /**
   * Check if refresh token should be rotated
   */
  private shouldRotateRefreshToken(data: RefreshTokenData): boolean {
    const timeSinceCreation = Date.now() - data.createdAt.getTime()
    return timeSinceCreation > this.REFRESH_TOKEN_ROTATION_THRESHOLD
  }

  /**
   * Get user data (simplified implementation)
   */
  private async getUserData(userId: string): Promise<{ userId: string; email: string; role?: string } | null> {
    // In production, this would fetch from database
    // For now, return mock data based on userId
    return {
      userId,
      email: `user-${userId}@example.com`,
      role: 'user'
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractBearerToken(authorizationHeader?: string): string | null {
    if (!authorizationHeader) return null
    
    const parts = authorizationHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null
    
    return parts[1]
  }

  /**
   * Generate secure API key for service-to-service communication
   */
  generateApiKey(prefix: string = 'gocr'): string {
    const timestamp = Date.now().toString(36)
    const random = crypto.randomBytes(32).toString('hex')
    return `${prefix}_${timestamp}_${random}`
  }
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance()