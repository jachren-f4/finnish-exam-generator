/**
 * Application Metrics API
 * Exposes system metrics and telemetry data
 */

import { NextRequest } from 'next/server'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { metricsCollector } from '@/lib/utils/metrics-collector'
import { logger } from '@/lib/monitoring/logger'
import { examCache, gradingCache, globalCache } from '@/lib/utils/cache-manager'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'json'
    const timeRange = url.searchParams.get('timeRange') || '1h'

    logger.debug('Metrics requested', {
      operation: 'metrics_export',
      format,
      timeRange,
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
    })

    // Calculate time range
    const now = new Date()
    const timeRangeMs = parseTimeRange(timeRange)
    const startTime = new Date(now.getTime() - timeRangeMs)

    // Collect metrics
    const metrics = {
      timestamp: now.toISOString(),
      timeRange: {
        start: startTime.toISOString(),
        end: now.toISOString(),
        duration: `${timeRange}`
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        version: process.version,
        platform: process.platform
      },
      application: {
        requests: metricsCollector.getMetrics(),
        cache: {
          exam: examCache.getStats(),
          grading: gradingCache.getStats(),
          global: globalCache.getStats()
        },
        performance: metricsCollector.getPerformanceMetrics()
      }
    }

    // Return metrics in requested format
    if (format === 'prometheus') {
      return new Response(formatPrometheusMetrics(metrics), {
        headers: { 'Content-Type': 'text/plain; version=0.0.4' }
      })
    }

    logger.info('Metrics exported', {
      operation: 'metrics_export',
      format,
      timeRange,
      requestCount: metrics.application.requests.total || 0
    })

    return ApiResponseBuilder.success(metrics)

  } catch (error) {
    logger.error('Metrics export failed', {
      operation: 'metrics_export'
    }, error as Error)

    return ApiResponseBuilder.internalError(
      'Metrics export failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    if (action === 'record_custom') {
      // Record custom metric
      const { name, value, tags } = data
      
      logger.debug('Custom metric recorded', {
        operation: 'custom_metric',
        metric: name,
        value,
        tags
      })

      // In a full implementation, you'd store this in a metrics backend
      return ApiResponseBuilder.success({
        message: 'Custom metric recorded',
        metric: { name, value, tags, timestamp: new Date().toISOString() }
      })
    }

    if (action === 'clear_metrics') {
      // Clear metrics (development only)
      if (process.env.NODE_ENV !== 'development') {
        return ApiResponseBuilder.forbidden('Metrics clearing only allowed in development')
      }

      logger.warn('Metrics cleared', {
        operation: 'metrics_clear',
        environment: process.env.NODE_ENV
      })

      return ApiResponseBuilder.success({
        message: 'Metrics cleared (development only)',
        timestamp: new Date().toISOString()
      })
    }

    return ApiResponseBuilder.validationError(
      'Invalid action',
      'Supported actions: record_custom, clear_metrics'
    )

  } catch (error) {
    logger.error('Metrics operation failed', {
      operation: 'metrics_operation'
    }, error as Error)

    return ApiResponseBuilder.internalError(
      'Metrics operation failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

function parseTimeRange(timeRange: string): number {
  const timeRanges: Record<string, number> = {
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  }
  
  return timeRanges[timeRange] || timeRanges['1h']
}

function formatPrometheusMetrics(metrics: any): string {
  const lines: string[] = []
  
  // System metrics
  lines.push(`# HELP nodejs_memory_usage_bytes Node.js memory usage in bytes`)
  lines.push(`# TYPE nodejs_memory_usage_bytes gauge`)
  lines.push(`nodejs_memory_usage_bytes{type="rss"} ${metrics.system.memory.rss}`)
  lines.push(`nodejs_memory_usage_bytes{type="heapTotal"} ${metrics.system.memory.heapTotal}`)
  lines.push(`nodejs_memory_usage_bytes{type="heapUsed"} ${metrics.system.memory.heapUsed}`)
  lines.push(`nodejs_memory_usage_bytes{type="external"} ${metrics.system.memory.external}`)
  
  lines.push(`# HELP nodejs_uptime_seconds Node.js uptime in seconds`)
  lines.push(`# TYPE nodejs_uptime_seconds counter`)
  lines.push(`nodejs_uptime_seconds ${metrics.system.uptime}`)
  
  // Application metrics
  if (metrics.application.requests.total) {
    lines.push(`# HELP http_requests_total Total HTTP requests`)
    lines.push(`# TYPE http_requests_total counter`)
    lines.push(`http_requests_total ${metrics.application.requests.total}`)
  }
  
  // Cache metrics
  const caches = ['exam', 'grading', 'global']
  caches.forEach(cacheName => {
    const stats = metrics.application.cache[cacheName]
    if (stats) {
      lines.push(`# HELP cache_size_total Cache size`)
      lines.push(`# TYPE cache_size_total gauge`)
      lines.push(`cache_size_total{cache="${cacheName}"} ${stats.totalEntries || 0}`)
      
      lines.push(`# HELP cache_hit_ratio Cache hit ratio`)
      lines.push(`# TYPE cache_hit_ratio gauge`)
      lines.push(`cache_hit_ratio{cache="${cacheName}"} ${stats.hitRatio || 0}`)
    }
  })
  
  return lines.join('\n') + '\n'
}