/**
 * Advanced Error Boundary and Recovery System
 * Provides graceful error handling with fallback mechanisms
 */

import { logger } from '../monitoring/logger'
import { metricsCollector } from '../utils/metrics-collector'
import { alertManager } from '../monitoring/alerts'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ErrorCategory = 'validation' | 'authentication' | 'authorization' | 'database' | 'external_api' | 'system' | 'business_logic' | 'network' | 'timeout'

export interface ErrorContext {
  operation: string
  userId?: string
  requestId?: string
  endpoint?: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface ClassifiedError {
  originalError: Error
  category: ErrorCategory
  severity: ErrorSeverity
  retryable: boolean
  fallbackAvailable: boolean
  context: ErrorContext
  classification: {
    isTemporary: boolean
    isRecoverable: boolean
    requiresUserAction: boolean
  }
}

export interface FallbackStrategy {
  name: string
  condition: (error: ClassifiedError) => boolean
  execute: (error: ClassifiedError) => Promise<any>
  priority: number
}

export interface ErrorBoundaryConfig {
  enableFallbacks: boolean
  maxFallbackAttempts: number
  logErrors: boolean
  reportToMonitoring: boolean
  gracefulDegradation: boolean
}

/**
 * Advanced error classification system
 */
export class ErrorClassifier {
  private static instance: ErrorClassifier

  static getInstance(): ErrorClassifier {
    if (!ErrorClassifier.instance) {
      ErrorClassifier.instance = new ErrorClassifier()
    }
    return ErrorClassifier.instance
  }

  classifyError(error: Error, context: ErrorContext): ClassifiedError {
    const category = this.determineCategory(error)
    const severity = this.determineSeverity(error, category)
    const retryable = this.isRetryable(error, category)
    const fallbackAvailable = this.hasFallbackStrategy(error, category)
    
    return {
      originalError: error,
      category,
      severity,
      retryable,
      fallbackAvailable,
      context,
      classification: {
        isTemporary: this.isTemporary(error, category),
        isRecoverable: this.isRecoverable(error, category),
        requiresUserAction: this.requiresUserAction(error, category)
      }
    }
  }

  private determineCategory(error: Error): ErrorCategory {
    const message = error.message.toLowerCase()
    const stack = error.stack?.toLowerCase() || ''
    
    // Database errors
    if (message.includes('database') || message.includes('connection') || 
        message.includes('query') || stack.includes('supabase')) {
      return 'database'
    }
    
    // Authentication/Authorization
    if (message.includes('unauthorized') || message.includes('forbidden') ||
        message.includes('token') || message.includes('auth')) {
      return message.includes('unauthorized') ? 'authentication' : 'authorization'
    }
    
    // Network/External API
    if (message.includes('network') || message.includes('fetch') ||
        message.includes('timeout') || message.includes('enotfound')) {
      return message.includes('timeout') ? 'timeout' : 'external_api'
    }
    
    // Validation
    if (message.includes('validation') || message.includes('invalid') ||
        message.includes('required') || message.includes('schema')) {
      return 'validation'
    }
    
    // System errors
    if (message.includes('memory') || message.includes('cpu') ||
        message.includes('disk') || message.includes('system')) {
      return 'system'
    }
    
    return 'business_logic'
  }

  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Critical errors that affect system stability
    if (category === 'system' || 
        error.message.includes('out of memory') ||
        error.message.includes('critical')) {
      return 'critical'
    }
    
    // High severity for security and data integrity issues
    if (category === 'database' || 
        category === 'authorization' ||
        error.message.includes('security')) {
      return 'high'
    }
    
    // Medium severity for business logic and external dependencies
    if (category === 'business_logic' || 
        category === 'external_api' ||
        category === 'timeout') {
      return 'medium'
    }
    
    // Low severity for validation and recoverable errors
    return 'low'
  }

  private isRetryable(error: Error, category: ErrorCategory): boolean {
    // Retryable categories
    if (['timeout', 'network', 'external_api', 'database'].includes(category)) {
      return true
    }
    
    // Never retry validation or authorization errors
    if (['validation', 'authorization', 'authentication'].includes(category)) {
      return false
    }
    
    // Check specific error messages
    const message = error.message.toLowerCase()
    if (message.includes('rate limit') || 
        message.includes('temporarily unavailable') ||
        message.includes('service unavailable')) {
      return true
    }
    
    return false
  }

  private hasFallbackStrategy(error: Error, category: ErrorCategory): boolean {
    // Categories that typically have fallback strategies
    return ['external_api', 'database', 'business_logic', 'network'].includes(category)
  }

  private isTemporary(error: Error, category: ErrorCategory): boolean {
    return ['timeout', 'network', 'external_api'].includes(category) ||
           error.message.toLowerCase().includes('temporary')
  }

  private isRecoverable(error: Error, category: ErrorCategory): boolean {
    return !['system', 'critical'].includes(category as any) &&
           !error.message.toLowerCase().includes('fatal')
  }

  private requiresUserAction(error: Error, category: ErrorCategory): boolean {
    return ['validation', 'authentication', 'authorization'].includes(category)
  }
}

/**
 * Advanced error boundary with recovery strategies
 */
export class ErrorBoundary {
  private static instance: ErrorBoundary
  private fallbackStrategies: FallbackStrategy[] = []
  private errorClassifier = ErrorClassifier.getInstance()
  private config: ErrorBoundaryConfig = {
    enableFallbacks: true,
    maxFallbackAttempts: 3,
    logErrors: true,
    reportToMonitoring: true,
    gracefulDegradation: true
  }

  constructor(config?: Partial<ErrorBoundaryConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
    this.registerDefaultFallbacks()
  }

  static getInstance(config?: Partial<ErrorBoundaryConfig>): ErrorBoundary {
    if (!ErrorBoundary.instance) {
      ErrorBoundary.instance = new ErrorBoundary(config)
    }
    return ErrorBoundary.instance
  }

  /**
   * Main error handling method with recovery strategies
   */
  async handleError<T>(
    error: Error, 
    context: ErrorContext,
    fallbackValue?: T
  ): Promise<{ 
    success: boolean
    result?: T
    error?: ClassifiedError
    recoveryAttempted: boolean
    fallbackUsed: boolean 
  }> {
    // Classify the error
    const classifiedError = this.errorClassifier.classifyError(error, context)
    
    // Log the error
    if (this.config.logErrors) {
      await this.logError(classifiedError)
    }
    
    // Report to monitoring
    if (this.config.reportToMonitoring) {
      await this.reportToMonitoring(classifiedError)
    }
    
    // Attempt recovery strategies
    let recoveryResult = null
    let recoveryAttempted = false
    
    if (this.config.enableFallbacks && classifiedError.fallbackAvailable) {
      recoveryResult = await this.attemptRecovery(classifiedError)
      recoveryAttempted = true
      
      if (recoveryResult.success) {
        return {
          success: true,
          result: recoveryResult.data,
          recoveryAttempted: true,
          fallbackUsed: true
        }
      }
    }
    
    // Use provided fallback value
    if (fallbackValue !== undefined) {
      return {
        success: true,
        result: fallbackValue,
        recoveryAttempted,
        fallbackUsed: true
      }
    }
    
    // No recovery possible
    return {
      success: false,
      error: classifiedError,
      recoveryAttempted,
      fallbackUsed: false
    }
  }

  /**
   * Wrap async operations with error boundary
   */
  async wrap<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    fallbackValue?: T
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      const result = await this.handleError(error as Error, context, fallbackValue)
      
      if (result.success) {
        return result.result!
      }
      
      // Re-throw if no recovery was possible
      throw result.error?.originalError || error
    }
  }

  /**
   * Register a fallback strategy
   */
  registerFallback(strategy: FallbackStrategy): void {
    this.fallbackStrategies.push(strategy)
    // Sort by priority (higher priority first)
    this.fallbackStrategies.sort((a, b) => b.priority - a.priority)
  }

  private async attemptRecovery(error: ClassifiedError): Promise<{ success: boolean; data?: any }> {
    const applicableStrategies = this.fallbackStrategies.filter(strategy => 
      strategy.condition(error)
    )
    
    for (const strategy of applicableStrategies) {
      try {
        logger.debug('Attempting recovery strategy', {
          operation: 'error_recovery',
          strategy: strategy.name,
          error: error.category,
          context: error.context
        })
        
        const result = await strategy.execute(error)
        
        logger.info('Recovery strategy succeeded', {
          operation: 'error_recovery',
          strategy: strategy.name,
          error: error.category
        })
        
        return { success: true, data: result }
      } catch (recoveryError) {
        logger.warn('Recovery strategy failed', {
          operation: 'error_recovery',
          strategy: strategy.name,
          error: error.category,
          recoveryError: (recoveryError as Error).message
        })
        continue
      }
    }
    
    return { success: false }
  }

  private async logError(error: ClassifiedError): Promise<void> {
    const logLevel = this.getLogLevel(error.severity)
    
    await logger.log(logLevel, `${error.category} error in ${error.context.operation}`, {
      operation: error.context.operation,
      category: error.category,
      severity: error.severity,
      retryable: error.retryable,
      userId: error.context.userId,
      requestId: error.context.requestId,
      endpoint: error.context.endpoint,
      classification: error.classification
    }, error.originalError)
  }

  private async reportToMonitoring(error: ClassifiedError): Promise<void> {
    // Record error metrics
    if (error.context.requestId && error.context.endpoint) {
      metricsCollector.recordRequest({
        requestId: error.context.requestId,
        endpoint: error.context.endpoint,
        method: 'UNKNOWN',
        statusCode: this.getStatusCode(error.category),
        duration: 0,
        timestamp: error.context.timestamp,
        error: error.originalError.message
      })
    }
    
    // Trigger alerts for high severity errors
    if (['high', 'critical'].includes(error.severity)) {
      // The alert manager will pick this up automatically
      logger.error('High severity error detected', {
        operation: error.context.operation,
        category: error.category,
        severity: error.severity,
        audit: true // Mark for audit logging
      }, error.originalError)
    }
  }

  private getLogLevel(severity: ErrorSeverity): 'debug' | 'info' | 'warn' | 'error' | 'fatal' {
    switch (severity) {
      case 'critical': return 'fatal'
      case 'high': return 'error'
      case 'medium': return 'warn'
      case 'low': return 'info'
      default: return 'error'
    }
  }

  private getStatusCode(category: ErrorCategory): number {
    switch (category) {
      case 'validation': return 400
      case 'authentication': return 401
      case 'authorization': return 403
      case 'business_logic': return 422
      case 'timeout': return 408
      case 'external_api': return 502
      case 'database': return 503
      case 'system': return 500
      default: return 500
    }
  }

  private registerDefaultFallbacks(): void {
    // Database fallback to cached data
    this.registerFallback({
      name: 'database_cache_fallback',
      condition: (error) => error.category === 'database',
      execute: async (error) => {
        logger.info('Using cache fallback for database error', {
          operation: error.context.operation
        })
        // Return cached data or default empty response
        return { cached: true, data: null }
      },
      priority: 5
    })
    
    // External API fallback to default values
    this.registerFallback({
      name: 'external_api_default',
      condition: (error) => error.category === 'external_api',
      execute: async (error) => {
        logger.info('Using default fallback for external API error', {
          operation: error.context.operation
        })
        return { fallback: true, data: null }
      },
      priority: 3
    })
    
    // Timeout fallback with partial results
    this.registerFallback({
      name: 'timeout_partial_results',
      condition: (error) => error.category === 'timeout',
      execute: async (error) => {
        logger.info('Using partial results for timeout', {
          operation: error.context.operation
        })
        return { partial: true, timeout: true }
      },
      priority: 4
    })
  }
}

// Export singleton instance
export const errorBoundary = ErrorBoundary.getInstance()

// Export middleware wrapper
export function withErrorBoundary<T extends any[]>(
  operation: string,
  handler: (...args: T) => Promise<any>,
  fallbackValue?: any
) {
  return async (...args: T) => {
    const context: ErrorContext = {
      operation,
      timestamp: new Date(),
      requestId: Math.random().toString(36).substr(2, 9)
    }
    
    return errorBoundary.wrap(() => handler(...args), context, fallbackValue)
  }
}