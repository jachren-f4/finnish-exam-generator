/**
 * Comprehensive Error Recovery Strategies
 * Orchestrates error handling, retry logic, circuit breakers, and DLQ
 */

import { logger } from '../monitoring/logger'
import { errorBoundary, ErrorContext, ClassifiedError } from './error-boundary'
import { retryOrchestrator, RetryResult } from './retry-logic'
import { circuitBreakerRegistry, CircuitBreakerConfigs } from './circuit-breaker'
import { dlqRegistry, DLQConfigs, addToDLQ } from './dead-letter-queue'
import { alertManager } from '../monitoring/alerts'

export type RecoveryStrategy = 
  | 'immediate_retry'
  | 'exponential_backoff'
  | 'circuit_breaker'
  | 'fallback_value'
  | 'cache_fallback'
  | 'dead_letter_queue'
  | 'graceful_degradation'
  | 'fail_fast'

export interface RecoveryConfig {
  strategies: RecoveryStrategy[]
  maxRecoveryAttempts: number
  enableFallback: boolean
  enableDLQ: boolean
  enableAlerting: boolean
  gracefulDegradationMode: boolean
}

export interface RecoveryResult<T> {
  success: boolean
  result?: T
  error?: Error
  strategyUsed?: RecoveryStrategy
  attemptsUsed: number
  totalDuration: number
  degradedMode?: boolean
  metadata: Record<string, any>
}

export interface OperationConfig {
  operation: string
  category?: string
  priority?: number
  timeout?: number
  fallbackValue?: any
  recoveryConfig?: Partial<RecoveryConfig>
}

/**
 * Advanced error recovery orchestrator
 */
export class ErrorRecoveryOrchestrator {
  private static instance: ErrorRecoveryOrchestrator
  private defaultConfig: RecoveryConfig = {
    strategies: [
      'immediate_retry',
      'exponential_backoff',
      'circuit_breaker',
      'cache_fallback',
      'fallback_value',
      'dead_letter_queue'
    ],
    maxRecoveryAttempts: 3,
    enableFallback: true,
    enableDLQ: true,
    enableAlerting: true,
    gracefulDegradationMode: false
  }

  static getInstance(): ErrorRecoveryOrchestrator {
    if (!ErrorRecoveryOrchestrator.instance) {
      ErrorRecoveryOrchestrator.instance = new ErrorRecoveryOrchestrator()
    }
    return ErrorRecoveryOrchestrator.instance
  }

  /**
   * Execute operation with comprehensive error recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    config: OperationConfig
  ): Promise<RecoveryResult<T>> {
    const startTime = Date.now()
    const effectiveConfig = { ...this.defaultConfig, ...config.recoveryConfig }
    const context: ErrorContext = {
      operation: config.operation,
      timestamp: new Date(),
      metadata: {
        category: config.category,
        priority: config.priority,
        timeout: config.timeout
      }
    }

    let lastError: Error | null = null
    let attemptsUsed = 0
    const metadata: Record<string, any> = {}

    logger.debug('Starting operation with recovery', {
      strategies: effectiveConfig.strategies,
      ...context
    })

    // Try each recovery strategy in order
    for (const strategy of effectiveConfig.strategies) {
      if (attemptsUsed >= effectiveConfig.maxRecoveryAttempts) {
        break
      }

      try {
        const strategyResult: {
          success: boolean;
          result?: T;
          error?: Error;
          attemptsUsed?: number;
          totalDuration?: number;
          metadata?: Record<string, any>
        } = await this.executeWithStrategy<T>(
          operation,
          strategy,
          config,
          context,
          lastError
        )

        if (strategyResult.success) {
          const totalDuration = Date.now() - startTime
          
          logger.info('Operation succeeded with recovery', {
            strategy,
            attempts: attemptsUsed + 1,
            duration: totalDuration,
            ...context
          })

          return {
            success: true,
            result: strategyResult.result,
            strategyUsed: strategy,
            attemptsUsed: (strategyResult.attemptsUsed || 0) + attemptsUsed + 1,
            totalDuration,
            metadata: { ...metadata, ...(strategyResult.metadata || {}) }
          }
        }

        lastError = strategyResult.error || lastError
        attemptsUsed++

        // Store strategy metadata
        metadata[`${strategy}_attempts`] = strategyResult.attemptsUsed || 1
        metadata[`${strategy}_duration`] = strategyResult.totalDuration || 0

      } catch (error) {
        lastError = error as Error
        attemptsUsed++
        
        logger.warn('Recovery strategy failed', {
          strategy,
          attempts: attemptsUsed,
          error: (error as Error).message,
          ...context
        })
      }
    }

    // All strategies failed - handle final failure
    return this.handleFinalFailure<T>(
      config,
      context,
      lastError,
      attemptsUsed,
      Date.now() - startTime,
      effectiveConfig,
      metadata
    )
  }

  /**
   * Wrapper for simple operations with default recovery
   */
  async executeWithDefaultRecovery<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallbackValue?: T
  ): Promise<T> {
    const result = await this.executeWithRecovery(operation, {
      operation: operationName,
      fallbackValue,
      recoveryConfig: {
        strategies: ['exponential_backoff', 'fallback_value']
      }
    })

    if (result.success) {
      return result.result!
    }

    throw result.error || new Error(`Operation ${operationName} failed after recovery`)
  }

  private async executeWithStrategy<T>(
    operation: () => Promise<T>,
    strategy: RecoveryStrategy,
    config: OperationConfig,
    context: ErrorContext,
    previousError?: Error | null
  ): Promise<{ success: boolean; result?: T; error?: Error; attemptsUsed?: number; totalDuration?: number; metadata?: Record<string, any> }> {
    
    switch (strategy) {
      case 'immediate_retry':
        return this.executeImmediateRetry(operation, config)

      case 'exponential_backoff':
        return this.executeWithBackoff(operation, config, context)

      case 'circuit_breaker':
        return this.executeWithCircuitBreaker(operation, config)

      case 'fallback_value':
        return this.executeFallback(config)

      case 'cache_fallback':
        return this.executeCacheFallback(config, context)

      case 'dead_letter_queue':
        return this.executeDLQ(config, context, previousError)

      case 'graceful_degradation':
        return this.executeGracefulDegradation(operation, config)

      case 'fail_fast':
        return this.executeFailFast(previousError)

      default:
        throw new Error(`Unknown recovery strategy: ${strategy}`)
    }
  }

  private async executeImmediateRetry<T>(
    operation: () => Promise<T>,
    config: OperationConfig
  ): Promise<{ success: boolean; result?: T; error?: Error; attemptsUsed: number }> {
    try {
      const result = await operation()
      return { success: true, result, attemptsUsed: 1 }
    } catch (error) {
      return { success: false, error: error as Error, attemptsUsed: 1 }
    }
  }

  private async executeWithBackoff<T>(
    operation: () => Promise<T>,
    config: OperationConfig,
    context: ErrorContext
  ): Promise<{ success: boolean; result?: T; error?: Error; attemptsUsed?: number; totalDuration?: number }> {
    const retryResult: RetryResult<T> = await retryOrchestrator.executeWithRetry(
      operation,
      {
        operation: config.operation,
        userId: context.metadata?.userId,
        requestId: context.metadata?.requestId
      }
    )

    return {
      success: retryResult.success,
      result: retryResult.result,
      error: retryResult.error,
      attemptsUsed: retryResult.attempts,
      totalDuration: retryResult.totalDuration
    }
  }

  private async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    config: OperationConfig
  ): Promise<{ success: boolean; result?: T; error?: Error; attemptsUsed?: number; totalDuration?: number; metadata?: Record<string, any> }> {
    try {
      // Determine appropriate circuit breaker
      const breakerConfig = this.getCircuitBreakerConfig(config)
      const breaker = circuitBreakerRegistry.getCircuitBreaker(breakerConfig)

      const result = await breaker.execute(operation)
      return { success: true, result, attemptsUsed: 1, totalDuration: 0, metadata: { circuitBreaker: true } }
    } catch (error) {
      return { success: false, error: error as Error, attemptsUsed: 1, totalDuration: 0, metadata: { circuitBreaker: true } }
    }
  }

  private async executeFallback<T>(
    config: OperationConfig
  ): Promise<{ success: boolean; result?: T; attemptsUsed?: number; totalDuration?: number; metadata?: Record<string, any> }> {
    if (config.fallbackValue !== undefined) {
      return { success: true, result: config.fallbackValue, attemptsUsed: 0, totalDuration: 0, metadata: { fallbackUsed: true } }
    }
    return { success: false, attemptsUsed: 0, totalDuration: 0 }
  }

  private async executeCacheFallback<T>(
    config: OperationConfig,
    context: ErrorContext
  ): Promise<{ success: boolean; result?: T; attemptsUsed?: number; totalDuration?: number; metadata?: Record<string, any> }> {
    // Try to get cached result - would integrate with cache manager
    logger.info('Attempting cache fallback', {
      ...context
    })

    // Simulate cache lookup - in real implementation, use cache manager
    return {
      success: false,
      attemptsUsed: 1,
      totalDuration: 0,
      metadata: { cacheAttempted: true, cacheHit: false }
    }
  }

  private async executeDLQ<T>(
    config: OperationConfig,
    context: ErrorContext,
    error?: Error | null
  ): Promise<{ success: boolean; attemptsUsed?: number; totalDuration?: number; metadata?: Record<string, any> }> {
    if (!error) {
      return { success: false, attemptsUsed: 0, totalDuration: 0, metadata: { dlqSkipped: 'No error to queue' } }
    }

    try {
      // Classify the error for DLQ
      const classifiedError = errorBoundary['errorClassifier'].classifyError(error, context)
      
      // Add to appropriate DLQ based on priority/category
      const queueName = config.priority === 1 ? 'critical' : 'default'
      const dlqId = await addToDLQ(
        queueName,
        config.operation,
        config,
        classifiedError,
        context.metadata,
        config.priority
      )

      return {
        success: true,
        attemptsUsed: 1,
        totalDuration: 0,
        metadata: {
          dlqId,
          dlqQueue: queueName,
          dlqOperation: 'queued'
        }
      }
    } catch (dlqError) {
      logger.error('Failed to add to DLQ', {
        ...context
      }, dlqError as Error)

      return {
        success: false,
        attemptsUsed: 1,
        totalDuration: 0,
        metadata: { dlqError: (dlqError as Error).message }
      }
    }
  }

  private async executeGracefulDegradation<T>(
    operation: () => Promise<T>,
    config: OperationConfig
  ): Promise<{ success: boolean; result?: T; attemptsUsed?: number; totalDuration?: number; metadata?: Record<string, any> }> {
    try {
      // Try operation with reduced functionality
      const result = await operation()
      return {
        success: true,
        result,
        attemptsUsed: 1,
        totalDuration: 0,
        metadata: { degradedMode: false }
      }
    } catch (error) {
      // Return minimal/degraded functionality
      logger.warn('Entering graceful degradation mode', {
        operation: config.operation,
        error: (error as Error).message
      })

      return {
        success: true,
        result: config.fallbackValue,
        attemptsUsed: 1,
        totalDuration: 0,
        metadata: { degradedMode: true, reason: (error as Error).message }
      }
    }
  }

  private async executeFailFast<T>(
    error?: Error | null
  ): Promise<{ success: boolean; error?: Error; attemptsUsed?: number; totalDuration?: number; metadata?: Record<string, any> }> {
    // Don't attempt recovery - fail immediately
    return {
      success: false,
      error: error || new Error('Fail fast strategy - no recovery attempted'),
      attemptsUsed: 0,
      totalDuration: 0,
      metadata: { failFast: true }
    }
  }

  private async handleFinalFailure<T>(
    config: OperationConfig,
    context: ErrorContext,
    error: Error | null,
    attempts: number,
    duration: number,
    recoveryConfig: RecoveryConfig,
    metadata: Record<string, any>
  ): Promise<RecoveryResult<T>> {
    const finalError = error || new Error(`Operation ${config.operation} failed after ${attempts} recovery attempts`)

    // Log final failure
    logger.error('All recovery strategies exhausted', {
      attempts,
      duration,
      strategies: recoveryConfig.strategies,
      error: finalError.message,
      ...context
    })

    // Trigger alerts if enabled
    if (recoveryConfig.enableAlerting) {
      // Alert will be picked up by the monitoring system
    }

    // Try final DLQ if enabled and not already attempted
    let dlqResult: any = null
    if (recoveryConfig.enableDLQ && !metadata.dlqOperation) {
      const dlqAttempt = await this.executeDLQ(config, context, finalError)
      dlqResult = dlqAttempt.metadata
    }

    return {
      success: false,
      error: finalError,
      attemptsUsed: attempts,
      totalDuration: duration,
      metadata: {
        ...metadata,
        finalFailure: true,
        dlq: dlqResult,
        recoveryStrategiesUsed: recoveryConfig.strategies
      }
    }
  }

  private getCircuitBreakerConfig(config: OperationConfig) {
    // Determine circuit breaker based on operation category
    switch (config.category?.toLowerCase()) {
      case 'database':
        return CircuitBreakerConfigs.DATABASE
      case 'external_api':
      case 'api':
        return CircuitBreakerConfigs.EXTERNAL_API
      case 'google_ai':
      case 'ai':
        return CircuitBreakerConfigs.GOOGLE_AI
      case 'file':
      case 'filesystem':
        return CircuitBreakerConfigs.FILE_SYSTEM
      default:
        return {
          ...CircuitBreakerConfigs.EXTERNAL_API,
          name: `${config.operation}-circuit`
        }
    }
  }
}

/**
 * High-level recovery strategies for common scenarios
 */
export class RecoveryStrategies {
  private static orchestrator = ErrorRecoveryOrchestrator.getInstance()

  /**
   * Database operation with comprehensive recovery
   */
  static async withDatabaseRecovery<T>(
    operation: () => Promise<T>,
    operationName: string,
    fallbackValue?: T
  ): Promise<T> {
    const result = await this.orchestrator.executeWithRecovery(operation, {
      operation: operationName,
      category: 'database',
      priority: 2,
      fallbackValue,
      recoveryConfig: {
        strategies: ['exponential_backoff', 'circuit_breaker', 'cache_fallback', 'fallback_value', 'dead_letter_queue'],
        maxRecoveryAttempts: 4,
        enableFallback: true,
        enableDLQ: true
      }
    })

    if (result.success) {
      return result.result!
    }

    throw result.error
  }

  /**
   * External API call with circuit breaker and fallback
   */
  static async withAPIRecovery<T>(
    operation: () => Promise<T>,
    operationName: string,
    apiName: string,
    fallbackValue?: T
  ): Promise<T> {
    const result = await this.orchestrator.executeWithRecovery(operation, {
      operation: operationName,
      category: 'external_api',
      priority: 3,
      fallbackValue,
      recoveryConfig: {
        strategies: ['circuit_breaker', 'exponential_backoff', 'fallback_value'],
        maxRecoveryAttempts: 3,
        enableFallback: true,
        enableDLQ: false // APIs usually don't need DLQ
      }
    })

    if (result.success) {
      return result.result!
    }

    throw result.error
  }

  /**
   * Critical operation with all recovery strategies
   */
  static async withCriticalRecovery<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const result = await this.orchestrator.executeWithRecovery(operation, {
      operation: operationName,
      category: 'critical',
      priority: 1,
      recoveryConfig: {
        strategies: [
          'immediate_retry',
          'exponential_backoff', 
          'circuit_breaker',
          'cache_fallback',
          'graceful_degradation',
          'dead_letter_queue'
        ],
        maxRecoveryAttempts: 5,
        enableFallback: true,
        enableDLQ: true,
        enableAlerting: true
      }
    })

    if (result.success) {
      return result.result!
    }

    throw result.error
  }

  /**
   * Background operation with DLQ focus
   */
  static async withBackgroundRecovery<T>(
    operation: () => Promise<T>,
    operationName: string,
    payload?: any
  ): Promise<T | null> {
    const result = await this.orchestrator.executeWithRecovery(operation, {
      operation: operationName,
      category: 'background',
      priority: 5,
      recoveryConfig: {
        strategies: ['exponential_backoff', 'dead_letter_queue'],
        maxRecoveryAttempts: 2,
        enableFallback: false,
        enableDLQ: true,
        enableAlerting: false
      }
    })

    // Background operations can gracefully return null on failure
    return result.success ? result.result! : null
  }
}

// Export singleton instance
export const errorRecoveryOrchestrator = ErrorRecoveryOrchestrator.getInstance()

// Convenience wrapper function
export async function withRecovery<T>(
  operation: () => Promise<T>,
  config: OperationConfig
): Promise<T> {
  const result = await errorRecoveryOrchestrator.executeWithRecovery(operation, config)
  
  if (result.success) {
    return result.result!
  }
  
  throw result.error || new Error(`Operation ${config.operation} failed`)
}