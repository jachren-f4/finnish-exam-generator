/**
 * Database Manager - Provides connection management, retry logic, and performance monitoring
 * Wraps Supabase client with additional functionality for reliability and monitoring
 */

import { supabase } from '../supabase'
import { ErrorManager, ErrorCategory } from './error-manager'
import { OperationTimer } from './performance-logger'

export interface DatabaseOptions {
  retries?: number
  retryDelay?: number
  timeout?: number
  enableLogging?: boolean
}

export interface QueryResult<T> {
  data: T | null
  error: string | null
  metadata: {
    duration: number
    retryCount: number
    fromCache: boolean
  }
}

/**
 * Database Manager Class
 * Provides enhanced database operations with retry logic and monitoring
 */
export class DatabaseManager {
  private static defaultOptions: DatabaseOptions = {
    retries: 3,
    retryDelay: 1000, // 1 second
    timeout: 30000, // 30 seconds
    enableLogging: true
  }

  /**
   * Execute a database query with retry logic and error handling
   */
  static async executeQuery<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    operationName: string,
    options: DatabaseOptions = {}
  ): Promise<QueryResult<T>> {
    const opts = { ...this.defaultOptions, ...options }
    const timer = new OperationTimer(operationName)
    let lastError: any = null
    let retryCount = 0

    for (let attempt = 0; attempt <= opts.retries!; attempt++) {
      try {
        if (opts.enableLogging && attempt > 0) {
          console.log(`🔄 Database retry attempt ${attempt} for: ${operationName}`)
        }

        const result = await this.withTimeout(operation(), opts.timeout!)
        
        const duration = timer.complete()

        if (result.error) {
          lastError = result.error
          
          // Check if error is retryable
          if (this.isRetryableError(result.error) && attempt < opts.retries!) {
            retryCount++
            await this.delay(opts.retryDelay! * Math.pow(2, attempt)) // Exponential backoff
            continue
          }

          // Non-retryable error or max retries reached
          const managedError = this.createManagedError(result.error, operationName)
          ErrorManager.logError(managedError)

          return {
            data: null,
            error: managedError.userMessage,
            metadata: {
              duration: duration.totalDuration,
              retryCount,
              fromCache: false
            }
          }
        }

        // Success
        if (opts.enableLogging && retryCount > 0) {
          console.log(`✅ Database operation succeeded after ${retryCount} retries: ${operationName}`)
        }

        return {
          data: result.data,
          error: null,
          metadata: {
            duration: duration.totalDuration,
            retryCount,
            fromCache: false
          }
        }

      } catch (error) {
        lastError = error
        
        if (attempt < opts.retries!) {
          retryCount++
          await this.delay(opts.retryDelay! * Math.pow(2, attempt))
          continue
        }

        // Max retries reached
        const managedError = this.createManagedError(error, operationName)
        ErrorManager.logError(managedError)

        const duration = timer.complete()

        return {
          data: null,
          error: managedError.userMessage,
          metadata: {
            duration: duration.totalDuration,
            retryCount,
            fromCache: false
          }
        }
      }
    }

    // This should never be reached, but TypeScript requires it
    const managedError = this.createManagedError(lastError, operationName)
    const duration = timer.complete()
    
    return {
      data: null,
      error: managedError.userMessage,
      metadata: {
        duration: duration.totalDuration,
        retryCount,
        fromCache: false
      }
    }
  }

  /**
   * Wrapper for simple select operations
   */
  static async select<T>(
    table: string,
    query: string = '*',
    filters?: Record<string, any>,
    options?: DatabaseOptions
  ): Promise<QueryResult<T[]>> {
    return this.executeQuery<T[]>(
      async () => {
        let supabaseQuery = supabase.from(table).select(query)
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            supabaseQuery = supabaseQuery.eq(key, value)
          })
        }

        const result = await supabaseQuery
        return { data: result.data as T[] | null, error: result.error }
      },
      `SELECT ${table}`,
      options
    )
  }

  /**
   * Wrapper for insert operations
   */
  static async insert<T>(
    table: string,
    data: any,
    options?: DatabaseOptions
  ): Promise<QueryResult<T>> {
    return this.executeQuery(
      async () => {
        return await supabase
          .from(table)
          .insert(data)
          .select()
          .single()
      },
      `INSERT ${table}`,
      options
    )
  }

  /**
   * Wrapper for update operations
   */
  static async update<T>(
    table: string,
    data: any,
    filters: Record<string, any>,
    options?: DatabaseOptions
  ): Promise<QueryResult<T[]>> {
    return this.executeQuery(
      async () => {
        let query = supabase.from(table).update(data)
        
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value)
        })

        return await query.select()
      },
      `UPDATE ${table}`,
      options
    )
  }

  /**
   * Wrapper for delete operations
   */
  static async delete(
    table: string,
    filters: Record<string, any>,
    options?: DatabaseOptions
  ): Promise<QueryResult<any>> {
    return this.executeQuery(
      async () => {
        let query = supabase.from(table).delete()
        
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value)
        })

        return await query
      },
      `DELETE ${table}`,
      options
    )
  }

  /**
   * Execute a database transaction
   */
  static async transaction<T>(
    operations: Array<() => Promise<any>>,
    operationName: string = 'Transaction',
    options?: DatabaseOptions
  ): Promise<QueryResult<T[]>> {
    return this.executeQuery(
      async () => {
        const results = []
        for (const operation of operations) {
          const result = await operation()
          if (result.error) {
            throw new Error(`Transaction failed: ${result.error.message}`)
          }
          results.push(result.data)
        }
        return { data: results as T[], error: null }
      },
      operationName,
      options
    )
  }

  /**
   * Check database connection health
   */
  static async healthCheck(): Promise<{
    healthy: boolean
    latency: number
    error?: string
  }> {
    const start = Date.now()
    
    try {
      const { error } = await supabase
        .from('exams')
        .select('exam_id')
        .limit(1)
        .single()

      const latency = Date.now() - start

      // Expect either data or a "no rows" error for an empty table
      if (error && !error.message.includes('multiple (or no) rows returned')) {
        return {
          healthy: false,
          latency,
          error: error.message
        }
      }

      return {
        healthy: true,
        latency
      }
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get connection statistics
   */
  static async getConnectionStats(): Promise<{
    activeConnections: number
    maxConnections: number
    avgResponseTime: number
  }> {
    // Note: Supabase doesn't expose connection pool stats directly
    // This is a placeholder for future implementation with monitoring tools
    return {
      activeConnections: 1, // Supabase handles connection pooling
      maxConnections: 100, // Supabase default
      avgResponseTime: 0 // Would need to track this over time
    }
  }

  /**
   * Private helper methods
   */
  private static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timed out')), timeoutMs)
    })

    return Promise.race([promise, timeoutPromise])
  }

  private static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private static isRetryableError(error: any): boolean {
    if (!error) return false
    
    const message = error.message?.toLowerCase() || ''
    const code = error.code?.toLowerCase() || ''
    
    // Retryable error patterns
    return (
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('network') ||
      message.includes('temporary') ||
      message.includes('rate limit') ||
      code.includes('PGRST') || // PostgREST temporary errors
      code.includes('timeout') ||
      code.includes('connection')
    )
  }

  private static createManagedError(error: any, operation: string) {
    const errorMessage = error?.message || String(error)
    
    return ErrorManager.createFromError(
      error,
      {
        operation,
        timestamp: new Date().toISOString(),
        additionalData: {
          code: error?.code,
          details: error?.details,
          hint: error?.hint
        }
      },
      ErrorCategory.DATABASE
    )
  }
}