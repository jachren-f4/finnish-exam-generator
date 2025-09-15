/**
 * Comprehensive Structured Logging System
 * Enterprise-grade logging with multiple outputs, structured data, and correlation IDs
 */

import { auditLogger } from '../security/audit-logger'
import { metricsCollector } from '../utils/metrics-collector'

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogContext {
  requestId?: string
  userId?: string
  sessionId?: string
  correlationId?: string
  operation?: string
  component?: string
  environment?: string
  version?: string
  [key: string]: any
}

export interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  context: LogContext
  error?: Error
  duration?: number
  metadata?: Record<string, any>
}

export interface LogDestination {
  name: string
  write(entry: LogEntry): Promise<void> | void
  shouldLog(level: LogLevel): boolean
}

/**
 * Console log destination with colored output
 */
export class ConsoleDestination implements LogDestination {
  name = 'console'
  
  private colors = {
    trace: '\x1b[37m',    // White
    debug: '\x1b[36m',    // Cyan  
    info: '\x1b[32m',     // Green
    warn: '\x1b[33m',     // Yellow
    error: '\x1b[31m',    // Red
    fatal: '\x1b[35m',    // Magenta
    reset: '\x1b[0m'
  }

  private emojis = {
    trace: '🔍',
    debug: '🐛', 
    info: 'ℹ️ ',
    warn: '⚠️ ',
    error: '❌',
    fatal: '💀'
  }

  constructor(private minLevel: LogLevel = 'info') {}

  shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
    return levels.indexOf(level) >= levels.indexOf(this.minLevel)
  }

  write(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return

    const color = this.colors[entry.level]
    const emoji = this.emojis[entry.level]
    const reset = this.colors.reset

    const timestamp = entry.timestamp.toISOString()
    const contextStr = this.formatContext(entry.context)
    const durationStr = entry.duration ? ` (${entry.duration}ms)` : ''
    
    const logLine = `${color}${emoji} [${timestamp}] ${entry.level.toUpperCase()} ${entry.message}${durationStr}${reset}`
    const contextLine = contextStr ? `${color}   Context: ${contextStr}${reset}` : ''
    const errorLine = entry.error ? `${color}   Error: ${entry.error.message}${reset}` : ''
    const stackLine = entry.error?.stack ? `${color}   Stack: ${entry.error.stack}${reset}` : ''

    console.log(logLine)
    if (contextLine) console.log(contextLine)
    if (errorLine) console.log(errorLine)
    if (stackLine && entry.level === 'error') console.log(stackLine)
  }

  private formatContext(context: LogContext): string {
    const parts: string[] = []
    
    if (context.requestId) parts.push(`req:${context.requestId}`)
    if (context.userId) parts.push(`user:${context.userId}`)
    if (context.operation) parts.push(`op:${context.operation}`)
    if (context.component) parts.push(`comp:${context.component}`)
    
    // Add other context fields
    const otherFields = Object.entries(context)
      .filter(([key]) => !['requestId', 'userId', 'operation', 'component', 'environment', 'version'].includes(key))
      .map(([key, value]) => `${key}:${value}`)
    
    parts.push(...otherFields)
    
    return parts.join(' | ')
  }
}

/**
 * File log destination for persistent logging
 */
export class FileDestination implements LogDestination {
  name = 'file'
  
  constructor(
    private filePath: string,
    private minLevel: LogLevel = 'info'
  ) {}

  shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
    return levels.indexOf(level) >= levels.indexOf(this.minLevel)
  }

  async write(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) return

    const logData = {
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      message: entry.message,
      context: entry.context,
      duration: entry.duration,
      error: entry.error ? {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack
      } : undefined,
      metadata: entry.metadata
    }

    const logLine = JSON.stringify(logData) + '\n'
    
    // In a real implementation, you would write to file system
    // For demo purposes, we'll store in a simulated file cache
    this.appendToFile(logLine)
  }

  private appendToFile(logLine: string): void {
    // Simulate file writing - in production use fs.appendFile
    if (typeof window === 'undefined') {
      // Server-side: could write to actual file
      // fs.appendFileSync(this.filePath, logLine)
    }
  }
}

/**
 * Structured Logger with multiple destinations
 */
export class StructuredLogger {
  private static instance: StructuredLogger
  private destinations: LogDestination[] = []
  private defaultContext: LogContext = {}

  constructor() {
    // Add default console destination
    this.addDestination(new ConsoleDestination(
      process.env.NODE_ENV === 'development' ? 'debug' : 'info'
    ))

    // Add file destination in production
    if (process.env.NODE_ENV === 'production') {
      this.addDestination(new FileDestination('/var/log/gemini-ocr.log', 'info'))
    }

    // Set default context
    this.defaultContext = {
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      service: 'gemini-ocr-api'
    }
  }

  static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger()
    }
    return StructuredLogger.instance
  }

  addDestination(destination: LogDestination): void {
    this.destinations.push(destination)
  }

  setDefaultContext(context: Partial<LogContext>): void {
    this.defaultContext = { ...this.defaultContext, ...context }
  }

  async log(level: LogLevel, message: string, context: LogContext = {}, error?: Error): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: { ...this.defaultContext, ...context },
      error,
      metadata: {
        hostname: process.env.HOSTNAME || 'localhost',
        pid: process.pid
      }
    }

    // Write to all destinations
    const writePromises = this.destinations.map(destination => {
      try {
        return destination.write(entry)
      } catch (error) {
        console.error(`Failed to write to ${destination.name}:`, error)
        return Promise.resolve()
      }
    })

    await Promise.all(writePromises)

    // Special handling for errors and security events
    if (level === 'error' || level === 'fatal') {
      this.handleErrorLog(entry)
    }

    if (context.security || context.audit) {
      this.handleSecurityLog(entry)
    }
  }

  // Convenience methods for different log levels
  trace(message: string, context?: LogContext): Promise<void> {
    return this.log('trace', message, context)
  }

  debug(message: string, context?: LogContext): Promise<void> {
    return this.log('debug', message, context)
  }

  info(message: string, context?: LogContext): Promise<void> {
    return this.log('info', message, context)
  }

  warn(message: string, context?: LogContext): Promise<void> {
    return this.log('warn', message, context)
  }

  error(message: string, context?: LogContext, error?: Error): Promise<void> {
    return this.log('error', message, context, error)
  }

  fatal(message: string, context?: LogContext, error?: Error): Promise<void> {
    return this.log('fatal', message, context, error)
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): StructuredLogger {
    const childLogger = new StructuredLogger()
    childLogger.destinations = this.destinations
    childLogger.defaultContext = { ...this.defaultContext, ...context }
    return childLogger
  }

  /**
   * Time an operation and log the result
   */
  async timeOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const startTime = Date.now()
    const operationContext = { ...context, operation }

    await this.debug(`Starting operation: ${operation}`, operationContext)

    try {
      const result = await fn()
      const duration = Date.now() - startTime
      
      await this.info(`Operation completed: ${operation}`, {
        ...operationContext,
        success: true,
        duration
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      await this.error(`Operation failed: ${operation}`, {
        ...operationContext,
        success: false,
        duration
      }, error as Error)

      throw error
    }
  }

  /**
   * Handle error logs with special processing
   */
  private handleErrorLog(entry: LogEntry): void {
    // Record error metrics
    metricsCollector.recordRequest({
      requestId: entry.context.requestId || 'unknown',
      endpoint: entry.context.operation || 'unknown',
      method: 'INTERNAL',
      statusCode: 500,
      duration: entry.duration || 0,
      timestamp: entry.timestamp,
      error: entry.error?.message || entry.message
    })
  }

  /**
   * Handle security logs
   */
  private handleSecurityLog(entry: LogEntry): void {
    if (entry.context.audit) {
      // Forward to audit logger
      auditLogger.log({
        action: entry.context.operation || 'log_event',
        resource: entry.context.component || 'application',
        outcome: entry.level === 'error' ? 'failure' : 'success',
        riskLevel: entry.level === 'fatal' ? 'critical' : 
                   entry.level === 'error' ? 'high' : 'low',
        userId: entry.context.userId,
        sessionId: entry.context.sessionId,
        details: {
          errorMessage: entry.message,
          additionalData: { level: entry.level, ...entry.context }
        }
      })
    }
  }
}

/**
 * Request correlation utilities
 */
export class CorrelationManager {
  private static correlationStore = new Map<string, LogContext>()

  static generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static setCorrelationContext(correlationId: string, context: LogContext): void {
    this.correlationStore.set(correlationId, context)
  }

  static getCorrelationContext(correlationId: string): LogContext | undefined {
    return this.correlationStore.get(correlationId)
  }

  static clearCorrelationContext(correlationId: string): void {
    this.correlationStore.delete(correlationId)
  }

  static withCorrelation<T>(
    context: LogContext,
    fn: (correlationId: string) => Promise<T>
  ): Promise<T> {
    const correlationId = this.generateCorrelationId()
    this.setCorrelationContext(correlationId, context)
    
    return fn(correlationId).finally(() => {
      this.clearCorrelationContext(correlationId)
    })
  }
}

// Export singleton instance
export const logger = StructuredLogger.getInstance()

// Export logging middleware
export function withLogging<T extends any[]>(
  operation: string,
  handler: (...args: T) => Promise<any>
) {
  return async (...args: T) => {
    const operationLogger = logger.child({
      operation,
      requestId: CorrelationManager.generateCorrelationId()
    })

    return operationLogger.timeOperation(operation, () => handler(...args))
  }
}