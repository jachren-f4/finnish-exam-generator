/**
 * Request Logger Service
 *
 * Logs API requests to Supabase database for monitoring, security, and analytics.
 * Captures request metadata, response status, processing time, and JWT validation status.
 *
 * Features:
 * - Async logging (non-blocking)
 * - Automatic error handling
 * - Privacy-aware (can hash IP addresses)
 * - Rate limit tracking
 * - JWT validation status
 */

import { createClient } from '@supabase/supabase-js'

export interface RequestLogData {
  // Request identification
  requestId: string
  userId?: string // From JWT or body
  endpoint: string
  method: string

  // Client information
  ipAddress?: string
  userAgent?: string

  // Request metadata
  imageCount?: number
  hasValidJwt?: boolean
  authSource?: 'jwt' | 'body' | 'none'
  requestMetadata?: {
    grade?: string | number
    subject?: string
    category?: string
    language?: string
    [key: string]: any
  }

  // Response information
  responseStatus: number
  processingTimeMs?: number
  errorCode?: string

  // Rate limiting info
  rateLimitStatus?: 'passed' | 'exceeded'
  rateLimitRemaining?: number
}

export class RequestLogger {
  private supabase: ReturnType<typeof createClient>
  private enabled: boolean
  private hashIpAddresses: boolean = false // Default: don't hash IPs (can be configured via env)

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for logging

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[RequestLogger] Supabase credentials not configured. Logging disabled.')
      this.enabled = false
      this.supabase = null as any
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey)
      this.enabled = process.env.ENABLE_REQUEST_LOGGING !== 'false' // Default: enabled
      this.hashIpAddresses = process.env.HASH_IP_ADDRESSES === 'true' // Default: false
    }
  }

  /**
   * Log an API request (async, non-blocking)
   */
  async logRequest(data: RequestLogData): Promise<void> {
    if (!this.enabled) {
      return
    }

    try {
      // Hash IP address if privacy mode enabled
      const ipAddress = data.ipAddress && this.hashIpAddresses
        ? this.hashIpAddress(data.ipAddress)
        : data.ipAddress

      // Prepare log entry
      const logEntry = {
        request_id: data.requestId,
        user_id: data.userId || null,
        endpoint: data.endpoint,
        method: data.method,
        ip_address: ipAddress,
        user_agent: data.userAgent?.substring(0, 500) || null, // Limit user agent length
        image_count: data.imageCount || null,
        has_valid_jwt: data.hasValidJwt || false,
        auth_source: data.authSource || 'none',
        request_metadata: data.requestMetadata || null,
        response_status: data.responseStatus,
        processing_time_ms: data.processingTimeMs || null,
        error_code: data.errorCode || null,
        rate_limit_status: data.rateLimitStatus || null,
        rate_limit_remaining: data.rateLimitRemaining || null,
      }

      // Insert log entry (async, don't wait for response)
      const { error } = await (this.supabase
        .from('api_request_logs') as any)
        .insert(logEntry)

      if (error) {
        console.error('[RequestLogger] Failed to insert log:', error.message)
        // Don't throw - logging failures shouldn't break the API
      }
    } catch (error) {
      console.error('[RequestLogger] Logging error:', error)
      // Fail silently - don't disrupt the API request
    }
  }

  /**
   * Log a request with minimal data (for quick logging)
   */
  async logSimple(
    requestId: string,
    endpoint: string,
    method: string,
    responseStatus: number,
    userId?: string
  ): Promise<void> {
    return this.logRequest({
      requestId,
      endpoint,
      method,
      responseStatus,
      userId,
    })
  }

  /**
   * Get recent logs (admin function)
   */
  async getRecentLogs(
    limit: number = 50,
    offset: number = 0,
    filters?: {
      userId?: string
      endpoint?: string
      hasValidJwt?: boolean
      startDate?: Date
      endDate?: Date
    }
  ): Promise<{ data: any[]; count: number }> {
    if (!this.enabled) {
      return { data: [], count: 0 }
    }

    try {
      let query = (this.supabase
        .from('api_request_logs') as any)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Apply filters
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId)
      }
      if (filters?.endpoint) {
        query = query.eq('endpoint', filters.endpoint)
      }
      if (filters?.hasValidJwt !== undefined) {
        query = query.eq('has_valid_jwt', filters.hasValidJwt)
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString())
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString())
      }

      const { data, error, count } = await query

      if (error) {
        console.error('[RequestLogger] Failed to fetch logs:', error.message)
        return { data: [], count: 0 }
      }

      return { data: data || [], count: count || 0 }
    } catch (error) {
      console.error('[RequestLogger] Error fetching logs:', error)
      return { data: [], count: 0 }
    }
  }

  /**
   * Get JWT adoption statistics
   */
  async getJwtAdoptionStats(days: number = 7): Promise<{
    totalRequests: number
    authenticatedRequests: number
    jwtPercentage: number
  }> {
    if (!this.enabled) {
      return { totalRequests: 0, authenticatedRequests: 0, jwtPercentage: 0 }
    }

    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get total requests
      const { count: totalRequests } = await (this.supabase
        .from('api_request_logs') as any)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .eq('endpoint', '/api/mobile/exam-questions')

      // Get authenticated requests
      const { count: authenticatedRequests } = await (this.supabase
        .from('api_request_logs') as any)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .eq('endpoint', '/api/mobile/exam-questions')
        .eq('has_valid_jwt', true)

      const jwtPercentage = totalRequests
        ? Math.round((authenticatedRequests! / totalRequests!) * 100)
        : 0

      return {
        totalRequests: totalRequests || 0,
        authenticatedRequests: authenticatedRequests || 0,
        jwtPercentage,
      }
    } catch (error) {
      console.error('[RequestLogger] Error fetching JWT stats:', error)
      return { totalRequests: 0, authenticatedRequests: 0, jwtPercentage: 0 }
    }
  }

  /**
   * Get rate limit violation statistics
   */
  async getRateLimitViolations(days: number = 7): Promise<{
    totalAttempts: number
    violations: number
    violationRate: number
    topViolators: Array<{ userId: string; count: number }>
  }> {
    if (!this.enabled) {
      return { totalAttempts: 0, violations: 0, violationRate: 0, topViolators: [] }
    }

    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Get total attempts
      const { count: totalAttempts } = await (this.supabase
        .from('api_request_logs') as any)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .eq('endpoint', '/api/mobile/exam-questions')

      // Get violations
      const { count: violations } = await (this.supabase
        .from('api_request_logs') as any)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .eq('endpoint', '/api/mobile/exam-questions')
        .eq('rate_limit_status', 'exceeded')

      const violationRate = totalAttempts
        ? Math.round((violations! / totalAttempts!) * 100)
        : 0

      // Get top violators
      const { data: violatorData } = await (this.supabase
        .from('api_request_logs') as any)
        .select('user_id')
        .gte('created_at', startDate.toISOString())
        .eq('rate_limit_status', 'exceeded')
        .not('user_id', 'is', null)

      // Count violations per user
      const violatorCounts = new Map<string, number>()
      violatorData?.forEach((log: any) => {
        const count = violatorCounts.get(log.user_id) || 0
        violatorCounts.set(log.user_id, count + 1)
      })

      // Sort and get top 10
      const topViolators = Array.from(violatorCounts.entries())
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      return {
        totalAttempts: totalAttempts || 0,
        violations: violations || 0,
        violationRate,
        topViolators,
      }
    } catch (error) {
      console.error('[RequestLogger] Error fetching rate limit violations:', error)
      return { totalAttempts: 0, violations: 0, violationRate: 0, topViolators: [] }
    }
  }

  /**
   * Delete logs older than specified days
   */
  async deleteOldLogs(days: number = 30): Promise<number> {
    if (!this.enabled) {
      return 0
    }

    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const { error, count } = await (this.supabase
        .from('api_request_logs') as any)
        .delete({ count: 'exact' })
        .lt('created_at', cutoffDate.toISOString())

      if (error) {
        console.error('[RequestLogger] Failed to delete old logs:', error.message)
        return 0
      }

      console.log(`[RequestLogger] Deleted ${count} old log entries`)
      return count || 0
    } catch (error) {
      console.error('[RequestLogger] Error deleting old logs:', error)
      return 0
    }
  }

  /**
   * Hash IP address for privacy (simple hash)
   */
  private hashIpAddress(ip: string): string {
    // Simple hash for privacy - not cryptographically secure
    // For production, consider using crypto.createHash('sha256')
    let hash = 0
    for (let i = 0; i < ip.length; i++) {
      const char = ip.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return `hashed_${Math.abs(hash).toString(16)}`
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }
}

// Singleton instance
let requestLoggerInstance: RequestLogger | null = null

/**
 * Get the singleton request logger instance
 */
export function getRequestLogger(): RequestLogger {
  if (!requestLoggerInstance) {
    requestLoggerInstance = new RequestLogger()
    console.log(`[RequestLogger] Initialized (enabled: ${requestLoggerInstance.isEnabled()})`)
  }

  return requestLoggerInstance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetRequestLogger(): void {
  requestLoggerInstance = null
}
