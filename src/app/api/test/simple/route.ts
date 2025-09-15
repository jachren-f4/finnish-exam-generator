/**
 * Simple test endpoint without complex middleware
 */

import { NextRequest } from 'next/server'
import { ApiResponseBuilder } from '@/lib/utils/api-response'

export async function GET(_request: NextRequest) {
  return ApiResponseBuilder.success({
    message: 'Simple endpoint working',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    return ApiResponseBuilder.success({
      message: 'POST received',
      body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return ApiResponseBuilder.validationError('Invalid JSON', 'Request body must be valid JSON')
  }
}