/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by monitoring service health
 */

import { logger } from '../monitoring/logger'
import { metricsCollector } from '../utils/metrics-collector'

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerConfig {
  name: string
  failureThreshold: number
  recoveryTimeout: number
  monitoringWindowMs: number
  minimumCalls: number
  successThreshold: number
  slowCallThresholdMs?: number
  slowCallRateThreshold?: number
  enableSlowCallDetection: boolean
}

export interface CircuitBreakerStats {
  name: string
  state: CircuitState
  failureCount: number
  successCount: number
  totalCalls: number
  lastFailureTime?: Date
  lastSuccessTime?: Date
  nextRetryTime?: Date
  failureRate: number
  avgResponseTime: number
  slowCallRate: number
}

export interface CallResult {
  success: boolean
  duration: number
  error?: Error
  timestamp: Date
}

/**
 * Circuit breaker implementation with advanced monitoring
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failureCount = 0
  private successCount = 0
  private totalCalls = 0
  private lastFailureTime?: Date
  private lastSuccessTime?: Date
  private nextRetryTime?: Date
  private callHistory: CallResult[] = []
  private maxHistorySize = 100

  constructor(private config: CircuitBreakerConfig) {
    logger.info('Circuit breaker initialized', {
      operation: 'circuit_breaker_init',
      name: config.name,
      failureThreshold: config.failureThreshold,
      recoveryTimeout: config.recoveryTimeout
    })
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      const error = new Error(`Circuit breaker '${this.config.name}' is OPEN`)
      this.recordCall(false, 0, error)
      throw error
    }

    const startTime = Date.now()
    
    try {
      const result = await operation()
      const duration = Date.now() - startTime
      
      this.recordCall(true, duration)
      this.onSuccess()
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.recordCall(false, duration, error as Error)
      this.onFailure()
      throw error
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    const recentCalls = this.getRecentCalls()
    const totalRecentCalls = recentCalls.length
    const failedCalls = recentCalls.filter(call => !call.success).length
    const slowCalls = this.config.enableSlowCallDetection 
      ? recentCalls.filter(call => call.duration > (this.config.slowCallThresholdMs || 1000)).length
      : 0

    const failureRate = totalRecentCalls > 0 ? failedCalls / totalRecentCalls : 0
    const slowCallRate = totalRecentCalls > 0 ? slowCalls / totalRecentCalls : 0
    const avgResponseTime = totalRecentCalls > 0 
      ? recentCalls.reduce((sum, call) => sum + call.duration, 0) / totalRecentCalls
      : 0

    return {
      name: this.config.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCalls: this.totalCalls,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextRetryTime: this.nextRetryTime,
      failureRate,
      avgResponseTime,
      slowCallRate
    }
  }

  /**
   * Force circuit breaker state change
   */
  forceState(state: CircuitState, reason?: string): void {
    const oldState = this.state
    this.state = state
    
    logger.warn('Circuit breaker state forced', {
      operation: 'circuit_breaker_force_state',
      name: this.config.name,
      oldState,
      newState: state,
      reason: reason || 'Manual override'
    })

    if (state === 'OPEN') {
      this.nextRetryTime = new Date(Date.now() + this.config.recoveryTimeout)
    }
  }

  /**
   * Reset circuit breaker statistics
   */
  reset(): void {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.successCount = 0
    this.totalCalls = 0
    this.lastFailureTime = undefined
    this.lastSuccessTime = undefined
    this.nextRetryTime = undefined
    this.callHistory = []
    
    logger.info('Circuit breaker reset', {
      operation: 'circuit_breaker_reset',
      name: this.config.name
    })
  }

  private canExecute(): boolean {
    switch (this.state) {
      case 'CLOSED':
        return true
      
      case 'OPEN':
        if (this.nextRetryTime && Date.now() >= this.nextRetryTime.getTime()) {
          this.state = 'HALF_OPEN'
          logger.info('Circuit breaker transitioning to HALF_OPEN', {
            operation: 'circuit_breaker_state_change',
            name: this.config.name,
            state: 'HALF_OPEN'
          })
          return true
        }
        return false
      
      case 'HALF_OPEN':
        return true
      
      default:
        return false
    }
  }

  private recordCall(success: boolean, duration: number, error?: Error): void {
    const call: CallResult = {
      success,
      duration,
      error,
      timestamp: new Date()
    }

    this.callHistory.push(call)
    
    // Trim history to prevent memory leaks
    if (this.callHistory.length > this.maxHistorySize) {
      this.callHistory = this.callHistory.slice(-this.maxHistorySize)
    }

    this.totalCalls++
    
    // Record metrics
    metricsCollector.recordRequest({
      requestId: `circuit-${this.config.name}-${Date.now()}`,
      endpoint: `circuit-breaker/${this.config.name}`,
      method: 'CIRCUIT',
      statusCode: success ? 200 : 500,
      duration,
      timestamp: call.timestamp,
      error: error?.message
    })
  }

  private onSuccess(): void {
    this.successCount++
    this.lastSuccessTime = new Date()
    
    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= this.config.successThreshold) {
        this.transitionToClosed()
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in CLOSED state
      this.failureCount = 0
    }
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = new Date()
    
    if (this.state === 'HALF_OPEN') {
      this.transitionToOpen()
    } else if (this.state === 'CLOSED') {
      if (this.shouldOpenCircuit()) {
        this.transitionToOpen()
      }
    }
  }

  private shouldOpenCircuit(): boolean {
    const recentCalls = this.getRecentCalls()
    
    // Need minimum number of calls before making decision
    if (recentCalls.length < this.config.minimumCalls) {
      return false
    }

    // Check failure rate
    const failedCalls = recentCalls.filter(call => !call.success).length
    const failureRate = failedCalls / recentCalls.length
    
    if (failureRate >= this.config.failureThreshold) {
      return true
    }

    // Check slow call rate if enabled
    if (this.config.enableSlowCallDetection && this.config.slowCallRateThreshold) {
      const slowCalls = recentCalls.filter(call => 
        call.duration > (this.config.slowCallThresholdMs || 1000)
      ).length
      const slowCallRate = slowCalls / recentCalls.length
      
      if (slowCallRate >= this.config.slowCallRateThreshold) {
        return true
      }
    }

    return false
  }

  private getRecentCalls(): CallResult[] {
    const cutoffTime = Date.now() - this.config.monitoringWindowMs
    return this.callHistory.filter(call => call.timestamp.getTime() >= cutoffTime)
  }

  private transitionToOpen(): void {
    this.state = 'OPEN'
    this.nextRetryTime = new Date(Date.now() + this.config.recoveryTimeout)
    
    logger.warn('Circuit breaker opened', {
      operation: 'circuit_breaker_state_change',
      name: this.config.name,
      state: 'OPEN',
      failureCount: this.failureCount,
      nextRetryTime: this.nextRetryTime.toISOString()
    })
  }

  private transitionToClosed(): void {
    this.state = 'CLOSED'
    this.failureCount = 0
    this.successCount = 0
    this.nextRetryTime = undefined
    
    logger.info('Circuit breaker closed', {
      operation: 'circuit_breaker_state_change',
      name: this.config.name,
      state: 'CLOSED'
    })
  }
}

/**
 * Circuit breaker registry and management
 */
export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry
  private breakers = new Map<string, CircuitBreaker>()
  private monitoringInterval?: NodeJS.Timeout

  constructor() {
    this.startMonitoring()
  }

  static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry()
    }
    return CircuitBreakerRegistry.instance
  }

  /**
   * Create or get a circuit breaker
   */
  getCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
    let breaker = this.breakers.get(config.name)
    
    if (!breaker) {
      breaker = new CircuitBreaker(config)
      this.breakers.set(config.name, breaker)
    }
    
    return breaker
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): CircuitBreakerStats[] {
    return Array.from(this.breakers.values()).map(breaker => breaker.getStats())
  }

  /**
   * Get statistics for a specific circuit breaker
   */
  getStats(name: string): CircuitBreakerStats | null {
    const breaker = this.breakers.get(name)
    return breaker ? breaker.getStats() : null
  }

  /**
   * Force state change for a circuit breaker
   */
  forceState(name: string, state: CircuitState, reason?: string): boolean {
    const breaker = this.breakers.get(name)
    if (breaker) {
      breaker.forceState(state, reason)
      return true
    }
    return false
  }

  /**
   * Reset a circuit breaker
   */
  reset(name: string): boolean {
    const breaker = this.breakers.get(name)
    if (breaker) {
      breaker.reset()
      return true
    }
    return false
  }

  /**
   * Remove a circuit breaker
   */
  remove(name: string): boolean {
    return this.breakers.delete(name)
  }

  private startMonitoring(): void {
    // Monitor circuit breakers every 30 seconds
    this.monitoringInterval = setInterval(() => {
      const openBreakers = this.getAllStats().filter(stats => stats.state === 'OPEN')
      
      if (openBreakers.length > 0) {
        logger.warn('Open circuit breakers detected', {
          operation: 'circuit_breaker_monitoring',
          openBreakers: openBreakers.map(b => ({
            name: b.name,
            failureRate: b.failureRate,
            nextRetryTime: b.nextRetryTime
          }))
        })
      }
    }, 30000)
  }

  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
  }
}

/**
 * Predefined circuit breaker configurations
 */
export const CircuitBreakerConfigs = {
  DATABASE: {
    name: 'database',
    failureThreshold: 0.6, // 60% failure rate
    recoveryTimeout: 30000, // 30 seconds
    monitoringWindowMs: 60000, // 1 minute
    minimumCalls: 5,
    successThreshold: 3,
    enableSlowCallDetection: false
  },

  EXTERNAL_API: {
    name: 'external-api',
    failureThreshold: 0.5, // 50% failure rate
    recoveryTimeout: 60000, // 1 minute
    monitoringWindowMs: 120000, // 2 minutes
    minimumCalls: 10,
    successThreshold: 5,
    slowCallThresholdMs: 5000, // 5 seconds
    slowCallRateThreshold: 0.3, // 30% slow calls
    enableSlowCallDetection: true
  },

  GOOGLE_AI: {
    name: 'google-ai',
    failureThreshold: 0.4, // 40% failure rate
    recoveryTimeout: 45000, // 45 seconds
    monitoringWindowMs: 90000, // 1.5 minutes
    minimumCalls: 8,
    successThreshold: 3,
    slowCallThresholdMs: 10000, // 10 seconds
    slowCallRateThreshold: 0.25, // 25% slow calls
    enableSlowCallDetection: true
  },

  FILE_SYSTEM: {
    name: 'file-system',
    failureThreshold: 0.7, // 70% failure rate
    recoveryTimeout: 15000, // 15 seconds
    monitoringWindowMs: 30000, // 30 seconds
    minimumCalls: 3,
    successThreshold: 2,
    enableSlowCallDetection: false
  }
}

// Export singleton registry
export const circuitBreakerRegistry = CircuitBreakerRegistry.getInstance()

// Convenience functions for common operations
export async function withDatabaseCircuitBreaker<T>(
  operation: () => Promise<T>
): Promise<T> {
  const breaker = circuitBreakerRegistry.getCircuitBreaker(CircuitBreakerConfigs.DATABASE)
  return breaker.execute(operation)
}

export async function withExternalAPICircuitBreaker<T>(
  operation: () => Promise<T>,
  serviceName?: string
): Promise<T> {
  const config = { 
    ...CircuitBreakerConfigs.EXTERNAL_API,
    name: serviceName ? `external-api-${serviceName}` : 'external-api'
  }
  const breaker = circuitBreakerRegistry.getCircuitBreaker(config)
  return breaker.execute(operation)
}

export async function withGoogleAICircuitBreaker<T>(
  operation: () => Promise<T>
): Promise<T> {
  const breaker = circuitBreakerRegistry.getCircuitBreaker(CircuitBreakerConfigs.GOOGLE_AI)
  return breaker.execute(operation)
}

// Decorator for automatic circuit breaker protection
export function withCircuitBreaker(config: CircuitBreakerConfig) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      const breaker = circuitBreakerRegistry.getCircuitBreaker(config)
      return breaker.execute(() => method.apply(this, args))
    }
  }
}