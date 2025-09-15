/**
 * Audit Logging System
 * Comprehensive logging for security-sensitive operations
 */

import { globalCache } from '../utils/cache-manager'

export interface AuditEvent {
  id: string
  timestamp: Date
  userId?: string
  sessionId?: string
  action: string
  resource: string
  outcome: 'success' | 'failure' | 'blocked'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  details: {
    method?: string
    endpoint?: string
    ip?: string
    userAgent?: string
    statusCode?: number
    errorMessage?: string
    additionalData?: Record<string, any>
  }
  metadata: {
    version: string
    environment: string
    service: string
  }
}

export interface SecurityThreat {
  type: 'brute_force' | 'injection' | 'xss' | 'csrf' | 'rate_limit' | 'suspicious_activity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  indicators: string[]
  mitigationActions: string[]
}

export interface AuditQuery {
  userId?: string
  action?: string
  resource?: string
  riskLevel?: string[]
  outcome?: string[]
  startTime?: Date
  endTime?: Date
  limit?: number
  offset?: number
}

/**
 * Audit Logger with security threat detection
 */
export class AuditLogger {
  private static instance: AuditLogger
  private auditEvents: AuditEvent[] = []
  private securityThreats: SecurityThreat[] = []
  private maxEvents = 10000 // Keep last 10k events in memory
  private alertThresholds = {
    failedLogins: 5,
    timeWindow: 300000, // 5 minutes
    rateLimitViolations: 10,
    suspiciousPatterns: 3
  }

  private constructor() {
    // Start periodic cleanup and threat analysis
    this.startBackgroundTasks()
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
    }
    return AuditLogger.instance
  }

  /**
   * Log an audit event
   */
  log(event: Omit<AuditEvent, 'id' | 'timestamp' | 'metadata'>): void {
    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event,
      metadata: {
        version: '1.0',
        environment: process.env.NODE_ENV || 'development',
        service: 'gemini-ocr-api'
      }
    }

    // Add to memory storage
    this.auditEvents.push(auditEvent)

    // Trim old events
    if (this.auditEvents.length > this.maxEvents) {
      this.auditEvents = this.auditEvents.slice(-this.maxEvents)
    }

    // Also cache recent events for quick access
    globalCache.set(
      `audit:recent:${auditEvent.id}`,
      auditEvent,
      300000 // 5 minutes
    )

    // Analyze for security threats
    this.analyzeSecurityThreats(auditEvent)

    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 [AUDIT] ${this.formatAuditEvent(auditEvent)}`)
    }

    // In production, you would also:
    // 1. Send to external logging service (ELK, Splunk, etc.)
    // 2. Store in database for long-term retention
    // 3. Send alerts for critical events
  }

  /**
   * Log authentication events
   */
  logAuth(action: 'login' | 'logout' | 'refresh' | 'failed_login' | 'account_locked', details: {
    userId?: string
    sessionId?: string
    ip?: string
    userAgent?: string
    errorMessage?: string
  }): void {
    this.log({
      action,
      resource: 'authentication',
      outcome: action.includes('failed') || action.includes('locked') ? 'failure' : 'success',
      riskLevel: action.includes('failed') || action.includes('locked') ? 'medium' : 'low',
      userId: details.userId,
      sessionId: details.sessionId,
      details: {
        ip: details.ip,
        userAgent: details.userAgent,
        errorMessage: details.errorMessage
      }
    })
  }

  /**
   * Log data access events
   */
  logDataAccess(action: 'read' | 'create' | 'update' | 'delete', resource: string, details: {
    userId?: string
    recordId?: string
    ip?: string
    success: boolean
    sensitiveData?: boolean
  }): void {
    this.log({
      action: `data_${action}`,
      resource,
      outcome: details.success ? 'success' : 'failure',
      riskLevel: details.sensitiveData ? 'high' : 'low',
      userId: details.userId,
      details: {
        ip: details.ip,
        additionalData: {
          recordId: details.recordId,
          sensitiveData: details.sensitiveData
        }
      }
    })
  }

  /**
   * Log security events
   */
  logSecurity(threat: SecurityThreat['type'], details: {
    userId?: string
    ip?: string
    endpoint?: string
    description: string
    blocked: boolean
    additionalData?: Record<string, any>
  }): void {
    const riskLevel = this.getThreatRiskLevel(threat)
    
    this.log({
      action: `security_${threat}`,
      resource: 'security',
      outcome: details.blocked ? 'blocked' : 'failure',
      riskLevel,
      userId: details.userId,
      details: {
        ip: details.ip,
        endpoint: details.endpoint,
        errorMessage: details.description,
        additionalData: details.additionalData
      }
    })

    // Also track as a security threat
    this.recordSecurityThreat(threat, {
      severity: riskLevel === 'critical' ? 'critical' : 
                riskLevel === 'high' ? 'high' : 
                riskLevel === 'medium' ? 'medium' : 'low',
      description: details.description,
      indicators: [
        details.ip ? `IP: ${details.ip}` : '',
        details.endpoint ? `Endpoint: ${details.endpoint}` : '',
        details.userId ? `User: ${details.userId}` : ''
      ].filter(Boolean),
      mitigationActions: details.blocked ? ['Request blocked'] : ['Logged for analysis']
    })
  }

  /**
   * Query audit events
   */
  query(query: AuditQuery): AuditEvent[] {
    let filteredEvents = this.auditEvents

    if (query.userId) {
      filteredEvents = filteredEvents.filter(e => e.userId === query.userId)
    }

    if (query.action) {
      filteredEvents = filteredEvents.filter(e => e.action.includes(query.action!))
    }

    if (query.resource) {
      filteredEvents = filteredEvents.filter(e => e.resource === query.resource)
    }

    if (query.riskLevel) {
      filteredEvents = filteredEvents.filter(e => query.riskLevel!.includes(e.riskLevel))
    }

    if (query.outcome) {
      filteredEvents = filteredEvents.filter(e => query.outcome!.includes(e.outcome))
    }

    if (query.startTime) {
      filteredEvents = filteredEvents.filter(e => e.timestamp >= query.startTime!)
    }

    if (query.endTime) {
      filteredEvents = filteredEvents.filter(e => e.timestamp <= query.endTime!)
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Apply pagination
    const offset = query.offset || 0
    const limit = query.limit || 100

    return filteredEvents.slice(offset, offset + limit)
  }

  /**
   * Get security threats
   */
  getSecurityThreats(): SecurityThreat[] {
    return this.securityThreats.slice(0, 100) // Last 100 threats
  }

  /**
   * Generate security report
   */
  generateSecurityReport(timeRange: { start: Date; end: Date }): {
    summary: {
      totalEvents: number
      highRiskEvents: number
      securityThreats: number
      failedLogins: number
      blockedRequests: number
    }
    threats: SecurityThreat[]
    recentEvents: AuditEvent[]
    recommendations: string[]
  } {
    const events = this.query({
      startTime: timeRange.start,
      endTime: timeRange.end,
      limit: 1000
    })

    const highRiskEvents = events.filter(e => ['high', 'critical'].includes(e.riskLevel))
    const failedLogins = events.filter(e => e.action.includes('failed_login'))
    const blockedRequests = events.filter(e => e.outcome === 'blocked')
    const threats = this.securityThreats.filter(t => 
      t.type && events.some(e => e.action.includes(t.type))
    )

    const recommendations = this.generateRecommendations(events, threats)

    return {
      summary: {
        totalEvents: events.length,
        highRiskEvents: highRiskEvents.length,
        securityThreats: threats.length,
        failedLogins: failedLogins.length,
        blockedRequests: blockedRequests.length
      },
      threats: threats.slice(0, 20), // Top 20 threats
      recentEvents: events.slice(0, 50), // Last 50 events
      recommendations
    }
  }

  /**
   * Analyze events for security threats
   */
  private analyzeSecurityThreats(event: AuditEvent): void {
    const now = Date.now()
    const windowStart = now - this.alertThresholds.timeWindow

    // Check for brute force attacks
    if (event.action.includes('failed_login')) {
      const recentFailures = this.auditEvents.filter(e => 
        e.action.includes('failed_login') &&
        e.details.ip === event.details.ip &&
        e.timestamp.getTime() > windowStart
      )

      if (recentFailures.length >= this.alertThresholds.failedLogins) {
        this.recordSecurityThreat('brute_force', {
          severity: 'high',
          description: `${recentFailures.length} failed login attempts from ${event.details.ip}`,
          indicators: [`IP: ${event.details.ip}`, `Attempts: ${recentFailures.length}`],
          mitigationActions: ['Consider IP blocking', 'Enable account lockout']
        })
      }
    }

    // Check for rate limit violations
    if (event.action.includes('rate_limit')) {
      const recentViolations = this.auditEvents.filter(e => 
        e.action.includes('rate_limit') &&
        e.details.ip === event.details.ip &&
        e.timestamp.getTime() > windowStart
      )

      if (recentViolations.length >= this.alertThresholds.rateLimitViolations) {
        this.recordSecurityThreat('rate_limit', {
          severity: 'medium',
          description: `Multiple rate limit violations from ${event.details.ip}`,
          indicators: [`IP: ${event.details.ip}`, `Violations: ${recentViolations.length}`],
          mitigationActions: ['IP blocking applied', 'Monitor for continued activity']
        })
      }
    }

    // Check for suspicious patterns
    if (event.riskLevel === 'high' || event.riskLevel === 'critical') {
      const suspiciousEvents = this.auditEvents.filter(e => 
        ['high', 'critical'].includes(e.riskLevel) &&
        (e.details.ip === event.details.ip || e.userId === event.userId) &&
        e.timestamp.getTime() > windowStart
      )

      if (suspiciousEvents.length >= this.alertThresholds.suspiciousPatterns) {
        this.recordSecurityThreat('suspicious_activity', {
          severity: 'high',
          description: `Suspicious activity pattern detected`,
          indicators: [
            event.details.ip ? `IP: ${event.details.ip}` : '',
            event.userId ? `User: ${event.userId}` : '',
            `High-risk events: ${suspiciousEvents.length}`
          ].filter(Boolean),
          mitigationActions: ['Enhanced monitoring', 'Consider account review']
        })
      }
    }
  }

  /**
   * Record a security threat
   */
  private recordSecurityThreat(type: SecurityThreat['type'], threat: Omit<SecurityThreat, 'type'>): void {
    this.securityThreats.unshift({
      type,
      ...threat
    })

    // Keep only recent threats
    if (this.securityThreats.length > 1000) {
      this.securityThreats = this.securityThreats.slice(0, 1000)
    }

    // Log critical threats to console
    if (threat.severity === 'critical') {
      console.error(`🚨 [SECURITY ALERT] ${type}: ${threat.description}`)
    }
  }

  /**
   * Get risk level for threat type
   */
  private getThreatRiskLevel(threat: SecurityThreat['type']): AuditEvent['riskLevel'] {
    const riskLevels: Record<SecurityThreat['type'], AuditEvent['riskLevel']> = {
      brute_force: 'high',
      injection: 'critical',
      xss: 'high',
      csrf: 'medium',
      rate_limit: 'medium',
      suspicious_activity: 'high'
    }

    return riskLevels[threat] || 'medium'
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(events: AuditEvent[], threats: SecurityThreat[]): string[] {
    const recommendations: string[] = []

    const failedLogins = events.filter(e => e.action.includes('failed_login')).length
    if (failedLogins > 10) {
      recommendations.push('Consider implementing account lockout policies')
      recommendations.push('Enable CAPTCHA for repeated failed login attempts')
    }

    const injectionAttempts = threats.filter(t => t.type === 'injection').length
    if (injectionAttempts > 0) {
      recommendations.push('Review input validation and sanitization')
      recommendations.push('Consider implementing Web Application Firewall (WAF)')
    }

    const rateLimitViolations = events.filter(e => e.action.includes('rate_limit')).length
    if (rateLimitViolations > 20) {
      recommendations.push('Review rate limiting policies')
      recommendations.push('Consider implementing progressive delays')
    }

    const criticalEvents = events.filter(e => e.riskLevel === 'critical').length
    if (criticalEvents > 0) {
      recommendations.push('Immediate review of critical security events required')
      recommendations.push('Consider increasing monitoring and alerting frequency')
    }

    return recommendations
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Format audit event for console output
   */
  private formatAuditEvent(event: AuditEvent): string {
    const riskEmoji = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    }

    const outcomeEmoji = {
      success: '✅',
      failure: '❌',
      blocked: '🛡️'
    }

    return `${riskEmoji[event.riskLevel]} ${outcomeEmoji[event.outcome]} ${event.action} on ${event.resource} ${event.userId ? `by ${event.userId}` : ''} ${event.details.ip ? `from ${event.details.ip}` : ''}`
  }

  /**
   * Start background tasks
   */
  private startBackgroundTasks(): void {
    // Cleanup old events every hour
    setInterval(() => {
      const cutoff = Date.now() - (24 * 60 * 60 * 1000) // 24 hours
      this.auditEvents = this.auditEvents.filter(e => e.timestamp.getTime() > cutoff)
    }, 60 * 60 * 1000) // 1 hour

    // Generate periodic security reports (every 6 hours in production)
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => {
        const report = this.generateSecurityReport({
          start: new Date(Date.now() - (6 * 60 * 60 * 1000)), // Last 6 hours
          end: new Date()
        })

        if (report.summary.highRiskEvents > 0 || report.threats.length > 0) {
          console.warn('🔍 [SECURITY REPORT] High-risk events or threats detected', {
            summary: report.summary,
            threatCount: report.threats.length
          })
        }
      }, 6 * 60 * 60 * 1000) // 6 hours
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance()

/**
 * Convenience functions for common audit operations
 */
export const AuditHelpers = {
  logSuccess: (action: string, resource: string, userId?: string, details?: Record<string, any>) => {
    auditLogger.log({
      action,
      resource,
      outcome: 'success',
      riskLevel: 'low',
      userId,
      details: details || {}
    })
  },

  logFailure: (action: string, resource: string, error: string, userId?: string, details?: Record<string, any>) => {
    auditLogger.log({
      action,
      resource,
      outcome: 'failure',
      riskLevel: 'medium',
      userId,
      details: {
        errorMessage: error,
        ...details
      }
    })
  },

  logSecurityEvent: (threat: SecurityThreat['type'], description: string, ip?: string, userId?: string, blocked = false) => {
    auditLogger.logSecurity(threat, {
      userId,
      ip,
      description,
      blocked
    })
  }
}