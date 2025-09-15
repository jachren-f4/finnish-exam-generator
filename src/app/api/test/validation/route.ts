/**
 * Test endpoint with validation middleware
 */

import { NextRequest } from 'next/server'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { withValidation, ValidationSchemas } from '@/lib/middleware/validation-middleware'

async function validationHandler(request: NextRequest) {
  const body = (request as any).validatedBody
  return ApiResponseBuilder.success({
    message: 'Validation passed',
    validatedData: body,
    timestamp: new Date().toISOString()
  })
}

export const POST = withValidation(
  {
    body: ValidationSchemas.login,
    sanitize: true
  },
  validationHandler
)