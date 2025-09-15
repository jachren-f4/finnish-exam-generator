/**
 * Operational Dashboard API
 * Provides comprehensive monitoring views and system insights
 */

import { NextRequest } from 'next/server'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { healthCheckManager } from '@/lib/monitoring/health-checks'
import { tracer } from '@/lib/monitoring/tracing'
import { alertManager } from '@/lib/monitoring/alerts'
import { metricsCollector } from '@/lib/utils/metrics-collector'
import { logger } from '@/lib/monitoring/logger'
import { examCache, gradingCache, globalCache } from '@/lib/utils/cache-manager'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const view = url.searchParams.get('view') || 'overview'
    const timeRange = url.searchParams.get('timeRange') || '1h'

    logger.debug('Dashboard data requested', {
      operation: 'dashboard_request',
      view,
      timeRange,
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1'
    })

    const dashboardData = await generateDashboardData(view, timeRange)

    logger.info('Dashboard data generated', {
      operation: 'dashboard_generate',
      view,
      timeRange,
      dataPoints: Object.keys(dashboardData).length
    })

    return ApiResponseBuilder.success(dashboardData)

  } catch (error) {
    logger.error('Dashboard generation failed', {
      operation: 'dashboard_generate'
    }, error as Error)

    return ApiResponseBuilder.internalError(
      'Dashboard generation failed',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

async function generateDashboardData(view: string, timeRange: string): Promise<Record<string, any>> {
  const now = new Date()
  const timeRangeMs = parseTimeRange(timeRange)
  const startTime = new Date(now.getTime() - timeRangeMs)

  switch (view) {
    case 'overview':
      return generateOverviewDashboard(startTime, now)
    case 'health':
      return generateHealthDashboard()
    case 'performance':
      return generatePerformanceDashboard(startTime, now)
    case 'security':
      return generateSecurityDashboard(startTime, now)
    case 'alerts':
      return generateAlertsDashboard()
    case 'tracing':
      return generateTracingDashboard()
    default:
      return generateOverviewDashboard(startTime, now)
  }
}

async function generateOverviewDashboard(startTime: Date, endTime: Date): Promise<Record<string, any>> {
  const [systemHealth, traceStats, alertStats, metrics] = await Promise.all([
    healthCheckManager.getLastResults(),
    tracer.getTraceStats(),
    alertManager.getAlertStats(),
    Promise.resolve(metricsCollector.getMetrics())
  ])

  // System status summary
  const systemStatus = {
    status: systemHealth.status,
    uptime: systemHealth.uptime,
    version: systemHealth.version,
    timestamp: systemHealth.timestamp,
    components: {
      healthy: systemHealth.summary.healthy,
      degraded: systemHealth.summary.degraded,
      unhealthy: systemHealth.summary.unhealthy,
      total: systemHealth.summary.total
    }
  }

  // Performance summary
  const performance = {
    requests: {
      total: metrics.total || 0,
      success: metrics.success || 0,
      errors: metrics.errors || 0,
      errorRate: metrics.total ? ((metrics.errors || 0) / metrics.total * 100).toFixed(2) + '%' : '0%'
    },
    responseTime: {
      average: metrics.avgResponseTime ? `${Math.round(metrics.avgResponseTime)}ms` : 'N/A',
      p95: metrics.p95ResponseTime ? `${Math.round(metrics.p95ResponseTime)}ms` : 'N/A'
    },
    tracing: {
      activeSpans: traceStats.activeSpans,
      completedTraces: traceStats.completedTraces,
      avgDuration: `${traceStats.avgDuration}ms`,
      errorRate: `${(traceStats.errorRate * 100).toFixed(1)}%`
    }
  }

  // Cache performance
  const cacheStats = {
    exam: examCache.getStats(),
    grading: gradingCache.getStats(),
    global: globalCache.getStats()
  }

  const cacheOverview = {
    totalEntries: Object.values(cacheStats).reduce((sum, stats) => sum + (stats.totalEntries || 0), 0),
    totalHits: Object.values(cacheStats).reduce((sum, stats) => sum + (stats.totalHits || 0), 0),
    totalMisses: Object.values(cacheStats).reduce((sum, stats) => sum + (stats.totalMisses || 0), 0),
    avgHitRatio: Object.values(cacheStats).reduce((sum, stats) => sum + (stats.hitRate || 0), 0) / Object.keys(cacheStats).length
  }

  // Alert summary
  const alertSummary = {
    active: alertStats.activeAlerts,
    total: alertStats.totalAlerts,
    bySeverity: alertStats.alertsBySeverity
  }

  return {
    timestamp: endTime.toISOString(),
    timeRange: {
      start: startTime.toISOString(),
      end: endTime.toISOString()
    },
    system: systemStatus,
    performance,
    cache: {
      overview: cacheOverview,
      details: cacheStats
    },
    alerts: alertSummary,
    quickStats: {
      systemHealthy: systemHealth.status === 'healthy',
      activeAlerts: alertStats.activeAlerts,
      errorRate: performance.requests.errorRate,
      avgResponseTime: performance.responseTime.average
    }
  }
}

async function generateHealthDashboard(): Promise<Record<string, any>> {
  const systemHealth = await healthCheckManager.runAllChecks()

  return {
    timestamp: new Date().toISOString(),
    overall: {
      status: systemHealth.status,
      uptime: systemHealth.uptime,
      version: systemHealth.version
    },
    components: systemHealth.components.map(component => ({
      name: component.name,
      status: component.status,
      lastCheck: component.lastCheck.toISOString(),
      responseTime: `${component.responseTime}ms`,
      details: component.details,
      error: component.error
    })),
    summary: systemHealth.summary,
    recommendations: generateHealthRecommendations(systemHealth.components)
  }
}

async function generatePerformanceDashboard(startTime: Date, endTime: Date): Promise<Record<string, any>> {
  const [metrics, performanceMetrics, traceStats] = await Promise.all([
    Promise.resolve(metricsCollector.getMetrics()),
    Promise.resolve(metricsCollector.getPerformanceMetrics()),
    Promise.resolve(tracer.getTraceStats())
  ])

  const memoryUsage = process.memoryUsage()
  const cpuUsage = process.cpuUsage()

  return {
    timestamp: new Date().toISOString(),
    timeRange: {
      start: startTime.toISOString(),
      end: endTime.toISOString()
    },
    requests: {
      total: metrics.total || 0,
      success: metrics.success || 0,
      errors: metrics.errors || 0,
      errorRate: metrics.total ? (metrics.errors || 0) / metrics.total : 0,
      rps: calculateRequestsPerSecond(metrics, endTime.getTime() - startTime.getTime())
    },
    responseTime: {
      average: performanceMetrics.avgResponseTime || 0,
      median: performanceMetrics.medianResponseTime || 0,
      p95: performanceMetrics.p95ResponseTime || 0,
      p99: performanceMetrics.p99ResponseTime || 0
    },
    system: {
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        heapUsagePercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime()
    },
    tracing: {
      activeSpans: traceStats.activeSpans,
      completedTraces: traceStats.completedTraces,
      avgDuration: traceStats.avgDuration,
      errorRate: traceStats.errorRate
    },
    cache: {
      exam: examCache.getStats(),
      grading: gradingCache.getStats(),
      global: globalCache.getStats()
    }
  }
}

async function generateSecurityDashboard(startTime: Date, endTime: Date): Promise<Record<string, any>> {
  // This would integrate with the audit logger in a full implementation
  return {
    timestamp: new Date().toISOString(),
    timeRange: {
      start: startTime.toISOString(),
      end: endTime.toISOString()
    },
    threats: {
      detected: 0,
      blocked: 0,
      riskLevel: 'low'
    },
    authentication: {
      totalLogins: 0,
      failedLogins: 0,
      successRate: '100%'
    },
    rateLimiting: {
      requestsBlocked: 0,
      topBlockedIPs: []
    },
    compliance: {
      auditEventsLogged: 0,
      dataRetention: 'compliant'
    }
  }
}

async function generateAlertsDashboard(): Promise<Record<string, any>> {
  const alertStats = alertManager.getAlertStats()
  const activeAlerts = alertManager.getActiveAlerts()

  return {
    timestamp: new Date().toISOString(),
    summary: {
      active: alertStats.activeAlerts,
      total: alertStats.totalAlerts,
      resolved: alertStats.totalAlerts - alertStats.activeAlerts
    },
    activeAlerts: activeAlerts.map(alert => ({
      id: alert.id,
      rule: alert.ruleName,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp.toISOString(),
      duration: Date.now() - alert.timestamp.getTime(),
      channels: alert.channels
    })),
    bySeverity: alertStats.alertsBySeverity,
    byRule: alertStats.alertsByRule,
    trends: {
      last24h: 0, // Would calculate from history
      lastWeek: 0, // Would calculate from history
      avgResolutionTime: 0 // Would calculate from resolved alerts
    }
  }
}

async function generateTracingDashboard(): Promise<Record<string, any>> {
  const traceStats = tracer.getTraceStats()
  const activeSpans = tracer.getActiveSpans()

  return {
    timestamp: new Date().toISOString(),
    overview: traceStats,
    activeSpans: activeSpans.map(span => ({
      spanId: span.spanId,
      traceId: span.traceId,
      operation: span.operationName,
      startTime: new Date(span.startTime).toISOString(),
      duration: Date.now() - span.startTime,
      tags: span.tags,
      status: span.status
    })),
    performance: {
      slowestOperations: [], // Would analyze completed spans
      errorProne: [], // Would analyze spans with errors
      throughput: 0 // Would calculate from completed traces
    }
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

function calculateRequestsPerSecond(metrics: any, timeRangeMs: number): number {
  if (!metrics.total || timeRangeMs <= 0) return 0
  return Math.round((metrics.total / (timeRangeMs / 1000)) * 100) / 100
}

function generateHealthRecommendations(components: any[]): string[] {
  const recommendations: string[] = []
  
  components.forEach(component => {
    if (component.status === 'unhealthy') {
      recommendations.push(`Critical: Fix ${component.name} component - ${component.error || 'Health check failed'}`)
    } else if (component.status === 'degraded') {
      recommendations.push(`Warning: Monitor ${component.name} component - performance degraded`)
    }
  })

  if (recommendations.length === 0) {
    recommendations.push('All systems operating normally')
  }

  return recommendations
}