/**
 * Authentication Refresh Token Endpoint
 * Handles JWT token refresh
 */

import { NextRequest } from 'next/server'
import { handleTokenRefresh } from '@/lib/middleware/auth-middleware'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { withEnhancedRateLimit, rateLimitConfigs } from '@/lib/middleware/enhanced-rate-limiter'
import { withValidation, ValidationSchemas } from '@/lib/middleware/validation-middleware'

// Compose middleware: validation first, then rate limiting
const validatedHandler = withValidation(
  {
    body: ValidationSchemas.refreshToken,
    sanitize: true,
    csrfProtection: false
  },
  async (request) => handleTokenRefresh(request)
)

export const POST = withEnhancedRateLimit(rateLimitConfigs.auth, validatedHandler)

// Handle CORS for token refresh
export async function OPTIONS(_request: NextRequest) {
  return ApiResponseBuilder.cors(
    ['POST', 'OPTIONS'],
    ['Content-Type', 'Authorization'],
    '*'
  )
}