/**
 * Dead Letter Queue System
 * Handles failed operations with retry and poison message management
 */

import { logger } from '../monitoring/logger'
import { ClassifiedError } from './error-boundary'

export interface FailedOperation {
  id: string
  operation: string
  payload: any
  context: Record<string, any>
  error: ClassifiedError
  attempts: number
  maxAttempts: number
  firstFailureTime: Date
  lastAttemptTime: Date
  nextRetryTime?: Date
  status: 'pending' | 'processing' | 'failed' | 'poison' | 'resolved'
  priority: number
  tags: string[]
}

export interface DLQConfig {
  name: string
  maxRetries: number
  retryDelayMs: number
  backoffMultiplier: number
  maxDelayMs: number
  poisonThreshold: number
  cleanupIntervalMs: number
  maxQueueSize: number
  enablePersistence: boolean
}

export interface DLQStats {
  name: string
  totalOperations: number
  pendingOperations: number
  processingOperations: number
  failedOperations: number
  poisonMessages: number
  resolvedOperations: number
  averageRetries: number
  oldestPendingAge: number
}

export type DLQHandler = (operation: FailedOperation) => Promise<void>

/**
 * Dead Letter Queue implementation with automatic retry and poison message handling
 */
export class DeadLetterQueue {
  private operations = new Map<string, FailedOperation>()
  private handlers = new Map<string, DLQHandler>()
  private processingInterval?: NodeJS.Timeout
  private cleanupInterval?: NodeJS.Timeout
  private isProcessing = false

  constructor(private config: DLQConfig) {
    this.startProcessing()
    this.startCleanup()
    
    logger.info('Dead Letter Queue initialized', {
      operation: 'dlq_init',
      name: config.name,
      maxRetries: config.maxRetries,
      maxQueueSize: config.maxQueueSize
    })
  }

  /**
   * Add a failed operation to the queue
   */
  async addFailedOperation(
    operation: string,
    payload: any,
    error: ClassifiedError,
    context: Record<string, any> = {},
    priority: number = 5
  ): Promise<string> {
    const id = this.generateId()
    const now = new Date()
    
    const failedOp: FailedOperation = {
      id,
      operation,
      payload,
      context,
      error,
      attempts: 0,
      maxAttempts: this.config.maxRetries,
      firstFailureTime: now,
      lastAttemptTime: now,
      nextRetryTime: this.calculateNextRetry(0),
      status: 'pending',
      priority,
      tags: this.extractTags(operation, error)
    }

    // Check queue size limit
    if (this.operations.size >= this.config.maxQueueSize) {
      await this.evictOldestOperation()
    }

    this.operations.set(id, failedOp)
    
    logger.warn('Operation added to Dead Letter Queue', {
      operation: 'dlq_add',
      dlqName: this.config.name,
      operationName: operation,
      operationId: id,
      errorCategory: error.category,
      priority
    })

    return id
  }

  /**
   * Register a handler for specific operation types
   */
  registerHandler(operationType: string, handler: DLQHandler): void {
    this.handlers.set(operationType, handler)
    
    logger.debug('DLQ handler registered', {
      operation: 'dlq_handler_register',
      dlqName: this.config.name,
      operationType
    })
  }

  /**
   * Manually retry a specific operation
   */
  async retryOperation(operationId: string): Promise<boolean> {
    const operation = this.operations.get(operationId)
    
    if (!operation) {
      return false
    }

    if (operation.status === 'poison') {
      logger.warn('Cannot retry poison message', {
        operation: 'dlq_retry_blocked',
        dlqName: this.config.name,
        operationId
      })
      return false
    }

    operation.status = 'pending'
    operation.nextRetryTime = new Date()
    
    logger.info('Operation manually queued for retry', {
      operation: 'dlq_manual_retry',
      dlqName: this.config.name,
      operationId,
      operationType: operation.operation
    })

    return true
  }

  /**
   * Mark an operation as resolved (successful)
   */
  resolveOperation(operationId: string): boolean {
    const operation = this.operations.get(operationId)
    
    if (!operation) {
      return false
    }

    operation.status = 'resolved'
    
    logger.info('Operation resolved', {
      operation: 'dlq_resolve',
      dlqName: this.config.name,
      operationId,
      operationType: operation.operation,
      attempts: operation.attempts
    })

    return true
  }

  /**
   * Mark an operation as poison (permanent failure)
   */
  markAsPoison(operationId: string, reason?: string): boolean {
    const operation = this.operations.get(operationId)
    
    if (!operation) {
      return false
    }

    operation.status = 'poison'
    
    logger.error('Operation marked as poison', {
      operation: 'dlq_poison',
      dlqName: this.config.name,
      operationId,
      operationType: operation.operation,
      attempts: operation.attempts,
      reason: reason || 'Manual marking'
    })

    return true
  }

  /**
   * Get queue statistics
   */
  getStats(): DLQStats {
    const operations = Array.from(this.operations.values())
    
    const pending = operations.filter(op => op.status === 'pending')
    const processing = operations.filter(op => op.status === 'processing')
    const failed = operations.filter(op => op.status === 'failed')
    const poison = operations.filter(op => op.status === 'poison')
    const resolved = operations.filter(op => op.status === 'resolved')

    const totalAttempts = operations.reduce((sum, op) => sum + op.attempts, 0)
    const averageRetries = operations.length > 0 ? totalAttempts / operations.length : 0

    const oldestPending = pending.length > 0 
      ? Math.min(...pending.map(op => op.firstFailureTime.getTime()))
      : 0
    const oldestPendingAge = oldestPending > 0 ? Date.now() - oldestPending : 0

    return {
      name: this.config.name,
      totalOperations: operations.length,
      pendingOperations: pending.length,
      processingOperations: processing.length,
      failedOperations: failed.length,
      poisonMessages: poison.length,
      resolvedOperations: resolved.length,
      averageRetries,
      oldestPendingAge
    }
  }

  /**
   * Get operations by status
   */
  getOperations(status?: FailedOperation['status']): FailedOperation[] {
    const operations = Array.from(this.operations.values())
    
    if (status) {
      return operations.filter(op => op.status === status)
    }
    
    return operations.sort((a, b) => {
      // Sort by priority first, then by next retry time
      if (a.priority !== b.priority) {
        return b.priority - a.priority // Higher priority first
      }
      
      const aTime = a.nextRetryTime?.getTime() || 0
      const bTime = b.nextRetryTime?.getTime() || 0
      return aTime - bTime // Earlier retry time first
    })
  }

  /**
   * Clear resolved and old operations
   */
  cleanup(): number {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000) // 24 hours
    let removed = 0

    for (const [id, operation] of this.operations.entries()) {
      // Remove resolved operations older than 1 hour
      if (operation.status === 'resolved' && 
          operation.lastAttemptTime.getTime() < Date.now() - (60 * 60 * 1000)) {
        this.operations.delete(id)
        removed++
      }
      
      // Remove very old failed operations
      else if (operation.firstFailureTime.getTime() < cutoffTime) {
        this.operations.delete(id)
        removed++
      }
    }

    if (removed > 0) {
      logger.info('DLQ cleanup completed', {
        operation: 'dlq_cleanup',
        dlqName: this.config.name,
        removed
      })
    }

    return removed
  }

  /**
   * Destroy the queue and stop processing
   */
  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    logger.info('Dead Letter Queue destroyed', {
      operation: 'dlq_destroy',
      name: this.config.name
    })
  }

  private startProcessing(): void {
    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processQueue()
      }
    }, 5000) // Check every 5 seconds
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupIntervalMs)
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true
    
    try {
      const readyOperations = this.getReadyOperations()
      
      if (readyOperations.length > 0) {
        logger.debug('Processing DLQ operations', {
          operation: 'dlq_process',
          dlqName: this.config.name,
          count: readyOperations.length
        })
      }

      for (const operation of readyOperations) {
        await this.processOperation(operation)
      }
    } catch (error) {
      logger.error('DLQ processing error', {
        operation: 'dlq_process_error',
        dlqName: this.config.name
      }, error as Error)
    } finally {
      this.isProcessing = false
    }
  }

  private getReadyOperations(): FailedOperation[] {
    const now = Date.now()
    
    return Array.from(this.operations.values())
      .filter(op => 
        op.status === 'pending' &&
        (!op.nextRetryTime || op.nextRetryTime.getTime() <= now)
      )
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10) // Process max 10 at a time
  }

  private async processOperation(operation: FailedOperation): Promise<void> {
    operation.status = 'processing'
    operation.attempts++
    operation.lastAttemptTime = new Date()

    const handler = this.handlers.get(operation.operation)
    
    if (!handler) {
      logger.warn('No handler registered for operation', {
        operation: 'dlq_no_handler',
        dlqName: this.config.name,
        operationType: operation.operation,
        operationId: operation.id
      })
      
      operation.status = 'failed'
      return
    }

    try {
      await handler(operation)
      
      // If we reach here, the operation succeeded
      operation.status = 'resolved'
      
      logger.info('DLQ operation succeeded', {
        operation: 'dlq_success',
        dlqName: this.config.name,
        operationType: operation.operation,
        operationId: operation.id,
        attempts: operation.attempts
      })
    } catch (error) {
      logger.warn('DLQ operation failed', {
        operation: 'dlq_operation_failed',
        dlqName: this.config.name,
        operationType: operation.operation,
        operationId: operation.id,
        attempts: operation.attempts,
        error: (error as Error).message
      })

      if (operation.attempts >= operation.maxAttempts ||
          operation.attempts >= this.config.poisonThreshold) {
        
        operation.status = 'poison'
        
        logger.error('Operation marked as poison due to repeated failures', {
          operation: 'dlq_poison_auto',
          dlqName: this.config.name,
          operationType: operation.operation,
          operationId: operation.id,
          attempts: operation.attempts
        })
      } else {
        operation.status = 'pending'
        operation.nextRetryTime = this.calculateNextRetry(operation.attempts)
      }
    }
  }

  private calculateNextRetry(attempts: number): Date {
    const baseDelay = this.config.retryDelayMs
    const backoffDelay = baseDelay * Math.pow(this.config.backoffMultiplier, attempts)
    const delayMs = Math.min(backoffDelay, this.config.maxDelayMs)
    
    return new Date(Date.now() + delayMs)
  }

  private extractTags(operation: string, error: ClassifiedError): string[] {
    const tags = [
      operation,
      error.category,
      error.severity,
      `retryable:${error.retryable}`
    ]
    
    if (error.context.userId) {
      tags.push(`user:${error.context.userId}`)
    }
    
    if (error.context.endpoint) {
      tags.push(`endpoint:${error.context.endpoint}`)
    }
    
    return tags
  }

  private generateId(): string {
    return `dlq_${this.config.name}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
  }

  private async evictOldestOperation(): Promise<void> {
    const operations = Array.from(this.operations.entries())
      .sort(([, a], [, b]) => a.firstFailureTime.getTime() - b.firstFailureTime.getTime())
    
    if (operations.length > 0) {
      const [oldestId] = operations[0]
      this.operations.delete(oldestId)
      
      logger.warn('Evicted oldest operation from DLQ due to size limit', {
        operation: 'dlq_evict',
        dlqName: this.config.name,
        evictedId: oldestId,
        queueSize: this.operations.size
      })
    }
  }
}

/**
 * Dead Letter Queue registry and management
 */
export class DLQRegistry {
  private static instance: DLQRegistry
  private queues = new Map<string, DeadLetterQueue>()

  static getInstance(): DLQRegistry {
    if (!DLQRegistry.instance) {
      DLQRegistry.instance = new DLQRegistry()
    }
    return DLQRegistry.instance
  }

  /**
   * Create or get a dead letter queue
   */
  getQueue(config: DLQConfig): DeadLetterQueue {
    let queue = this.queues.get(config.name)
    
    if (!queue) {
      queue = new DeadLetterQueue(config)
      this.queues.set(config.name, queue)
    }
    
    return queue
  }

  /**
   * Get all queue statistics
   */
  getAllStats(): DLQStats[] {
    return Array.from(this.queues.values()).map(queue => queue.getStats())
  }

  /**
   * Get statistics for a specific queue
   */
  getStats(name: string): DLQStats | null {
    const queue = this.queues.get(name)
    return queue ? queue.getStats() : null
  }

  /**
   * Cleanup all queues
   */
  cleanupAll(): number {
    let totalRemoved = 0
    for (const queue of this.queues.values()) {
      totalRemoved += queue.cleanup()
    }
    return totalRemoved
  }

  /**
   * Destroy all queues
   */
  destroyAll(): void {
    for (const queue of this.queues.values()) {
      queue.destroy()
    }
    this.queues.clear()
  }
}

/**
 * Predefined DLQ configurations
 */
export const DLQConfigs = {
  DEFAULT: {
    name: 'default',
    maxRetries: 5,
    retryDelayMs: 30000, // 30 seconds
    backoffMultiplier: 2,
    maxDelayMs: 600000, // 10 minutes
    poisonThreshold: 10,
    cleanupIntervalMs: 3600000, // 1 hour
    maxQueueSize: 10000,
    enablePersistence: false
  },

  CRITICAL: {
    name: 'critical',
    maxRetries: 10,
    retryDelayMs: 10000, // 10 seconds
    backoffMultiplier: 1.5,
    maxDelayMs: 300000, // 5 minutes
    poisonThreshold: 15,
    cleanupIntervalMs: 1800000, // 30 minutes
    maxQueueSize: 5000,
    enablePersistence: true
  },

  BACKGROUND: {
    name: 'background',
    maxRetries: 3,
    retryDelayMs: 60000, // 1 minute
    backoffMultiplier: 3,
    maxDelayMs: 1800000, // 30 minutes
    poisonThreshold: 5,
    cleanupIntervalMs: 7200000, // 2 hours
    maxQueueSize: 20000,
    enablePersistence: false
  }
}

// Export singleton registry
export const dlqRegistry = DLQRegistry.getInstance()

// Convenience functions
export async function addToDLQ(
  queueName: string,
  operation: string,
  payload: any,
  error: ClassifiedError,
  context?: Record<string, any>,
  priority?: number
): Promise<string> {
  const config = { ...DLQConfigs.DEFAULT, name: queueName }
  const queue = dlqRegistry.getQueue(config)
  return queue.addFailedOperation(operation, payload, error, context, priority)
}