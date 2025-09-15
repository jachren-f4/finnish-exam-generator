/**
 * Distributed Tracing System
 * Tracks requests across services and components for performance analysis
 */

import { logger } from './logger'

export interface TraceSpan {
  traceId: string
  spanId: string
  parentSpanId?: string
  operationName: string
  startTime: number
  endTime?: number
  duration?: number
  tags: Record<string, any>
  logs: TraceLog[]
  status: 'active' | 'completed' | 'error'
  error?: string
}

export interface TraceLog {
  timestamp: number
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  fields?: Record<string, any>
}

export interface TraceContext {
  traceId: string
  spanId: string
  baggage: Record<string, string>
}

/**
 * Distributed tracer for tracking operations across services
 */
export class DistributedTracer {
  private static instance: DistributedTracer
  private activeSpans = new Map<string, TraceSpan>()
  private completedTraces = new Map<string, TraceSpan[]>()
  private maxTraceHistory = 1000

  constructor() {
    // Clean up old traces periodically
    setInterval(() => {
      this.cleanupOldTraces()
    }, 5 * 60 * 1000) // Every 5 minutes
  }

  static getInstance(): DistributedTracer {
    if (!DistributedTracer.instance) {
      DistributedTracer.instance = new DistributedTracer()
    }
    return DistributedTracer.instance
  }

  /**
   * Start a new trace span
   */
  startSpan(operationName: string, parentContext?: TraceContext): TraceSpan {
    const traceId = parentContext?.traceId || this.generateTraceId()
    const spanId = this.generateSpanId()
    const parentSpanId = parentContext?.spanId

    const span: TraceSpan = {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      startTime: Date.now(),
      tags: {},
      logs: [],
      status: 'active'
    }

    this.activeSpans.set(spanId, span)

    logger.debug('Trace span started', {
      operation: 'trace_span_start',
      traceId,
      spanId,
      parentSpanId,
      operationName
    })

    return span
  }

  /**
   * Finish a trace span
   */
  finishSpan(spanId: string, error?: Error): void {
    const span = this.activeSpans.get(spanId)
    if (!span) {
      logger.warn('Attempted to finish non-existent span', {
        operation: 'trace_span_finish',
        spanId
      })
      return
    }

    span.endTime = Date.now()
    span.duration = span.endTime - span.startTime
    span.status = error ? 'error' : 'completed'
    
    if (error) {
      span.error = error.message
      span.tags.error = true
      span.tags.errorType = error.constructor.name
    }

    // Move to completed traces
    this.activeSpans.delete(spanId)
    
    const traceSpans = this.completedTraces.get(span.traceId) || []
    traceSpans.push(span)
    this.completedTraces.set(span.traceId, traceSpans)

    logger.debug('Trace span finished', {
      operation: 'trace_span_finish',
      traceId: span.traceId,
      spanId,
      operationName: span.operationName,
      duration: span.duration,
      status: span.status
    })
  }

  /**
   * Add tags to a span
   */
  setSpanTags(spanId: string, tags: Record<string, any>): void {
    const span = this.activeSpans.get(spanId)
    if (span) {
      span.tags = { ...span.tags, ...tags }
    }
  }

  /**
   * Add log entry to a span
   */
  logSpanEvent(spanId: string, level: TraceLog['level'], message: string, fields?: Record<string, any>): void {
    const span = this.activeSpans.get(spanId)
    if (span) {
      span.logs.push({
        timestamp: Date.now(),
        level,
        message,
        fields
      })
    }
  }

  /**
   * Get trace context for propagation
   */
  getTraceContext(spanId: string): TraceContext | null {
    const span = this.activeSpans.get(spanId)
    if (!span) return null

    return {
      traceId: span.traceId,
      spanId: span.spanId,
      baggage: {}
    }
  }

  /**
   * Extract trace context from headers
   */
  extractTraceContext(headers: Record<string, string>): TraceContext | null {
    const traceHeader = headers['x-trace-id'] || headers['traceparent']
    if (!traceHeader) return null

    // Simple trace context parsing
    const parts = traceHeader.split('-')
    if (parts.length >= 2) {
      return {
        traceId: parts[0],
        spanId: parts[1],
        baggage: {}
      }
    }

    return null
  }

  /**
   * Inject trace context into headers
   */
  injectTraceContext(context: TraceContext): Record<string, string> {
    return {
      'x-trace-id': `${context.traceId}-${context.spanId}`,
      'x-span-id': context.spanId
    }
  }

  /**
   * Get completed trace by ID
   */
  getTrace(traceId: string): TraceSpan[] | null {
    return this.completedTraces.get(traceId) || null
  }

  /**
   * Get all active spans
   */
  getActiveSpans(): TraceSpan[] {
    return Array.from(this.activeSpans.values())
  }

  /**
   * Get trace statistics
   */
  getTraceStats(): {
    activeSpans: number
    completedTraces: number
    avgDuration: number
    errorRate: number
  } {
    const activeSpans = this.activeSpans.size
    const allCompletedSpans = Array.from(this.completedTraces.values()).flat()
    const completedTraces = this.completedTraces.size

    const durations = allCompletedSpans
      .filter(span => span.duration !== undefined)
      .map(span => span.duration!)

    const avgDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0

    const errorCount = allCompletedSpans.filter(span => span.status === 'error').length
    const errorRate = allCompletedSpans.length > 0 
      ? errorCount / allCompletedSpans.length 
      : 0

    return {
      activeSpans,
      completedTraces,
      avgDuration: Math.round(avgDuration),
      errorRate: Math.round(errorRate * 100) / 100
    }
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`
  }

  private generateSpanId(): string {
    return `span_${Math.random().toString(36).substr(2, 12)}`
  }

  private cleanupOldTraces(): void {
    const cutoffTime = Date.now() - (30 * 60 * 1000) // 30 minutes ago
    
    // Remove old completed traces
    for (const [traceId, spans] of this.completedTraces.entries()) {
      const latestSpan = spans.reduce((latest, span) => 
        (span.endTime || 0) > (latest.endTime || 0) ? span : latest
      )
      
      if ((latestSpan.endTime || 0) < cutoffTime) {
        this.completedTraces.delete(traceId)
      }
    }

    // Clean up old active spans (likely orphaned)
    for (const [spanId, span] of this.activeSpans.entries()) {
      if (span.startTime < cutoffTime) {
        logger.warn('Cleaning up orphaned span', {
          operation: 'trace_cleanup',
          spanId,
          traceId: span.traceId,
          operationName: span.operationName,
          age: Date.now() - span.startTime
        })
        this.activeSpans.delete(spanId)
      }
    }

    // Limit trace history size
    if (this.completedTraces.size > this.maxTraceHistory) {
      const traceEntries = Array.from(this.completedTraces.entries())
      traceEntries.sort((a, b) => {
        const aLatest = Math.max(...a[1].map(s => s.endTime || 0))
        const bLatest = Math.max(...b[1].map(s => s.endTime || 0))
        return bLatest - aLatest
      })

      // Keep only the most recent traces
      const toKeep = traceEntries.slice(0, Math.floor(this.maxTraceHistory * 0.8))
      this.completedTraces.clear()
      toKeep.forEach(([traceId, spans]) => {
        this.completedTraces.set(traceId, spans)
      })

      logger.info('Trace history pruned', {
        operation: 'trace_cleanup',
        kept: toKeep.length,
        removed: traceEntries.length - toKeep.length
      })
    }
  }
}

/**
 * Tracing middleware for automatic span creation
 */
export function withTracing<T extends any[]>(
  operationName: string,
  handler: (context: TraceContext, ...args: T) => Promise<any>
) {
  return async (...args: T) => {
    const tracer = DistributedTracer.getInstance()
    
    // Extract parent context from first argument if it's a request
    let parentContext: TraceContext | undefined
    if (args[0] && typeof args[0] === 'object' && 'headers' in args[0]) {
      const headers: Record<string, string> = {}
      const requestHeaders = (args[0] as any).headers
      
      if (requestHeaders.get) {
        headers['x-trace-id'] = requestHeaders.get('x-trace-id') || ''
        headers['traceparent'] = requestHeaders.get('traceparent') || ''
      }
      
      parentContext = tracer.extractTraceContext(headers) || undefined
    }

    const span = tracer.startSpan(operationName, parentContext)
    const context = tracer.getTraceContext(span.spanId)!

    try {
      const result = await handler(context, ...args)
      tracer.finishSpan(span.spanId)
      return result
    } catch (error) {
      tracer.finishSpan(span.spanId, error as Error)
      throw error
    }
  }
}

// Export singleton instance
export const tracer = DistributedTracer.getInstance()