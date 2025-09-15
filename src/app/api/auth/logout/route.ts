/**
 * Authentication Logout Endpoint
 * Handles user logout and token revocation
 */

import { NextRequest } from 'next/server'
import { handleLogout } from '@/lib/middleware/auth-middleware'
import { ApiResponseBuilder } from '@/lib/utils/api-response'

export async function POST(request: NextRequest) {
  return handleLogout(request)
}

// Handle CORS for logout
export async function OPTIONS(_request: NextRequest) {
  return ApiResponseBuilder.cors(
    ['POST', 'OPTIONS'],
    ['Content-Type', 'Authorization'],
    '*'
  )
}