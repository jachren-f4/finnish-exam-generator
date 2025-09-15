/**
 * Comprehensive Metrics Collection System
 * Tracks API performance, system health, and usage patterns
 */

import { PERFORMANCE_CONFIG } from '../config'

export interface RequestMetrics {
  requestId: string
  endpoint: string
  method: string
  statusCode: number
  duration: number
  timestamp: Date
  userAgent?: string
  ip?: string
  size?: {
    request: number
    response: number
  }
  error?: string
}

export interface AuthAttemptMetrics {
  success: boolean
  reason?: string
  endpoint: string
  timestamp: Date
  duration: number
  userId?: string
  ip?: string
}

export interface SystemMetrics {
  timestamp: Date
  memory: {
    rss: number
    heapUsed: number
    heapTotal: number
    external: number
  }
  cpu?: {
    user: number
    system: number
  }
  uptime: number
}

export interface ApiEndpointStats {
  endpoint: string
  totalRequests: number
  averageResponseTime: number
  errorRate: number
  lastAccessed: Date
  slowestRequest: number
  fastestRequest: number
}

export interface UsageMetrics {
  totalRequests: number
  uniqueEndpoints: number
  averageResponseTime: number
  errorRate: number
  requestsPerHour: number
  topEndpoints: ApiEndpointStats[]
  systemHealth: SystemMetrics
}

/**
 * Centralized metrics collection and analysis
 */
export class MetricsCollector {
  private static instance: MetricsCollector
  private requestMetrics: RequestMetrics[] = []
  private systemMetrics: SystemMetrics[] = []
  private authAttempts: AuthAttemptMetrics[] = []
  private maxMetricsRetention = 1000 // Keep last 1000 requests
  private maxSystemMetricsRetention = 100 // Keep last 100 system snapshots
  private maxAuthAttemptsRetention = 500 // Keep last 500 auth attempts
  
  private constructor() {
    // Start periodic system metrics collection
    this.startSystemMonitoring()
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector()
    }
    return MetricsCollector.instance
  }

  /**
   * Record a request metric
   */
  recordRequest(metrics: RequestMetrics): void {
    this.requestMetrics.push(metrics)
    
    // Trim old metrics to prevent memory leaks
    if (this.requestMetrics.length > this.maxMetricsRetention) {
      this.requestMetrics = this.requestMetrics.slice(-this.maxMetricsRetention)
    }

    if (PERFORMANCE_CONFIG.TIMING_ENABLED) {
      const status = metrics.statusCode >= 400 ? '❌' : '✅'
      console.log(`📊 [METRICS] ${status} ${metrics.method} ${metrics.endpoint} - ${metrics.duration}ms (${metrics.statusCode})`)
    }
  }

  /**
   * Record authentication attempt
   */
  recordAuthAttempt(attempt: AuthAttemptMetrics): void {
    this.authAttempts.push(attempt)
    
    // Trim old auth attempts to prevent memory leaks
    if (this.authAttempts.length > this.maxAuthAttemptsRetention) {
      this.authAttempts = this.authAttempts.slice(-this.maxAuthAttemptsRetention)
    }

    if (PERFORMANCE_CONFIG.TIMING_ENABLED) {
      const status = attempt.success ? '🔓' : '🔒'
      const reason = attempt.reason ? ` (${attempt.reason})` : ''
      console.log(`🔐 [AUTH] ${status} ${attempt.endpoint} - ${attempt.duration}ms${reason}`)
    }
  }

  /**
   * Record system metrics snapshot
   */
  recordSystemMetrics(): void {
    const memUsage = process.memoryUsage()
    const systemMetric: SystemMetrics = {
      timestamp: new Date(),
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      },
      uptime: process.uptime()
    }

    this.systemMetrics.push(systemMetric)
    
    // Trim old system metrics
    if (this.systemMetrics.length > this.maxSystemMetricsRetention) {
      this.systemMetrics = this.systemMetrics.slice(-this.maxSystemMetricsRetention)
    }
  }

  /**
   * Get comprehensive usage analytics
   */
  getUsageMetrics(timeRangeHours: number = 24): UsageMetrics {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000)
    const recentRequests = this.requestMetrics.filter(r => r.timestamp >= cutoffTime)
    
    const totalRequests = recentRequests.length
    const uniqueEndpoints = new Set(recentRequests.map(r => r.endpoint)).size
    const averageResponseTime = totalRequests > 0 
      ? recentRequests.reduce((sum, r) => sum + r.duration, 0) / totalRequests 
      : 0
    
    const errorRequests = recentRequests.filter(r => r.statusCode >= 400)
    const errorRate = totalRequests > 0 ? (errorRequests.length / totalRequests) * 100 : 0
    const requestsPerHour = totalRequests / timeRangeHours

    // Calculate per-endpoint statistics
    const endpointStats = this.calculateEndpointStats(recentRequests)
    
    // Get latest system metrics
    const latestSystemMetrics = this.systemMetrics[this.systemMetrics.length - 1] || {
      timestamp: new Date(),
      memory: { rss: 0, heapUsed: 0, heapTotal: 0, external: 0 },
      uptime: process.uptime()
    }

    return {
      totalRequests,
      uniqueEndpoints,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      requestsPerHour: Math.round(requestsPerHour * 100) / 100,
      topEndpoints: endpointStats.slice(0, 10), // Top 10 endpoints
      systemHealth: latestSystemMetrics
    }
  }

  /**
   * Calculate statistics for each endpoint
   */
  private calculateEndpointStats(requests: RequestMetrics[]): ApiEndpointStats[] {
    const endpointMap = new Map<string, RequestMetrics[]>()
    
    // Group requests by endpoint
    requests.forEach(request => {
      const key = `${request.method} ${request.endpoint}`
      if (!endpointMap.has(key)) {
        endpointMap.set(key, [])
      }
      endpointMap.get(key)!.push(request)
    })

    // Calculate stats for each endpoint
    const stats: ApiEndpointStats[] = []
    endpointMap.forEach((endpointRequests, endpoint) => {
      const durations = endpointRequests.map(r => r.duration)
      const errors = endpointRequests.filter(r => r.statusCode >= 400)
      const lastRequest = endpointRequests.reduce((latest, current) => 
        current.timestamp > latest.timestamp ? current : latest
      )

      stats.push({
        endpoint,
        totalRequests: endpointRequests.length,
        averageResponseTime: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
        errorRate: Math.round((errors.length / endpointRequests.length) * 10000) / 100,
        lastAccessed: lastRequest.timestamp,
        slowestRequest: Math.max(...durations),
        fastestRequest: Math.min(...durations)
      })
    })

    // Sort by total requests (most active first)
    return stats.sort((a, b) => b.totalRequests - a.totalRequests)
  }

  /**
   * Get recent error metrics
   */
  getErrorMetrics(timeRangeHours: number = 1): {
    totalErrors: number
    errorsByEndpoint: Record<string, number>
    recentErrors: RequestMetrics[]
  } {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000)
    const errorRequests = this.requestMetrics.filter(
      r => r.timestamp >= cutoffTime && r.statusCode >= 400
    )

    const errorsByEndpoint: Record<string, number> = {}
    errorRequests.forEach(request => {
      const key = `${request.method} ${request.endpoint}`
      errorsByEndpoint[key] = (errorsByEndpoint[key] || 0) + 1
    })

    return {
      totalErrors: errorRequests.length,
      errorsByEndpoint,
      recentErrors: errorRequests.slice(-10) // Last 10 errors
    }
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrends(timeRangeHours: number = 24): {
    averageResponseTimes: Array<{ timestamp: Date; avgTime: number }>
    requestVolume: Array<{ timestamp: Date; count: number }>
    errorRates: Array<{ timestamp: Date; errorRate: number }>
  } {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000)
    const recentRequests = this.requestMetrics.filter(r => r.timestamp >= cutoffTime)
    
    // Group by hour
    const hourlyData = new Map<string, RequestMetrics[]>()
    recentRequests.forEach(request => {
      const hourKey = new Date(request.timestamp.getFullYear(), 
        request.timestamp.getMonth(), 
        request.timestamp.getDate(), 
        request.timestamp.getHours()).toISOString()
      
      if (!hourlyData.has(hourKey)) {
        hourlyData.set(hourKey, [])
      }
      hourlyData.get(hourKey)!.push(request)
    })

    const trends = {
      averageResponseTimes: [] as Array<{ timestamp: Date; avgTime: number }>,
      requestVolume: [] as Array<{ timestamp: Date; count: number }>,
      errorRates: [] as Array<{ timestamp: Date; errorRate: number }>
    }

    hourlyData.forEach((requests, hourKey) => {
      const timestamp = new Date(hourKey)
      const avgTime = requests.reduce((sum, r) => sum + r.duration, 0) / requests.length
      const errorCount = requests.filter(r => r.statusCode >= 400).length
      const errorRate = (errorCount / requests.length) * 100

      trends.averageResponseTimes.push({ timestamp, avgTime: Math.round(avgTime) })
      trends.requestVolume.push({ timestamp, count: requests.length })
      trends.errorRates.push({ timestamp, errorRate: Math.round(errorRate * 100) / 100 })
    })

    return trends
  }

  /**
   * Start periodic system monitoring
   */
  private startSystemMonitoring(): void {
    // Record system metrics every 5 minutes
    setInterval(() => {
      this.recordSystemMetrics()
    }, 5 * 60 * 1000)

    // Record initial snapshot
    this.recordSystemMetrics()
  }

  /**
   * Get memory usage in a human-readable format
   */
  getMemoryUsage(): {
    rss: string
    heapUsed: string
    heapTotal: string
    external: string
  } {
    const memUsage = process.memoryUsage()
    const formatMB = (bytes: number) => `${Math.round(bytes / 1024 / 1024 * 100) / 100} MB`
    
    return {
      rss: formatMB(memUsage.rss),
      heapUsed: formatMB(memUsage.heapUsed),
      heapTotal: formatMB(memUsage.heapTotal),
      external: formatMB(memUsage.external)
    }
  }

  /**
   * Clear old metrics (useful for testing or memory management)
   */
  clearMetrics(): void {
    this.requestMetrics = []
    this.systemMetrics = []
  }

  /**
   * Get basic metrics summary (for monitoring system compatibility)
   */
  getMetrics(timeRangeHours: number = 1): {
    total?: number
    success?: number
    errors?: number
    avgResponseTime?: number
    p95ResponseTime?: number
  } {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000)
    const recentRequests = this.requestMetrics.filter(r => r.timestamp >= cutoffTime)
    
    const total = recentRequests.length
    const errors = recentRequests.filter(r => r.statusCode >= 400).length
    const success = total - errors
    
    const responseTimes = recentRequests.map(r => r.duration).sort((a, b) => a - b)
    const avgResponseTime = total > 0 
      ? recentRequests.reduce((sum, r) => sum + r.duration, 0) / total 
      : 0
    
    const p95Index = Math.ceil(responseTimes.length * 0.95) - 1
    const p95ResponseTime = responseTimes.length > 0 ? responseTimes[Math.max(0, p95Index)] : 0

    return {
      total,
      success,
      errors,
      avgResponseTime,
      p95ResponseTime
    }
  }

  /**
   * Get performance metrics (for monitoring system compatibility)
   */
  getPerformanceMetrics(timeRangeHours: number = 1): {
    avgResponseTime?: number
    medianResponseTime?: number
    p95ResponseTime?: number
    p99ResponseTime?: number
  } {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000)
    const recentRequests = this.requestMetrics.filter(r => r.timestamp >= cutoffTime)
    
    if (recentRequests.length === 0) {
      return {}
    }

    const responseTimes = recentRequests.map(r => r.duration).sort((a, b) => a - b)
    const avgResponseTime = recentRequests.reduce((sum, r) => sum + r.duration, 0) / recentRequests.length
    
    const medianIndex = Math.floor(responseTimes.length / 2)
    const medianResponseTime = responseTimes.length % 2 === 0
      ? (responseTimes[medianIndex - 1] + responseTimes[medianIndex]) / 2
      : responseTimes[medianIndex]
    
    const p95Index = Math.ceil(responseTimes.length * 0.95) - 1
    const p95ResponseTime = responseTimes[Math.max(0, p95Index)]
    
    const p99Index = Math.ceil(responseTimes.length * 0.99) - 1
    const p99ResponseTime = responseTimes[Math.max(0, p99Index)]

    return {
      avgResponseTime,
      medianResponseTime,
      p95ResponseTime,
      p99ResponseTime
    }
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(timeRangeHours: number = 24): {
    requests: RequestMetrics[]
    system: SystemMetrics[]
    summary: UsageMetrics
  } {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000)
    
    return {
      requests: this.requestMetrics.filter(r => r.timestamp >= cutoffTime),
      system: this.systemMetrics.filter(s => s.timestamp >= cutoffTime),
      summary: this.getUsageMetrics(timeRangeHours)
    }
  }
}

// Export singleton instance
export const metricsCollector = MetricsCollector.getInstance()