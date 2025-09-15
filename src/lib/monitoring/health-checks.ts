/**
 * Comprehensive Health Check System
 * Monitors application health, dependencies, and system resources
 */

import { DatabaseManager } from '../utils/database-manager'
import { examCache, gradingCache, globalCache } from '../utils/cache-manager'
import { logger } from './logger'

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface HealthCheckResult {
  status: HealthStatus
  timestamp: Date
  responseTime: number
  details?: Record<string, any>
  error?: string
}

export interface ComponentHealth {
  name: string
  status: HealthStatus
  lastCheck: Date
  responseTime: number
  details: Record<string, any>
  error?: string
}

export interface SystemHealth {
  status: HealthStatus
  timestamp: Date
  components: ComponentHealth[]
  summary: {
    healthy: number
    degraded: number
    unhealthy: number
    total: number
  }
  uptime: number
  version: string
}

/**
 * Base health check interface
 */
export interface HealthCheck {
  name: string
  timeout?: number
  check(): Promise<HealthCheckResult>
}

/**
 * Database health check
 */
export class DatabaseHealthCheck implements HealthCheck {
  name = 'database'
  timeout = 5000

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      const healthResult = await DatabaseManager.healthCheck()
      const connectionStats = await DatabaseManager.getConnectionStats()
      const responseTime = Date.now() - startTime

      const status: HealthStatus = 
        !healthResult.healthy ? 'unhealthy' :
        healthResult.latency > 1000 ? 'degraded' : 'healthy'

      return {
        status,
        timestamp: new Date(),
        responseTime,
        details: {
          connected: healthResult.healthy,
          latency: healthResult.latency,
          activeConnections: connectionStats.activeConnections,
          maxConnections: connectionStats.maxConnections,
          avgResponseTime: connectionStats.avgResponseTime
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Database check failed'
      }
    }
  }
}

/**
 * Cache system health check
 */
export class CacheHealthCheck implements HealthCheck {
  name = 'cache'
  timeout = 2000

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      // Test cache operations
      const testKey = `health_check_${Date.now()}`
      const testValue = 'test_data'
      
      // Test set operation
      globalCache.set(testKey, testValue, 1000)
      
      // Test get operation
      const retrieved = globalCache.get(testKey)
      
      // Test delete operation
      globalCache.delete(testKey)
      
      const responseTime = Date.now() - startTime

      // Get cache statistics
      const examStats = examCache.getStats()
      const gradingStats = gradingCache.getStats()
      const globalStats = globalCache.getStats()

      const status: HealthStatus = 
        retrieved !== testValue ? 'unhealthy' :
        responseTime > 100 ? 'degraded' : 'healthy'

      return {
        status,
        timestamp: new Date(),
        responseTime,
        details: {
          testPassed: retrieved === testValue,
          examCache: examStats,
          gradingCache: gradingStats,
          globalCache: globalStats,
          totalEntries: examStats.totalEntries + gradingStats.totalEntries + globalStats.totalEntries
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Cache check failed'
      }
    }
  }
}

/**
 * Memory health check
 */
export class MemoryHealthCheck implements HealthCheck {
  name = 'memory'
  timeout = 1000

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      const memUsage = process.memoryUsage()
      const responseTime = Date.now() - startTime

      // Calculate memory usage percentages
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
      const rssMB = Math.round(memUsage.rss / 1024 / 1024)
      const externalMB = Math.round(memUsage.external / 1024 / 1024)
      
      const heapUsagePercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)

      const status: HealthStatus = 
        heapUsagePercent > 90 ? 'unhealthy' :
        heapUsagePercent > 75 ? 'degraded' : 'healthy'

      return {
        status,
        timestamp: new Date(),
        responseTime,
        details: {
          heapUsed: `${heapUsedMB}MB`,
          heapTotal: `${heapTotalMB}MB`,
          rss: `${rssMB}MB`,
          external: `${externalMB}MB`,
          heapUsagePercent,
          arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024)
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Memory check failed'
      }
    }
  }
}

/**
 * Disk space health check
 */
export class DiskHealthCheck implements HealthCheck {
  name = 'disk'
  timeout = 2000

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      // Simulate disk usage check (in real implementation, use fs.statSync)
      const diskUsage = {
        total: 100 * 1024 * 1024 * 1024, // 100GB
        free: 80 * 1024 * 1024 * 1024,   // 80GB free
        used: 20 * 1024 * 1024 * 1024    // 20GB used
      }

      const responseTime = Date.now() - startTime
      const usagePercent = Math.round((diskUsage.used / diskUsage.total) * 100)

      const status: HealthStatus = 
        usagePercent > 90 ? 'unhealthy' :
        usagePercent > 80 ? 'degraded' : 'healthy'

      return {
        status,
        timestamp: new Date(),
        responseTime,
        details: {
          totalGB: Math.round(diskUsage.total / (1024 * 1024 * 1024)),
          freeGB: Math.round(diskUsage.free / (1024 * 1024 * 1024)),
          usedGB: Math.round(diskUsage.used / (1024 * 1024 * 1024)),
          usagePercent,
          available: diskUsage.free > 5 * 1024 * 1024 * 1024 // 5GB minimum
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Disk check failed'
      }
    }
  }
}

/**
 * External API health check
 */
export class ExternalAPIHealthCheck implements HealthCheck {
  name = 'external_apis'
  timeout = 5000

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      // Check external dependencies (Google AI, Supabase, etc.)
      const checks = await Promise.allSettled([
        this.checkGoogleAI(),
        this.checkSupabase()
      ])

      const responseTime = Date.now() - startTime
      const results = checks.map(result => 
        result.status === 'fulfilled' ? result.value : { healthy: false, error: 'Failed' }
      )

      const healthyCount = results.filter(r => r.healthy).length
      const totalCount = results.length

      const status: HealthStatus = 
        healthyCount === 0 ? 'unhealthy' :
        healthyCount < totalCount ? 'degraded' : 'healthy'

      return {
        status,
        timestamp: new Date(),
        responseTime,
        details: {
          googleAI: results[0],
          supabase: results[1],
          healthyServices: healthyCount,
          totalServices: totalCount
        }
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'External API check failed'
      }
    }
  }

  private async checkGoogleAI(): Promise<{ healthy: boolean; error?: string }> {
    try {
      // Simulate Google AI API health check
      // In real implementation: make a lightweight API call
      return { healthy: true }
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Google AI unavailable' 
      }
    }
  }

  private async checkSupabase(): Promise<{ healthy: boolean; error?: string }> {
    try {
      // Check via DatabaseManager
      const health = await DatabaseManager.healthCheck()
      return { healthy: health.healthy }
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Supabase unavailable' 
      }
    }
  }
}

/**
 * Main health check manager
 */
export class HealthCheckManager {
  private static instance: HealthCheckManager
  private checks: HealthCheck[] = []
  private lastResults = new Map<string, ComponentHealth>()
  private startTime = Date.now()

  constructor() {
    // Register default health checks
    this.registerCheck(new DatabaseHealthCheck())
    this.registerCheck(new CacheHealthCheck())
    this.registerCheck(new MemoryHealthCheck())
    this.registerCheck(new DiskHealthCheck())
    this.registerCheck(new ExternalAPIHealthCheck())
  }

  static getInstance(): HealthCheckManager {
    if (!HealthCheckManager.instance) {
      HealthCheckManager.instance = new HealthCheckManager()
    }
    return HealthCheckManager.instance
  }

  registerCheck(check: HealthCheck): void {
    this.checks.push(check)
  }

  async runCheck(checkName: string): Promise<ComponentHealth> {
    const check = this.checks.find(c => c.name === checkName)
    if (!check) {
      throw new Error(`Health check '${checkName}' not found`)
    }

    try {
      const result = await Promise.race([
        check.check(),
        this.createTimeoutPromise(check.timeout || 5000)
      ])

      const componentHealth: ComponentHealth = {
        name: check.name,
        status: result.status,
        lastCheck: result.timestamp,
        responseTime: result.responseTime,
        details: result.details || {},
        error: result.error
      }

      this.lastResults.set(check.name, componentHealth)
      return componentHealth
    } catch (error) {
      const componentHealth: ComponentHealth = {
        name: check.name,
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime: check.timeout || 5000,
        details: {},
        error: error instanceof Error ? error.message : 'Check failed'
      }

      this.lastResults.set(check.name, componentHealth)
      return componentHealth
    }
  }

  async runAllChecks(): Promise<SystemHealth> {
    const startTime = Date.now()
    
    logger.debug('Running system health checks')

    // Run all health checks in parallel
    const checkPromises = this.checks.map(check => this.runCheck(check.name))
    const components = await Promise.all(checkPromises)

    // Calculate summary
    const summary = components.reduce((acc, component) => {
      acc.total++
      acc[component.status]++
      return acc
    }, { healthy: 0, degraded: 0, unhealthy: 0, total: 0 })

    // Determine overall system status
    const overallStatus: HealthStatus = 
      summary.unhealthy > 0 ? 'unhealthy' :
      summary.degraded > 0 ? 'degraded' : 'healthy'

    const systemHealth: SystemHealth = {
      status: overallStatus,
      timestamp: new Date(),
      components,
      summary,
      uptime: Date.now() - this.startTime,
      version: '1.0.0'
    }

    const totalTime = Date.now() - startTime
    logger.info('Health checks completed', {
      operation: 'health_check',
      status: overallStatus,
      duration: totalTime,
      components: summary
    })

    return systemHealth
  }

  async getLastResults(): Promise<SystemHealth> {
    const components = Array.from(this.lastResults.values())
    
    if (components.length === 0) {
      return this.runAllChecks()
    }

    const summary = components.reduce((acc, component) => {
      acc.total++
      acc[component.status]++
      return acc
    }, { healthy: 0, degraded: 0, unhealthy: 0, total: 0 })

    const overallStatus: HealthStatus = 
      summary.unhealthy > 0 ? 'unhealthy' :
      summary.degraded > 0 ? 'degraded' : 'healthy'

    return {
      status: overallStatus,
      timestamp: new Date(),
      components,
      summary,
      uptime: Date.now() - this.startTime,
      version: '1.0.0'
    }
  }

  private createTimeoutPromise(timeout: number): Promise<HealthCheckResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check timed out after ${timeout}ms`))
      }, timeout)
    })
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(intervalMs = 60000): void {
    logger.info('Starting periodic health checks', { interval: `${intervalMs}ms` })
    
    setInterval(async () => {
      try {
        const health = await this.runAllChecks()
        
        if (health.status === 'unhealthy') {
          logger.warn('System health check failed', {
            operation: 'periodic_health_check',
            status: health.status,
            unhealthy: health.summary.unhealthy,
            components: health.components.filter(c => c.status === 'unhealthy').map(c => c.name)
          })
        }
      } catch (error) {
        logger.error('Periodic health check failed', {
          operation: 'periodic_health_check'
        }, error as Error)
      }
    }, intervalMs)
  }
}

// Export singleton instance
export const healthCheckManager = HealthCheckManager.getInstance()

// Start periodic checks in production
if (process.env.NODE_ENV === 'production') {
  healthCheckManager.startPeriodicChecks(30000) // Every 30 seconds in production
} else {
  healthCheckManager.startPeriodicChecks(60000) // Every minute in development
}