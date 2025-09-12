/**
 * Centralized performance logging utilities for timing measurements
 * Extracted from API routes and services to standardize timing patterns
 */

import { PERFORMANCE_CONFIG } from '../config'

export interface Timer {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, any>
}

export interface PerformancePhase {
  name: string
  duration: number
  percentage: number
}

export interface PerformanceBreakdown {
  totalDuration: number
  phases: PerformancePhase[]
  metadata: Record<string, any>
}

/**
 * Creates a new timer for measuring performance
 */
export function createTimer(name: string, metadata?: Record<string, any>): Timer {
  const timer: Timer = {
    name,
    startTime: Date.now(),
    metadata
  }

  if (PERFORMANCE_CONFIG.TIMING_ENABLED) {
    console.log(`${PERFORMANCE_CONFIG.LOG_PREFIX.TIMER} Starting ${name}${metadata ? ` (${JSON.stringify(metadata)})` : ''}`)
  }

  return timer
}

/**
 * Ends a timer and returns the duration
 */
export function endTimer(timer: Timer): number {
  timer.endTime = Date.now()
  timer.duration = timer.endTime - timer.startTime

  if (PERFORMANCE_CONFIG.TIMING_ENABLED) {
    console.log(`${PERFORMANCE_CONFIG.LOG_PREFIX.TIMER} ${timer.name} completed: ${timer.duration}ms`)
  }

  return timer.duration
}

/**
 * Logs a processing phase with consistent formatting
 */
export function logProcessingPhase(
  phase: string,
  duration: number,
  metadata?: Record<string, any>
): void {
  if (!PERFORMANCE_CONFIG.TIMING_ENABLED) return

  const metadataStr = metadata 
    ? ` (${Object.entries(metadata).map(([k, v]) => `${k}: ${v}`).join(', ')})`
    : ''
  
  console.log(`${PERFORMANCE_CONFIG.LOG_PREFIX.TIMER} ${phase}: ${duration}ms${metadataStr}`)
}

/**
 * Logs a performance breakdown showing relative time spent in each phase
 */
export function logPerformanceBreakdown(
  operation: string,
  breakdown: PerformanceBreakdown
): void {
  if (!PERFORMANCE_CONFIG.TIMING_ENABLED) return

  console.log(`${PERFORMANCE_CONFIG.LOG_PREFIX.TIMER} === ${operation.toUpperCase()} COMPLETED: ${breakdown.totalDuration}ms ===`)
  console.log(`${PERFORMANCE_CONFIG.LOG_PREFIX.TIMER} Performance breakdown:`)
  
  breakdown.phases.forEach(phase => {
    console.log(`${PERFORMANCE_CONFIG.LOG_PREFIX.TIMER} - ${phase.name}: ${phase.duration}ms (${phase.percentage}%)`)
  })

  if (Object.keys(breakdown.metadata).length > 0) {
    const metadataEntries = Object.entries(breakdown.metadata)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
    console.log(`${PERFORMANCE_CONFIG.LOG_PREFIX.TIMER} Metadata: ${metadataEntries}`)
  }
}

/**
 * Creates a performance breakdown from individual phase measurements
 */
export function createPerformanceBreakdown(
  phases: { name: string; duration: number }[],
  totalDuration: number,
  metadata: Record<string, any> = {}
): PerformanceBreakdown {
  const phasesWithPercentage: PerformancePhase[] = phases.map(phase => ({
    ...phase,
    percentage: Math.round((phase.duration / totalDuration) * 100)
  }))

  return {
    totalDuration,
    phases: phasesWithPercentage,
    metadata
  }
}

/**
 * Gemini-specific logging functions with consistent prefixes
 */
export const GeminiLogger = {
  /**
   * Log OCR processing events
   */
  logOcrPhase(message: string, metadata?: Record<string, any>): void {
    if (!PERFORMANCE_CONFIG.TIMING_ENABLED) return
    const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : ''
    console.log(`${PERFORMANCE_CONFIG.LOG_PREFIX.GEMINI_OCR} ${message}${metadataStr}`)
  },

  /**
   * Log question generation events
   */
  logProcessPhase(message: string, metadata?: Record<string, any>): void {
    if (!PERFORMANCE_CONFIG.TIMING_ENABLED) return
    const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : ''
    console.log(`${PERFORMANCE_CONFIG.LOG_PREFIX.GEMINI_PROCESS} ${message}${metadataStr}`)
  },

  /**
   * Log exam creation events
   */
  logExamCreationPhase(message: string, metadata?: Record<string, any>): void {
    if (!PERFORMANCE_CONFIG.TIMING_ENABLED) return
    const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : ''
    console.log(`${PERFORMANCE_CONFIG.LOG_PREFIX.EXAM_CREATE} ${message}${metadataStr}`)
  }
}

/**
 * High-level timer for complete operations
 */
export class OperationTimer {
  private timers: Map<string, Timer> = new Map()
  private operationStartTime: number
  private operationName: string

  constructor(operationName: string) {
    this.operationName = operationName
    this.operationStartTime = Date.now()
    
    if (PERFORMANCE_CONFIG.TIMING_ENABLED) {
      console.log(`${PERFORMANCE_CONFIG.LOG_PREFIX.TIMER} ${operationName} started at ${new Date().toISOString()}`)
    }
  }

  /**
   * Start timing a phase within the operation
   */
  startPhase(phaseName: string, metadata?: Record<string, any>): Timer {
    const timer = createTimer(phaseName, metadata)
    this.timers.set(phaseName, timer)
    return timer
  }

  /**
   * End timing a phase within the operation
   */
  endPhase(phaseName: string): number {
    const timer = this.timers.get(phaseName)
    if (!timer) {
      throw new Error(`Timer for phase '${phaseName}' not found`)
    }
    return endTimer(timer)
  }

  /**
   * Complete the operation and log performance breakdown
   */
  complete(metadata: Record<string, any> = {}): PerformanceBreakdown {
    const totalDuration = Date.now() - this.operationStartTime
    
    const phases = Array.from(this.timers.values())
      .filter(timer => timer.duration !== undefined)
      .map(timer => ({
        name: timer.name,
        duration: timer.duration!
      }))

    const breakdown = createPerformanceBreakdown(phases, totalDuration, metadata)
    logPerformanceBreakdown(this.operationName, breakdown)

    return breakdown
  }

  /**
   * Get current operation duration without completing it
   */
  getCurrentDuration(): number {
    return Date.now() - this.operationStartTime
  }
}

/**
 * Convenience function for timing async operations
 */
export async function timeAsyncOperation<T>(
  name: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<{ result: T; duration: number }> {
  const timer = createTimer(name, metadata)
  
  try {
    const result = await operation()
    const duration = endTimer(timer)
    return { result, duration }
  } catch (error) {
    const duration = endTimer(timer)
    logProcessingPhase(`${name} (FAILED)`, duration, { error: error instanceof Error ? error.message : 'Unknown error' })
    throw error
  }
}

/**
 * Memory usage logging (useful for large operations)
 */
export function logMemoryUsage(label: string): void {
  if (!PERFORMANCE_CONFIG.TIMING_ENABLED) return
  
  const used = process.memoryUsage()
  const formatMB = (bytes: number) => Math.round(bytes / 1024 / 1024 * 100) / 100
  
  console.log(`${PERFORMANCE_CONFIG.LOG_PREFIX.TIMER} Memory usage (${label}):`)
  console.log(`${PERFORMANCE_CONFIG.LOG_PREFIX.TIMER} - RSS: ${formatMB(used.rss)}MB`)
  console.log(`${PERFORMANCE_CONFIG.LOG_PREFIX.TIMER} - Heap Used: ${formatMB(used.heapUsed)}MB`)
  console.log(`${PERFORMANCE_CONFIG.LOG_PREFIX.TIMER} - Heap Total: ${formatMB(used.heapTotal)}MB`)
}