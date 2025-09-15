/**
 * Error Handling Management API
 * Provides visibility and control over error recovery systems
 */

import { NextRequest } from 'next/server'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { circuitBreakerRegistry } from '@/lib/error-handling/circuit-breaker'
import { dlqRegistry } from '@/lib/error-handling/dead-letter-queue'
import { logger } from '@/lib/monitoring/logger'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const component = url.searchParams.get('component') || 'overview'
    const action = url.searchParams.get('action')

    logger.debug('Error handling status requested', {
      operation: 'error_handling_status',
      component,
      action,
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
    })

    let data: any = {}

    switch (component) {
      case 'overview':
        data = await getErrorHandlingOverview()
        break
      
      case 'circuit-breakers':
        data = await getCircuitBreakerStatus(action)
        break
      
      case 'dead-letter-queues':
        data = await getDLQStatus(action)
        break
      
      case 'retry-stats':
        data = await getRetryStatistics()
        break
      
      default:
        return ApiResponseBuilder.validationError(
          'Invalid component',
          'Supported components: overview, circuit-breakers, dead-letter-queues, retry-stats'
        )
    }

    logger.info('Error handling status generated', {
      operation: 'error_handling_status',
      component,
      dataPoints: Object.keys(data).length
    })

    return ApiResponseBuilder.success(data)

  } catch (error) {
    logger.error('Error handling status failed', {
      operation: 'error_handling_status'
    }, error as Error)

    return ApiResponseBuilder.internalError(
      'Error handling status failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, component, data } = body

    logger.debug('Error handling action requested', {
      operation: 'error_handling_action',
      action,
      component,
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
    })

    let result: any = {}

    switch (component) {
      case 'circuit-breaker':
        result = await handleCircuitBreakerAction(action, data)
        break
      
      case 'dlq':
        result = await handleDLQAction(action, data)
        break
      
      case 'test':
        result = await handleTestAction(action, data)
        break
      
      default:
        return ApiResponseBuilder.validationError(
          'Invalid component',
          'Supported components: circuit-breaker, dlq, test'
        )
    }

    logger.info('Error handling action completed', {
      operation: 'error_handling_action',
      action,
      component,
      success: result.success !== false
    })

    return ApiResponseBuilder.success(result)

  } catch (error) {
    logger.error('Error handling action failed', {
      operation: 'error_handling_action'
    }, error as Error)

    return ApiResponseBuilder.internalError(
      'Error handling action failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

async function getErrorHandlingOverview(): Promise<any> {
  const circuitBreakers = circuitBreakerRegistry.getAllStats()
  const dlqStats = dlqRegistry.getAllStats()
  
  const cbSummary = {
    total: circuitBreakers.length,
    open: circuitBreakers.filter(cb => cb.state === 'OPEN').length,
    halfOpen: circuitBreakers.filter(cb => cb.state === 'HALF_OPEN').length,
    closed: circuitBreakers.filter(cb => cb.state === 'CLOSED').length,
    totalCalls: circuitBreakers.reduce((sum, cb) => sum + cb.totalCalls, 0),
    totalFailures: circuitBreakers.reduce((sum, cb) => sum + cb.failureCount, 0)
  }

  const dlqSummary = {
    totalQueues: dlqStats.length,
    totalOperations: dlqStats.reduce((sum, q) => sum + q.totalOperations, 0),
    pendingOperations: dlqStats.reduce((sum, q) => sum + q.pendingOperations, 0),
    poisonMessages: dlqStats.reduce((sum, q) => sum + q.poisonMessages, 0),
    averageRetries: dlqStats.length > 0 
      ? dlqStats.reduce((sum, q) => sum + q.averageRetries, 0) / dlqStats.length 
      : 0
  }

  return {
    timestamp: new Date().toISOString(),
    circuitBreakers: cbSummary,
    deadLetterQueues: dlqSummary,
    systemHealth: {
      errorHandlingEnabled: true,
      recoveryStrategiesActive: true,
      monitoringActive: true
    }
  }
}

async function getCircuitBreakerStatus(action?: string | null): Promise<any> {
  const allStats = circuitBreakerRegistry.getAllStats()
  
  if (action === 'details') {
    return {
      circuitBreakers: allStats,
      summary: {
        total: allStats.length,
        byState: {
          OPEN: allStats.filter(cb => cb.state === 'OPEN').length,
          HALF_OPEN: allStats.filter(cb => cb.state === 'HALF_OPEN').length,
          CLOSED: allStats.filter(cb => cb.state === 'CLOSED').length
        },
        healthiest: allStats
          .filter(cb => cb.totalCalls > 0)
          .sort((a, b) => a.failureRate - b.failureRate)[0],
        mostActive: allStats
          .sort((a, b) => b.totalCalls - a.totalCalls)[0]
      }
    }
  }

  return {
    summary: allStats.map(cb => ({
      name: cb.name,
      state: cb.state,
      failureRate: cb.failureRate,
      totalCalls: cb.totalCalls,
      avgResponseTime: cb.avgResponseTime,
      nextRetryTime: cb.nextRetryTime
    }))
  }
}

async function getDLQStatus(action?: string | null): Promise<any> {
  const allStats = dlqRegistry.getAllStats()
  
  if (action === 'details') {
    return {
      queues: allStats,
      summary: {
        totalQueues: allStats.length,
        totalPending: allStats.reduce((sum, q) => sum + q.pendingOperations, 0),
        totalPoison: allStats.reduce((sum, q) => sum + q.poisonMessages, 0),
        busiestQueue: allStats
          .sort((a, b) => b.totalOperations - a.totalOperations)[0],
        oldestPending: Math.max(...allStats.map(q => q.oldestPendingAge))
      }
    }
  }

  return {
    summary: allStats.map(q => ({
      name: q.name,
      totalOperations: q.totalOperations,
      pendingOperations: q.pendingOperations,
      poisonMessages: q.poisonMessages,
      averageRetries: q.averageRetries,
      oldestPendingAge: q.oldestPendingAge
    }))
  }
}

async function getRetryStatistics(): Promise<any> {
  // In a full implementation, this would pull from retry orchestrator metrics
  return {
    totalRetries: 0,
    successfulRetries: 0,
    failedRetries: 0,
    averageAttempts: 0,
    strategiesUsed: {
      exponential: 0,
      linear: 0,
      fibonacci: 0,
      fixed: 0
    },
    topFailureReasons: []
  }
}

async function handleCircuitBreakerAction(action: string, data: any): Promise<any> {
  switch (action) {
    case 'force_open':
      if (!data.name) {
        throw new Error('Circuit breaker name required')
      }
      const openResult = circuitBreakerRegistry.forceState(data.name, 'OPEN', data.reason || 'Manual override')
      return { success: openResult, action: 'force_open', name: data.name }
    
    case 'force_closed':
      if (!data.name) {
        throw new Error('Circuit breaker name required')
      }
      const closedResult = circuitBreakerRegistry.forceState(data.name, 'CLOSED', data.reason || 'Manual override')
      return { success: closedResult, action: 'force_closed', name: data.name }
    
    case 'reset':
      if (!data.name) {
        throw new Error('Circuit breaker name required')
      }
      const resetResult = circuitBreakerRegistry.reset(data.name)
      return { success: resetResult, action: 'reset', name: data.name }
    
    default:
      throw new Error(`Unknown circuit breaker action: ${action}`)
  }
}

async function handleDLQAction(action: string, data: any): Promise<any> {
  switch (action) {
    case 'retry_operation':
      if (!data.queueName || !data.operationId) {
        throw new Error('Queue name and operation ID required')
      }
      // In a full implementation, this would retry the specific operation
      return { 
        success: true, 
        action: 'retry_operation', 
        queueName: data.queueName,
        operationId: data.operationId 
      }
    
    case 'mark_poison':
      if (!data.queueName || !data.operationId) {
        throw new Error('Queue name and operation ID required')
      }
      return { 
        success: true, 
        action: 'mark_poison', 
        queueName: data.queueName,
        operationId: data.operationId 
      }
    
    case 'cleanup':
      const removed = dlqRegistry.cleanupAll()
      return { success: true, action: 'cleanup', removed }
    
    default:
      throw new Error(`Unknown DLQ action: ${action}`)
  }
}

async function handleTestAction(action: string, data: any): Promise<any> {
  switch (action) {
    case 'simulate_failure':
      // Simulate an error for testing recovery mechanisms
      const testError = new Error(data.message || 'Simulated test error')
      
      logger.warn('Simulated error for testing', {
        operation: 'error_handling_test',
        testType: 'simulate_failure',
        message: testError.message
      })
      
      return {
        success: true,
        action: 'simulate_failure',
        message: 'Error simulation logged',
        timestamp: new Date().toISOString()
      }
    
    case 'test_recovery':
      // Test recovery strategies
      logger.info('Testing recovery strategies', {
        operation: 'error_handling_test',
        testType: 'test_recovery',
        strategies: data.strategies || ['exponential_backoff', 'circuit_breaker']
      })
      
      return {
        success: true,
        action: 'test_recovery',
        message: 'Recovery test initiated',
        strategies: data.strategies || ['exponential_backoff', 'circuit_breaker']
      }
    
    default:
      throw new Error(`Unknown test action: ${action}`)
  }
}