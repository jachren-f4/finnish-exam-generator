/**
 * Performance Dashboard Utilities
 * Provides comprehensive performance insights and monitoring capabilities
 */

import { metricsCollector, UsageMetrics } from './metrics-collector'
import { DatabaseManager } from './database-manager'

export interface DashboardData {
  overview: PerformanceOverview
  endpoints: EndpointPerformance[]
  system: SystemHealth
  trends: PerformanceTrends
  alerts: PerformanceAlert[]
}

export interface PerformanceOverview {
  totalRequests: number
  averageResponseTime: number
  errorRate: number
  uptime: string
  requestsPerMinute: number
  topBottlenecks: string[]
}

export interface EndpointPerformance {
  endpoint: string
  totalRequests: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  errorRate: number
  throughput: number
  lastAccessed: Date
  status: 'healthy' | 'warning' | 'critical'
}

export interface SystemHealth {
  memory: {
    used: string
    total: string
    percentage: number
  }
  cpu: {
    usage: number
    status: 'healthy' | 'warning' | 'critical'
  }
  database: {
    connectionHealth: boolean
    averageQueryTime: number
    activeConnections: number
  }
  status: 'healthy' | 'warning' | 'critical'
}

export interface PerformanceTrends {
  responseTimesByHour: Array<{ hour: string; avgTime: number }>
  requestVolumeByHour: Array<{ hour: string; requests: number }>
  errorRateByHour: Array<{ hour: string; errorRate: number }>
}

export interface PerformanceAlert {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: 'response_time' | 'error_rate' | 'memory' | 'throughput'
  message: string
  timestamp: Date
  endpoint?: string
  value: number
  threshold: number
}

/**
 * Performance Dashboard Generator
 */
export class PerformanceDashboard {
  private static instance: PerformanceDashboard

  static getInstance(): PerformanceDashboard {
    if (!this.instance) {
      this.instance = new PerformanceDashboard()
    }
    return this.instance
  }

  /**
   * Generate comprehensive performance dashboard
   */
  async generateDashboard(timeRangeHours: number = 24): Promise<DashboardData> {
    const [overview, endpoints, system, trends, alerts] = await Promise.all([
      this.generateOverview(timeRangeHours),
      this.generateEndpointPerformance(timeRangeHours),
      this.generateSystemHealth(),
      this.generateTrends(timeRangeHours),
      this.generateAlerts(timeRangeHours)
    ])

    return {
      overview,
      endpoints,
      system,
      trends,
      alerts
    }
  }

  /**
   * Generate performance overview
   */
  private async generateOverview(timeRangeHours: number): Promise<PerformanceOverview> {
    const usage = metricsCollector.getUsageMetrics(timeRangeHours)
    const errorMetrics = metricsCollector.getErrorMetrics(timeRangeHours)
    
    const requestsPerMinute = usage.totalRequests / (timeRangeHours * 60)
    const uptime = this.formatUptime(process.uptime())
    
    // Identify bottlenecks (endpoints with high response times or error rates)
    const bottlenecks = usage.topEndpoints
      .filter(ep => ep.averageResponseTime > 2000 || ep.errorRate > 5)
      .slice(0, 3)
      .map(ep => ep.endpoint)

    return {
      totalRequests: usage.totalRequests,
      averageResponseTime: usage.averageResponseTime,
      errorRate: usage.errorRate,
      uptime,
      requestsPerMinute: Math.round(requestsPerMinute * 100) / 100,
      topBottlenecks: bottlenecks
    }
  }

  /**
   * Generate detailed endpoint performance metrics
   */
  private async generateEndpointPerformance(timeRangeHours: number): Promise<EndpointPerformance[]> {
    const usage = metricsCollector.getUsageMetrics(timeRangeHours)
    const exportData = metricsCollector.exportMetrics(timeRangeHours)
    
    return usage.topEndpoints.map(endpoint => {
      // Calculate percentiles
      const endpointRequests = exportData.requests.filter(
        r => `${r.method} ${r.endpoint}` === endpoint.endpoint
      )
      const sortedTimes = endpointRequests.map(r => r.duration).sort((a, b) => a - b)
      
      const p95Index = Math.floor(sortedTimes.length * 0.95)
      const p99Index = Math.floor(sortedTimes.length * 0.99)
      
      const p95ResponseTime = sortedTimes[p95Index] || 0
      const p99ResponseTime = sortedTimes[p99Index] || 0
      
      const throughput = endpoint.totalRequests / timeRangeHours
      
      // Determine status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy'
      if (endpoint.errorRate > 10 || endpoint.averageResponseTime > 5000) {
        status = 'critical'
      } else if (endpoint.errorRate > 5 || endpoint.averageResponseTime > 2000) {
        status = 'warning'
      }

      return {
        endpoint: endpoint.endpoint,
        totalRequests: endpoint.totalRequests,
        averageResponseTime: endpoint.averageResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        errorRate: endpoint.errorRate,
        throughput: Math.round(throughput * 100) / 100,
        lastAccessed: endpoint.lastAccessed,
        status
      }
    })
  }

  /**
   * Generate system health metrics
   */
  private async generateSystemHealth(): Promise<SystemHealth> {
    const memUsage = process.memoryUsage()
    const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
    const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
    const memPercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)

    // Check database health
    const dbHealth = await DatabaseManager.healthCheck()
    const dbStats = await DatabaseManager.getConnectionStats()

    // Determine CPU status (simplified - would need more sophisticated monitoring in production)
    let cpuStatus: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (memPercentage > 90) {
      cpuStatus = 'critical'
    } else if (memPercentage > 70) {
      cpuStatus = 'warning'
    }

    // Overall system status
    let systemStatus: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (!dbHealth.healthy || cpuStatus === 'critical') {
      systemStatus = 'critical'
    } else if (cpuStatus === 'warning' || dbHealth.latency > 1000) {
      systemStatus = 'warning'
    }

    return {
      memory: {
        used: `${memUsedMB} MB`,
        total: `${memTotalMB} MB`,
        percentage: memPercentage
      },
      cpu: {
        usage: memPercentage, // Simplified - using memory as proxy
        status: cpuStatus
      },
      database: {
        connectionHealth: dbHealth.healthy,
        averageQueryTime: dbHealth.latency,
        activeConnections: dbStats.activeConnections
      },
      status: systemStatus
    }
  }

  /**
   * Generate performance trends
   */
  private async generateTrends(timeRangeHours: number): Promise<PerformanceTrends> {
    const trends = metricsCollector.getPerformanceTrends(timeRangeHours)
    
    return {
      responseTimesByHour: trends.averageResponseTimes.map(t => ({
        hour: t.timestamp.toISOString().substr(0, 13), // YYYY-MM-DDTHH
        avgTime: t.avgTime
      })),
      requestVolumeByHour: trends.requestVolume.map(t => ({
        hour: t.timestamp.toISOString().substr(0, 13),
        requests: t.count
      })),
      errorRateByHour: trends.errorRates.map(t => ({
        hour: t.timestamp.toISOString().substr(0, 13),
        errorRate: t.errorRate
      }))
    }
  }

  /**
   * Generate performance alerts
   */
  private async generateAlerts(timeRangeHours: number): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = []
    const usage = metricsCollector.getUsageMetrics(timeRangeHours)
    const systemHealth = await this.generateSystemHealth()
    
    // Response time alerts
    usage.topEndpoints.forEach(endpoint => {
      if (endpoint.averageResponseTime > 5000) {
        alerts.push({
          id: `rt_${endpoint.endpoint}_${Date.now()}`,
          severity: 'critical',
          type: 'response_time',
          message: `High response time detected for ${endpoint.endpoint}`,
          timestamp: new Date(),
          endpoint: endpoint.endpoint,
          value: endpoint.averageResponseTime,
          threshold: 5000
        })
      } else if (endpoint.averageResponseTime > 2000) {
        alerts.push({
          id: `rt_${endpoint.endpoint}_${Date.now()}`,
          severity: 'medium',
          type: 'response_time',
          message: `Elevated response time for ${endpoint.endpoint}`,
          timestamp: new Date(),
          endpoint: endpoint.endpoint,
          value: endpoint.averageResponseTime,
          threshold: 2000
        })
      }
    })

    // Error rate alerts
    usage.topEndpoints.forEach(endpoint => {
      if (endpoint.errorRate > 10) {
        alerts.push({
          id: `er_${endpoint.endpoint}_${Date.now()}`,
          severity: 'critical',
          type: 'error_rate',
          message: `High error rate detected for ${endpoint.endpoint}`,
          timestamp: new Date(),
          endpoint: endpoint.endpoint,
          value: endpoint.errorRate,
          threshold: 10
        })
      } else if (endpoint.errorRate > 5) {
        alerts.push({
          id: `er_${endpoint.endpoint}_${Date.now()}`,
          severity: 'medium',
          type: 'error_rate',
          message: `Elevated error rate for ${endpoint.endpoint}`,
          timestamp: new Date(),
          endpoint: endpoint.endpoint,
          value: endpoint.errorRate,
          threshold: 5
        })
      }
    })

    // Memory alerts
    if (systemHealth.memory.percentage > 90) {
      alerts.push({
        id: `mem_${Date.now()}`,
        severity: 'critical',
        type: 'memory',
        message: 'Critical memory usage detected',
        timestamp: new Date(),
        value: systemHealth.memory.percentage,
        threshold: 90
      })
    } else if (systemHealth.memory.percentage > 80) {
      alerts.push({
        id: `mem_${Date.now()}`,
        severity: 'medium',
        type: 'memory',
        message: 'High memory usage detected',
        timestamp: new Date(),
        value: systemHealth.memory.percentage,
        threshold: 80
      })
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Format uptime in human-readable format
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }

  /**
   * Generate performance report summary
   */
  async generateReport(timeRangeHours: number = 24): Promise<string> {
    const dashboard = await this.generateDashboard(timeRangeHours)
    
    const lines = [
      '=== PERFORMANCE REPORT ===',
      '',
      `📊 Overview (Last ${timeRangeHours}h):`,
      `   Total Requests: ${dashboard.overview.totalRequests}`,
      `   Average Response Time: ${dashboard.overview.averageResponseTime}ms`,
      `   Error Rate: ${dashboard.overview.errorRate}%`,
      `   Requests/Minute: ${dashboard.overview.requestsPerMinute}`,
      `   Uptime: ${dashboard.overview.uptime}`,
      '',
      `🚀 Top Endpoints:`,
      ...dashboard.endpoints.slice(0, 5).map(ep => 
        `   ${ep.endpoint}: ${ep.totalRequests} requests, ${ep.averageResponseTime}ms avg, ${ep.errorRate}% errors`
      ),
      '',
      `💾 System Health:`,
      `   Memory: ${dashboard.system.memory.used}/${dashboard.system.memory.total} (${dashboard.system.memory.percentage}%)`,
      `   Database: ${dashboard.system.database.connectionHealth ? '✅' : '❌'} (${dashboard.system.database.averageQueryTime}ms avg)`,
      `   Status: ${dashboard.system.status.toUpperCase()}`,
      ''
    ]

    if (dashboard.alerts.length > 0) {
      lines.push(`🚨 Active Alerts (${dashboard.alerts.length}):`)
      dashboard.alerts.slice(0, 5).forEach(alert => {
        lines.push(`   ${alert.severity.toUpperCase()}: ${alert.message}`)
      })
      lines.push('')
    }

    if (dashboard.overview.topBottlenecks.length > 0) {
      lines.push(`⚠️  Performance Bottlenecks:`)
      dashboard.overview.topBottlenecks.forEach(bottleneck => {
        lines.push(`   - ${bottleneck}`)
      })
    }

    return lines.join('\n')
  }
}

// Export singleton instance
export const performanceDashboard = PerformanceDashboard.getInstance()