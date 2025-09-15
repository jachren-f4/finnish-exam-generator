/**
 * Comprehensive Error Recovery System Testing
 * Demonstrates all error handling capabilities
 */

import { NextRequest } from 'next/server'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { errorBoundary } from '@/lib/error-handling/error-boundary'
import { retryOrchestrator } from '@/lib/error-handling/retry-logic'
import { circuitBreakerRegistry, withDatabaseCircuitBreaker, withExternalAPICircuitBreaker } from '@/lib/error-handling/circuit-breaker'
import { dlqRegistry, addToDLQ } from '@/lib/error-handling/dead-letter-queue'
import { RecoveryStrategies, errorRecoveryOrchestrator } from '@/lib/error-handling/recovery-strategies'
import { logger } from '@/lib/monitoring/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testType, config = {} } = body

    logger.info('Error recovery test initiated', {
      operation: 'error_recovery_test',
      testType,
      config,
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
    })

    let testResult: any = {}

    switch (testType) {
      case 'error_classification':
        testResult = await testErrorClassification()
        break
      
      case 'retry_logic':
        testResult = await testRetryLogic(config)
        break
      
      case 'circuit_breaker':
        testResult = await testCircuitBreaker(config)
        break
      
      case 'dead_letter_queue':
        testResult = await testDeadLetterQueue(config)
        break
      
      case 'recovery_strategies':
        testResult = await testRecoveryStrategies(config)
        break
      
      case 'comprehensive':
        testResult = await testComprehensiveRecovery(config)
        break
      
      default:
        return ApiResponseBuilder.validationError(
          'Invalid test type',
          'Supported types: error_classification, retry_logic, circuit_breaker, dead_letter_queue, recovery_strategies, comprehensive'
        )
    }

    logger.info('Error recovery test completed', {
      operation: 'error_recovery_test',
      testType,
      success: testResult.success !== false
    })

    return ApiResponseBuilder.success({
      testType,
      timestamp: new Date().toISOString(),
      ...testResult
    })

  } catch (error) {
    logger.error('Error recovery test failed', {
      operation: 'error_recovery_test'
    }, error as Error)

    return ApiResponseBuilder.internalError(
      'Error recovery test failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

async function testErrorClassification(): Promise<any> {
  const testErrors = [
    new Error('Database connection failed'),
    new Error('Unauthorized access - invalid token'),
    new Error('Validation failed: required field missing'),
    new Error('Network timeout after 5 seconds'),
    new Error('External API rate limit exceeded'),
    new Error('Out of memory error'),
    new Error('File not found: /path/to/file.txt')
  ]

  const results = []

  for (let i = 0; i < testErrors.length; i++) {
    const error = testErrors[i]
    const context = {
      operation: `test_operation_${i}`,
      timestamp: new Date(),
      requestId: `test_${i}`,
      endpoint: '/api/test'
    }

    try {
      const result = await errorBoundary.handleError(error, context, `fallback_${i}`)
      results.push({
        originalError: error.message,
        classification: result.error ? {
          category: result.error.category,
          severity: result.error.severity,
          retryable: result.error.retryable,
          fallbackAvailable: result.error.fallbackAvailable
        } : null,
        recoveryAttempted: result.recoveryAttempted,
        fallbackUsed: result.fallbackUsed,
        success: result.success
      })
    } catch (testError) {
      results.push({
        originalError: error.message,
        testError: (testError as Error).message,
        success: false
      })
    }
  }

  return {
    success: true,
    message: 'Error classification test completed',
    results,
    summary: {
      totalErrors: results.length,
      classified: results.filter(r => r.classification).length,
      recovered: results.filter(r => r.success).length
    }
  }
}

async function testRetryLogic(config: any): Promise<any> {
  const maxAttempts = config.maxAttempts || 3
  let attemptCount = 0

  const flakyOperation = async (): Promise<string> => {
    attemptCount++
    
    if (attemptCount < maxAttempts) {
      throw new Error(`Simulated failure on attempt ${attemptCount}`)
    }
    
    return `Success after ${attemptCount} attempts`
  }

  const result = await retryOrchestrator.executeWithRetry(
    flakyOperation,
    { operation: 'test_retry_operation', requestId: 'test_retry_123' },
    {
      maxAttempts,
      baseDelayMs: 100, // Fast for testing
      maxDelayMs: 1000,
      backoffMultiplier: 2,
      jitterEnabled: false
    }
  )

  return {
    success: result.success,
    message: result.success ? 'Retry logic test succeeded' : 'Retry logic test failed',
    result: result.result,
    attempts: result.attempts,
    totalDuration: result.totalDuration,
    retryHistory: result.retryHistory.map(attempt => ({
      attempt: attempt.attempt,
      error: attempt.error.message,
      delayMs: attempt.delayMs
    }))
  }
}

async function testCircuitBreaker(config: any): Promise<any> {
  const failureThreshold = config.failureThreshold || 0.5
  const testCalls = config.testCalls || 10

  // Create a test circuit breaker
  const testBreaker = circuitBreakerRegistry.getCircuitBreaker({
    name: 'test-circuit-breaker',
    failureThreshold,
    recoveryTimeout: 2000,
    monitoringWindowMs: 10000,
    minimumCalls: 3,
    successThreshold: 2,
    enableSlowCallDetection: false
  })

  const results = []
  let callCount = 0

  for (let i = 0; i < testCalls; i++) {
    const shouldFail = i < (testCalls * failureThreshold)
    
    try {
      const result = await testBreaker.execute(async () => {
        callCount++
        if (shouldFail) {
          throw new Error(`Simulated failure ${i}`)
        }
        return `Success ${i}`
      })
      
      results.push({
        call: i,
        success: true,
        result,
        breakerState: testBreaker.getStats().state
      })
    } catch (error) {
      results.push({
        call: i,
        success: false,
        error: (error as Error).message,
        breakerState: testBreaker.getStats().state
      })
    }
  }

  const stats = testBreaker.getStats()

  return {
    success: true,
    message: 'Circuit breaker test completed',
    results,
    finalStats: {
      state: stats.state,
      totalCalls: stats.totalCalls,
      failureCount: stats.failureCount,
      successCount: stats.successCount,
      failureRate: stats.failureRate
    }
  }
}

async function testDeadLetterQueue(config: any): Promise<any> {
  const testOperations = config.testOperations || 5
  
  // Get test DLQ
  const testDLQ = dlqRegistry.getQueue({
    name: 'test-dlq',
    maxRetries: 2,
    retryDelayMs: 500,
    backoffMultiplier: 2,
    maxDelayMs: 2000,
    poisonThreshold: 3,
    cleanupIntervalMs: 60000,
    maxQueueSize: 1000,
    enablePersistence: false
  })

  // Register a test handler
  testDLQ.registerHandler('test_operation', async (operation) => {
    // Simulate 50% failure rate
    if (Math.random() < 0.5) {
      throw new Error('Simulated DLQ operation failure')
    }
    logger.info('DLQ operation succeeded', { operationId: operation.id })
  })

  const operationIds = []

  // Add failed operations to DLQ
  for (let i = 0; i < testOperations; i++) {
    const error = errorBoundary['errorClassifier'].classifyError(
      new Error(`Test operation ${i} failed`),
      {
        operation: 'test_operation',
        timestamp: new Date(),
        requestId: `test_${i}`
      }
    )

    const operationId = await testDLQ.addFailedOperation(
      'test_operation',
      { testData: `data_${i}` },
      error,
      { testContext: true },
      i % 3 + 1 // Priority 1-3
    )

    operationIds.push(operationId)
  }

  // Wait a moment for processing
  await new Promise(resolve => setTimeout(resolve, 2000))

  const stats = testDLQ.getStats()
  const operations = testDLQ.getOperations()

  return {
    success: true,
    message: 'Dead Letter Queue test completed',
    operationsAdded: operationIds,
    stats,
    operationStatus: operations.map(op => ({
      id: op.id,
      operation: op.operation,
      status: op.status,
      attempts: op.attempts,
      priority: op.priority
    }))
  }
}

async function testRecoveryStrategies(config: any): Promise<any> {
  const results = []

  // Test 1: Database recovery with fallback
  try {
    const dbResult = await RecoveryStrategies.withDatabaseRecovery(
      async () => {
        throw new Error('Database connection timeout')
      },
      'test_database_operation',
      { fallback: 'cached_data' }
    )
    
    results.push({
      test: 'database_recovery',
      success: true,
      result: dbResult
    })
  } catch (error) {
    results.push({
      test: 'database_recovery',
      success: false,
      error: (error as Error).message
    })
  }

  // Test 2: API recovery with circuit breaker
  try {
    const apiResult = await RecoveryStrategies.withAPIRecovery(
      async () => {
        throw new Error('External API service unavailable')
      },
      'test_api_operation',
      'TestAPI',
      { default: 'api_fallback' }
    )
    
    results.push({
      test: 'api_recovery',
      success: true,
      result: apiResult
    })
  } catch (error) {
    results.push({
      test: 'api_recovery',
      success: false,
      error: (error as Error).message
    })
  }

  // Test 3: Background operation with DLQ
  const backgroundResult = await RecoveryStrategies.withBackgroundRecovery(
    async () => {
      throw new Error('Background processing failed')
    },
    'test_background_operation',
    { jobData: 'test_payload' }
  )
  
  results.push({
    test: 'background_recovery',
    success: backgroundResult !== null,
    result: backgroundResult
  })

  return {
    success: true,
    message: 'Recovery strategies test completed',
    results,
    summary: {
      totalTests: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }
  }
}

async function testComprehensiveRecovery(config: any): Promise<any> {
  const testScenarios = [
    {
      name: 'transient_database_error',
      operation: async () => {
        throw new Error('Database connection lost - SQLSTATE[08006]')
      },
      expectedStrategy: 'exponential_backoff'
    },
    {
      name: 'external_api_rate_limit',
      operation: async () => {
        throw new Error('Rate limit exceeded - 429 Too Many Requests')
      },
      expectedStrategy: 'circuit_breaker'
    },
    {
      name: 'validation_error',
      operation: async () => {
        throw new Error('Validation failed: email is required')
      },
      expectedStrategy: 'fail_fast'
    },
    {
      name: 'timeout_error',
      operation: async () => {
        throw new Error('Operation timed out after 10 seconds')
      },
      expectedStrategy: 'exponential_backoff'
    }
  ]

  const results = []

  for (const scenario of testScenarios) {
    try {
      const result = await errorRecoveryOrchestrator.executeWithRecovery(
        scenario.operation,
        {
          operation: scenario.name,
          category: 'test',
          priority: 3,
          fallbackValue: `fallback_for_${scenario.name}`
        }
      )

      results.push({
        scenario: scenario.name,
        success: result.success,
        strategyUsed: result.strategyUsed,
        expectedStrategy: scenario.expectedStrategy,
        attempts: result.attemptsUsed,
        duration: result.totalDuration,
        degradedMode: result.degradedMode,
        metadata: result.metadata
      })
    } catch (error) {
      results.push({
        scenario: scenario.name,
        success: false,
        error: (error as Error).message
      })
    }
  }

  // Get system status after tests
  const circuitBreakerStats = circuitBreakerRegistry.getAllStats()
  const dlqStats = dlqRegistry.getAllStats()

  return {
    success: true,
    message: 'Comprehensive error recovery test completed',
    scenarios: results,
    systemState: {
      circuitBreakers: circuitBreakerStats.length,
      activeCircuits: circuitBreakerStats.filter(cb => cb.totalCalls > 0).length,
      dlqQueues: dlqStats.length,
      pendingOperations: dlqStats.reduce((sum, q) => sum + q.pendingOperations, 0)
    },
    summary: {
      totalScenarios: results.length,
      successful: results.filter(r => r.success).length,
      withFallback: results.filter(r => r.success && r.strategyUsed).length
    }
  }
}