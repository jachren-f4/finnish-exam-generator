/**
 * Advanced Retry Logic with Exponential Backoff
 * Implements intelligent retry strategies for failed operations
 */

import { logger } from '../monitoring/logger'
import { ErrorClassifier, ClassifiedError } from './error-boundary'

export interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  jitterEnabled: boolean
  jitterMaxMs: number
  retryCondition?: (error: Error, attempt: number) => boolean
  onRetry?: (error: Error, attempt: number, delayMs: number) => void
}

export interface RetryResult<T> {
  success: boolean
  result?: T
  error?: Error
  attempts: number
  totalDuration: number
  retryHistory: RetryAttempt[]
}

export interface RetryAttempt {
  attempt: number
  timestamp: Date
  error: Error
  delayMs: number
  classification?: ClassifiedError
}

export type RetryStrategy = 'exponential' | 'linear' | 'fixed' | 'fibonacci' | 'custom'

export interface RetryPolicyConfig {
  strategy: RetryStrategy
  config: RetryConfig
  errorCategories: string[]
  priority: number
}

/**
 * Advanced retry orchestrator with multiple strategies
 */
export class RetryOrchestrator {
  private static instance: RetryOrchestrator
  private errorClassifier = ErrorClassifier.getInstance()
  private retryPolicies = new Map<string, RetryPolicyConfig>()

  constructor() {
    this.registerDefaultPolicies()
  }

  static getInstance(): RetryOrchestrator {
    if (!RetryOrchestrator.instance) {
      RetryOrchestrator.instance = new RetryOrchestrator()
    }
    return RetryOrchestrator.instance
  }

  /**
   * Execute operation with automatic retry based on error classification
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: { operation: string; userId?: string; requestId?: string },
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const startTime = Date.now()
    const retryHistory: RetryAttempt[] = []
    let lastError: Error | null = null

    for (let attempt = 1; ; attempt++) {
      try {
        logger.debug('Executing operation', {
          attempt,
          ...context
        })

        const result = await operation()
        
        logger.info('Operation succeeded', {
          attempt,
          totalDuration: Date.now() - startTime,
          ...context
        })

        return {
          success: true,
          result,
          attempts: attempt,
          totalDuration: Date.now() - startTime,
          retryHistory
        }
      } catch (error) {
        lastError = error as Error
        
        // Classify the error to determine retry strategy
        const classified = this.errorClassifier.classifyError(lastError, {
          operation: context.operation,
          userId: context.userId,
          requestId: context.requestId,
          timestamp: new Date()
        })

        // Find appropriate retry policy
        const policy = this.findRetryPolicy(classified)
        
        if (!policy || !classified.retryable || attempt >= policy.config.maxAttempts) {
          logger.warn('Operation failed - no more retries', {
            attempt,
            category: classified.category,
            retryable: classified.retryable,
            ...context
          })
          break
        }

        // Calculate delay for next attempt
        const delayMs = this.calculateDelay(policy, attempt)
        
        retryHistory.push({
          attempt,
          timestamp: new Date(),
          error: lastError,
          delayMs,
          classification: classified
        })

        logger.warn('Operation failed - retrying', {
          attempt,
          nextAttempt: attempt + 1,
          delayMs,
          category: classified.category,
          error: lastError.message,
          ...context
        })

        // Call retry callback if provided
        if (policy.config.onRetry) {
          policy.config.onRetry(lastError, attempt, delayMs)
        }

        // Wait before retry
        await this.delay(delayMs)
      }
    }

    return {
      success: false,
      error: lastError || new Error('Unknown error'),
      attempts: retryHistory.length + 1,
      totalDuration: Date.now() - startTime,
      retryHistory
    }
  }

  /**
   * Register a custom retry policy
   */
  registerRetryPolicy(name: string, policy: RetryPolicyConfig): void {
    this.retryPolicies.set(name, policy)
    logger.debug('Retry policy registered', {
      operation: 'retry_policy_register',
      name,
      strategy: policy.strategy,
      categories: policy.errorCategories
    })
  }

  /**
   * Create retry wrapper for functions
   */
  withRetry<T extends any[]>(
    operation: string,
    handler: (...args: T) => Promise<any>,
    config?: Partial<RetryConfig>
  ) {
    return async (...args: T) => {
      const context = {
        operation,
        requestId: Math.random().toString(36).substr(2, 9)
      }
      
      const result = await this.executeWithRetry(
        () => handler(...args),
        context,
        config
      )
      
      if (result.success) {
        return result.result
      }
      
      throw result.error
    }
  }

  private findRetryPolicy(error: ClassifiedError): RetryPolicyConfig | null {
    const applicablePolicies = Array.from(this.retryPolicies.values())
      .filter(policy => policy.errorCategories.includes(error.category))
      .sort((a, b) => b.priority - a.priority)
    
    return applicablePolicies[0] || null
  }

  private calculateDelay(policy: RetryPolicyConfig, attempt: number): number {
    let delayMs: number

    switch (policy.strategy) {
      case 'exponential':
        delayMs = policy.config.baseDelayMs * Math.pow(policy.config.backoffMultiplier, attempt - 1)
        break
      
      case 'linear':
        delayMs = policy.config.baseDelayMs * attempt
        break
      
      case 'fixed':
        delayMs = policy.config.baseDelayMs
        break
      
      case 'fibonacci':
        delayMs = this.fibonacci(attempt) * policy.config.baseDelayMs
        break
      
      default:
        delayMs = policy.config.baseDelayMs
    }

    // Apply maximum delay limit
    delayMs = Math.min(delayMs, policy.config.maxDelayMs)

    // Add jitter if enabled
    if (policy.config.jitterEnabled) {
      const jitter = Math.random() * policy.config.jitterMaxMs
      delayMs += jitter
    }

    return Math.round(delayMs)
  }

  private fibonacci(n: number): number {
    if (n <= 1) return 1
    let a = 1, b = 1
    for (let i = 2; i < n; i++) {
      [a, b] = [b, a + b]
    }
    return b
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private registerDefaultPolicies(): void {
    // Database operations - aggressive retry with exponential backoff
    this.registerRetryPolicy('database_operations', {
      strategy: 'exponential',
      config: {
        maxAttempts: 5,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
        jitterEnabled: true,
        jitterMaxMs: 500
      },
      errorCategories: ['database'],
      priority: 10
    })

    // External API calls - moderate retry with jitter
    this.registerRetryPolicy('external_api_calls', {
      strategy: 'exponential',
      config: {
        maxAttempts: 3,
        baseDelayMs: 2000,
        maxDelayMs: 15000,
        backoffMultiplier: 1.5,
        jitterEnabled: true,
        jitterMaxMs: 1000
      },
      errorCategories: ['external_api', 'network'],
      priority: 8
    })

    // Timeout operations - quick retry with fibonacci backoff
    this.registerRetryPolicy('timeout_operations', {
      strategy: 'fibonacci',
      config: {
        maxAttempts: 4,
        baseDelayMs: 500,
        maxDelayMs: 10000,
        backoffMultiplier: 1,
        jitterEnabled: false,
        jitterMaxMs: 0
      },
      errorCategories: ['timeout'],
      priority: 7
    })

    // System errors - conservative retry
    this.registerRetryPolicy('system_errors', {
      strategy: 'linear',
      config: {
        maxAttempts: 2,
        baseDelayMs: 5000,
        maxDelayMs: 10000,
        backoffMultiplier: 1,
        jitterEnabled: true,
        jitterMaxMs: 2000
      },
      errorCategories: ['system'],
      priority: 5
    })

    // Business logic errors - minimal retry
    this.registerRetryPolicy('business_logic', {
      strategy: 'fixed',
      config: {
        maxAttempts: 2,
        baseDelayMs: 1000,
        maxDelayMs: 1000,
        backoffMultiplier: 1,
        jitterEnabled: false,
        jitterMaxMs: 0
      },
      errorCategories: ['business_logic'],
      priority: 3
    })
  }
}

/**
 * Specialized retry strategies for common scenarios
 */
export class RetryStrategies {
  
  /**
   * Database operation retry with connection recovery
   */
  static async retryDatabaseOperation<T>(
    operation: () => Promise<T>,
    context: { operation: string }
  ): Promise<T> {
    const orchestrator = RetryOrchestrator.getInstance()
    
    const result = await orchestrator.executeWithRetry(
      operation,
      context,
      {
        maxAttempts: 5,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
        jitterEnabled: true,
        jitterMaxMs: 500,
        onRetry: (error, attempt, delay) => {
          logger.warn('Database operation retry', {
            operation: context.operation,
            attempt,
            delay,
            error: error.message
          })
        }
      }
    )
    
    if (result.success) {
      return result.result!
    }
    
    throw result.error
  }

  /**
   * External API call retry with rate limit handling
   */
  static async retryExternalAPI<T>(
    operation: () => Promise<T>,
    context: { operation: string; apiName?: string }
  ): Promise<T> {
    const orchestrator = RetryOrchestrator.getInstance()
    
    const result = await orchestrator.executeWithRetry(
      operation,
      context,
      {
        maxAttempts: 3,
        baseDelayMs: 2000,
        maxDelayMs: 15000,
        backoffMultiplier: 1.5,
        jitterEnabled: true,
        jitterMaxMs: 1000,
        retryCondition: (error, attempt) => {
          // Don't retry client errors (4xx) except 429 (rate limit)
          if (error.message.includes('400') || error.message.includes('404')) {
            return false
          }
          return true
        },
        onRetry: (error, attempt, delay) => {
          logger.warn('External API retry', {
            operation: context.operation,
            apiName: context.apiName,
            attempt,
            delay,
            error: error.message
          })
        }
      }
    )
    
    if (result.success) {
      return result.result!
    }
    
    throw result.error
  }

  /**
   * File operation retry for transient filesystem issues
   */
  static async retryFileOperation<T>(
    operation: () => Promise<T>,
    context: { operation: string; filePath?: string }
  ): Promise<T> {
    const orchestrator = RetryOrchestrator.getInstance()
    
    const result = await orchestrator.executeWithRetry(
      operation,
      context,
      {
        maxAttempts: 3,
        baseDelayMs: 500,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
        jitterEnabled: false,
        jitterMaxMs: 0,
        onRetry: (error, attempt, delay) => {
          logger.warn('File operation retry', {
            operation: context.operation,
            filePath: context.filePath,
            attempt,
            delay,
            error: error.message
          })
        }
      }
    )
    
    if (result.success) {
      return result.result!
    }
    
    throw result.error
  }
}

// Export singleton instance
export const retryOrchestrator = RetryOrchestrator.getInstance()

// Export convenience decorators
export function withDatabaseRetry(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value
  
  descriptor.value = async function (...args: any[]) {
    return RetryStrategies.retryDatabaseOperation(
      () => method.apply(this, args),
      { operation: `${target.constructor.name}.${propertyName}` }
    )
  }
}

export function withAPIRetry(apiName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      return RetryStrategies.retryExternalAPI(
        () => method.apply(this, args),
        { 
          operation: `${target.constructor.name}.${propertyName}`,
          apiName: apiName || 'unknown'
        }
      )
    }
  }
}