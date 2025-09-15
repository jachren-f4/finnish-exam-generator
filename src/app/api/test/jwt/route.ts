/**
 * Test JWT token functionality
 */

import { NextRequest } from 'next/server'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { tokenManager } from '@/lib/auth/token-manager'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId = 'test-user', email = 'test@example.com' } = body

    if (action === 'generate') {
      // Generate tokens
      const tokenPair = await tokenManager.generateTokenPair(
        userId,
        email,
        'user',
        {
          userAgent: request.headers.get('user-agent') || undefined,
          ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
        }
      )

      return ApiResponseBuilder.success({
        message: 'Tokens generated',
        tokens: {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
          expiresAt: tokenPair.expiresAt.toISOString(),
          refreshExpiresAt: tokenPair.refreshExpiresAt.toISOString()
        }
      })
    }

    if (action === 'validate') {
      const { token } = body
      if (!token) {
        return ApiResponseBuilder.validationError('Token required', 'Please provide a token to validate')
      }

      const validation = await tokenManager.validateAccessToken(token)
      return ApiResponseBuilder.success({
        message: 'Token validation result',
        validation: {
          isValid: validation.isValid,
          error: validation.error,
          shouldRefresh: validation.shouldRefresh,
          payload: validation.payload
        }
      })
    }

    return ApiResponseBuilder.validationError('Invalid action', 'Supported actions: generate, validate')

  } catch (error) {
    return ApiResponseBuilder.internalError(
      'JWT test error',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}