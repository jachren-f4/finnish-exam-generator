/**
 * Performance Dashboard API Endpoint
 * Provides comprehensive performance metrics and monitoring data
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { performanceDashboard } from '@/lib/utils/performance-dashboard'
import { metricsCollector } from '@/lib/utils/metrics-collector'
import { examCache, gradingCache, globalCache } from '@/lib/utils/cache-manager'
import { DatabaseManager } from '@/lib/utils/database-manager'
import { withEnhancedRateLimit, rateLimitConfigs } from '@/lib/middleware/enhanced-rate-limiter'
import { withSecurityHeaders, SecurityProfiles } from '@/lib/middleware/security-headers'

async function dashboardHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRangeHours = parseInt(searchParams.get('hours') || '24')
    const format = searchParams.get('format') || 'json'

    // Generate comprehensive dashboard
    const dashboard = await performanceDashboard.generateDashboard(timeRangeHours)

    // Add cache statistics
    const cacheStats = {
      examCache: examCache.getStats(),
      gradingCache: gradingCache.getStats(),
      globalCache: globalCache.getStats()
    }

    // Add database health
    const dbHealth = await DatabaseManager.healthCheck()

    // Combine all metrics
    const fullDashboard = {
      ...dashboard,
      cache: cacheStats,
      database: {
        health: dbHealth,
        connectionStats: await DatabaseManager.getConnectionStats()
      },
      generatedAt: new Date().toISOString(),
      timeRangeHours
    }

    if (format === 'text') {
      // Generate text report for easy reading
      const report = await performanceDashboard.generateReport(timeRangeHours)
      
      // Add cache information to text report
      const cacheReport = [
        '',
        '💾 Cache Performance:',
        `   Exam Cache: ${cacheStats.examCache.totalEntries} entries, ${cacheStats.examCache.hitRate}% hit rate`,
        `   Grading Cache: ${cacheStats.gradingCache.totalEntries} entries, ${cacheStats.gradingCache.hitRate}% hit rate`,
        `   Global Cache: ${cacheStats.globalCache.totalEntries} entries, ${cacheStats.globalCache.hitRate}% hit rate`,
        '',
        '🏥 Database Health:',
        `   Status: ${dbHealth.healthy ? '✅ Healthy' : '❌ Unhealthy'}`,
        `   Latency: ${dbHealth.latency}ms`,
        `   Active Connections: ${fullDashboard.database.connectionStats.activeConnections}`
      ].join('\n')

      return new NextResponse(report + cacheReport, {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache'
        }
      })
    }

    return ApiResponseBuilder.success(fullDashboard)

  } catch (error) {
    console.error('Error generating performance dashboard:', error)
    return ApiResponseBuilder.internalError(
      'Performance dashboard error',
      'Unable to generate performance metrics'
    )
  }
}

// Export GET with rate limiting and security headers
export const GET = withSecurityHeaders(
  {
    ...SecurityProfiles.balanced,
    cors: {
      origins: ['*'],
      methods: ['GET', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization'],
      credentials: false
    }
  },
  withEnhancedRateLimit(rateLimitConfigs.expensive, dashboardHandler)
)

// Export metrics data in various formats
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, timeRangeHours = 24, format = 'json' } = body

    switch (action) {
      case 'export':
        const exportData = metricsCollector.exportMetrics(timeRangeHours)
        
        if (format === 'csv') {
          // Generate CSV format for analytics tools
          const csvHeaders = 'timestamp,endpoint,method,statusCode,duration,ip\n'
          const csvData = exportData.requests
            .map(r => `${r.timestamp.toISOString()},${r.endpoint},${r.method},${r.statusCode},${r.duration},${r.ip}`)
            .join('\n')
          
          return new NextResponse(csvHeaders + csvData, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="metrics-${Date.now()}.csv"`
            }
          })
        }
        
        return ApiResponseBuilder.success(exportData)

      case 'clear':
        // Clear metrics (for testing or maintenance)
        metricsCollector.clearMetrics()
        examCache.clear()
        gradingCache.clear()
        globalCache.clear()
        
        return ApiResponseBuilder.success({ 
          message: 'All metrics and cache data cleared',
          clearedAt: new Date().toISOString()
        })

      case 'summary':
        const summary = metricsCollector.getUsageMetrics(timeRangeHours)
        return ApiResponseBuilder.success(summary)

      case 'errors':
        const errorMetrics = metricsCollector.getErrorMetrics(timeRangeHours)
        return ApiResponseBuilder.success(errorMetrics)

      case 'trends':
        const trends = metricsCollector.getPerformanceTrends(timeRangeHours)
        return ApiResponseBuilder.success(trends)

      default:
        return ApiResponseBuilder.validationError(
          'Invalid action',
          'Supported actions: export, clear, summary, errors, trends'
        )
    }

  } catch (error) {
    console.error('Error processing performance action:', error)
    return ApiResponseBuilder.internalError(
      'Performance action error',
      'Unable to process performance action'
    )
  }
}

// Handle CORS for dashboard access
export async function OPTIONS(_request: NextRequest) {
  return ApiResponseBuilder.cors(
    ['GET', 'POST', 'OPTIONS'],
    ['Content-Type'],
    '*'
  )
}