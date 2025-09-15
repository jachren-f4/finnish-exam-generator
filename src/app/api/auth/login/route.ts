/**
 * Authentication Login Endpoint
 * Handles user login and JWT token generation
 */

import { NextRequest } from 'next/server'
import { handleLogin } from '@/lib/middleware/auth-middleware'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { withEnhancedRateLimit, rateLimitConfigs } from '@/lib/middleware/enhanced-rate-limiter'
import { withValidation, ValidationSchemas } from '@/lib/middleware/validation-middleware'

// Compose middleware: validation first, then rate limiting
const validatedHandler = withValidation(
  {
    body: ValidationSchemas.login,
    sanitize: true,
    csrfProtection: false // CSRF not needed for public login endpoint
  },
  async (request) => handleLogin(request)
)

export const POST = withEnhancedRateLimit(rateLimitConfigs.auth, validatedHandler)

// Handle CORS for login
export async function OPTIONS(_request: NextRequest) {
  return ApiResponseBuilder.cors(
    ['POST', 'OPTIONS'],
    ['Content-Type', 'Authorization'],
    '*'
  )
}