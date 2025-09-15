/**
 * System Health Check API
 * Provides comprehensive health monitoring endpoints
 */

import { NextRequest } from 'next/server'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { healthCheckManager } from '@/lib/monitoring/health-checks'
import { logger } from '@/lib/monitoring/logger'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    logger.debug('Health check requested', {
      operation: 'health_check',
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
    })

    const systemHealth = await healthCheckManager.runAllChecks()
    const responseTime = Date.now() - startTime

    // Log health check completion
    logger.info('Health check completed', {
      operation: 'health_check',
      status: systemHealth.status,
      duration: responseTime,
      components: systemHealth.summary
    })

    return ApiResponseBuilder.success({
      ...systemHealth,
      responseTime
    })

  } catch (error) {
    const responseTime = Date.now() - startTime
    
    logger.error('Health check failed', {
      operation: 'health_check',
      duration: responseTime
    }, error as Error)

    return ApiResponseBuilder.internalError(
      'Health check failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { check } = body

    if (!check) {
      return ApiResponseBuilder.validationError(
        'Check name required',
        'Please specify which health check to run'
      )
    }

    logger.debug('Individual health check requested', {
      operation: 'individual_health_check',
      check,
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
    })

    const componentHealth = await healthCheckManager.runCheck(check)

    logger.info('Individual health check completed', {
      operation: 'individual_health_check',
      check,
      status: componentHealth.status,
      duration: componentHealth.responseTime
    })

    return ApiResponseBuilder.success(componentHealth)

  } catch (error) {
    logger.error('Individual health check failed', {
      operation: 'individual_health_check'
    }, error as Error)

    return ApiResponseBuilder.internalError(
      'Health check failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}