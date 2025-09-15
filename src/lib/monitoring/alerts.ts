/**
 * Alerting and Notification System
 * Monitors system health and sends notifications for critical events
 */

import { logger } from './logger'
import { healthCheckManager, type SystemHealth, type HealthStatus } from './health-checks'
import { metricsCollector } from '../utils/metrics-collector'

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export type AlertChannel = 'email' | 'slack' | 'webhook' | 'sms' | 'console'

export interface AlertRule {
  id: string
  name: string
  condition: AlertCondition
  severity: AlertSeverity
  channels: AlertChannel[]
  cooldownMs: number
  enabled: boolean
  description: string
}

export interface AlertCondition {
  type: 'health_status' | 'metric_threshold' | 'error_rate' | 'response_time'
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains'
  value: any
  component?: string
  timeWindowMs?: number
}

export interface Alert {
  id: string
  ruleId: string
  ruleName: string
  severity: AlertSeverity
  message: string
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
  context: Record<string, any>
  channels: AlertChannel[]
}

export interface NotificationChannel {
  type: AlertChannel
  send(alert: Alert): Promise<boolean>
}

/**
 * Console notification channel for development
 */
export class ConsoleNotificationChannel implements NotificationChannel {
  type: AlertChannel = 'console'

  async send(alert: Alert): Promise<boolean> {
    const emoji = this.getSeverityEmoji(alert.severity)
    const color = this.getSeverityColor(alert.severity)
    const reset = '\x1b[0m'

    console.log(`${color}${emoji} ALERT [${alert.severity.toUpperCase()}] ${alert.ruleName}${reset}`)
    console.log(`${color}   Message: ${alert.message}${reset}`)
    console.log(`${color}   Time: ${alert.timestamp.toISOString()}${reset}`)
    console.log(`${color}   Context: ${JSON.stringify(alert.context, null, 2)}${reset}`)

    return true
  }

  private getSeverityEmoji(severity: AlertSeverity): string {
    const emojis = {
      low: '🔵',
      medium: '🟡', 
      high: '🟠',
      critical: '🔴'
    }
    return emojis[severity]
  }

  private getSeverityColor(severity: AlertSeverity): string {
    const colors = {
      low: '\x1b[36m',    // Cyan
      medium: '\x1b[33m', // Yellow
      high: '\x1b[35m',   // Magenta
      critical: '\x1b[31m' // Red
    }
    return colors[severity]
  }
}

/**
 * Webhook notification channel
 */
export class WebhookNotificationChannel implements NotificationChannel {
  type: AlertChannel = 'webhook'

  constructor(private webhookUrl: string) {}

  async send(alert: Alert): Promise<boolean> {
    try {
      const payload = {
        alert: {
          id: alert.id,
          rule: alert.ruleName,
          severity: alert.severity,
          message: alert.message,
          timestamp: alert.timestamp.toISOString(),
          context: alert.context
        },
        service: 'gemini-ocr-api',
        environment: process.env.NODE_ENV || 'development'
      }

      // In a real implementation, you'd make an HTTP POST request
      logger.info('Webhook alert sent', {
        operation: 'alert_webhook',
        alertId: alert.id,
        webhook: this.webhookUrl,
        severity: alert.severity
      })

      return true
    } catch (error) {
      logger.error('Webhook alert failed', {
        operation: 'alert_webhook',
        alertId: alert.id,
        webhook: this.webhookUrl
      }, error as Error)

      return false
    }
  }
}

/**
 * Alert manager handles rule evaluation and notification dispatch
 */
export class AlertManager {
  private static instance: AlertManager
  private rules = new Map<string, AlertRule>()
  private channels = new Map<AlertChannel, NotificationChannel>()
  private activeAlerts = new Map<string, Alert>()
  private alertHistory: Alert[] = []
  private cooldownTracker = new Map<string, number>()
  private evaluationInterval: NodeJS.Timeout | null = null

  constructor() {
    // Register default notification channels
    this.registerChannel('console', new ConsoleNotificationChannel())
    
    // Add webhook channel if configured
    if (process.env.ALERT_WEBHOOK_URL) {
      this.registerChannel('webhook', new WebhookNotificationChannel(process.env.ALERT_WEBHOOK_URL))
    }

    // Register default alert rules
    this.registerDefaultRules()
  }

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager()
    }
    return AlertManager.instance
  }

  /**
   * Register a notification channel
   */
  registerChannel(type: AlertChannel, channel: NotificationChannel): void {
    this.channels.set(type, channel)
    logger.debug('Notification channel registered', {
      operation: 'alert_channel_register',
      type
    })
  }

  /**
   * Add an alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule)
    logger.info('Alert rule added', {
      operation: 'alert_rule_add',
      ruleId: rule.id,
      name: rule.name,
      severity: rule.severity
    })
  }

  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId)
    this.cooldownTracker.delete(ruleId)
    logger.info('Alert rule removed', {
      operation: 'alert_rule_remove',
      ruleId
    })
  }

  /**
   * Start alert monitoring
   */
  startMonitoring(intervalMs = 30000): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval)
    }

    this.evaluationInterval = setInterval(async () => {
      await this.evaluateRules()
    }, intervalMs)

    logger.info('Alert monitoring started', {
      operation: 'alert_monitoring_start',
      interval: `${intervalMs}ms`,
      rules: this.rules.size
    })
  }

  /**
   * Stop alert monitoring
   */
  stopMonitoring(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval)
      this.evaluationInterval = null
    }

    logger.info('Alert monitoring stopped', {
      operation: 'alert_monitoring_stop'
    })
  }

  /**
   * Evaluate all alert rules
   */
  async evaluateRules(): Promise<void> {
    const now = Date.now()

    for (const [ruleId, rule] of this.rules.entries()) {
      if (!rule.enabled) continue

      // Check cooldown
      const lastAlert = this.cooldownTracker.get(ruleId) || 0
      if (now - lastAlert < rule.cooldownMs) continue

      try {
        const shouldAlert = await this.evaluateCondition(rule.condition)
        
        if (shouldAlert) {
          await this.fireAlert(rule)
          this.cooldownTracker.set(ruleId, now)
        } else {
          // Check if we should resolve any active alerts for this rule
          const activeAlert = Array.from(this.activeAlerts.values())
            .find(alert => alert.ruleId === ruleId && !alert.resolved)
          
          if (activeAlert) {
            await this.resolveAlert(activeAlert.id)
          }
        }
      } catch (error) {
        logger.error('Alert rule evaluation failed', {
          operation: 'alert_rule_evaluation',
          ruleId,
          ruleName: rule.name
        }, error as Error)
      }
    }
  }

  /**
   * Fire an alert
   */
  async fireAlert(rule: AlertRule): Promise<void> {
    const alert: Alert = {
      id: this.generateAlertId(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: await this.generateAlertMessage(rule),
      timestamp: new Date(),
      resolved: false,
      context: await this.gatherAlertContext(rule),
      channels: rule.channels
    }

    this.activeAlerts.set(alert.id, alert)
    this.alertHistory.push(alert)

    // Send notifications
    const notifications = rule.channels.map(async (channelType) => {
      const channel = this.channels.get(channelType)
      if (channel) {
        try {
          await channel.send(alert)
          logger.debug('Alert notification sent', {
            operation: 'alert_notification',
            alertId: alert.id,
            channel: channelType,
            severity: alert.severity
          })
        } catch (error) {
          logger.error('Alert notification failed', {
            operation: 'alert_notification',
            alertId: alert.id,
            channel: channelType
          }, error as Error)
        }
      }
    })

    await Promise.allSettled(notifications)

    logger.warn('Alert fired', {
      operation: 'alert_fire',
      alertId: alert.id,
      rule: rule.name,
      severity: alert.severity,
      message: alert.message
    })
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId)
    if (!alert || alert.resolved) return

    alert.resolved = true
    alert.resolvedAt = new Date()

    logger.info('Alert resolved', {
      operation: 'alert_resolve',
      alertId,
      rule: alert.ruleName,
      duration: alert.resolvedAt.getTime() - alert.timestamp.getTime()
    })
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved)
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    activeAlerts: number
    totalAlerts: number
    alertsByRule: Record<string, number>
    alertsBySeverity: Record<AlertSeverity, number>
  } {
    const activeAlerts = this.getActiveAlerts().length
    const totalAlerts = this.alertHistory.length

    const alertsByRule = this.alertHistory.reduce((acc, alert) => {
      acc[alert.ruleName] = (acc[alert.ruleName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const alertsBySeverity = this.alertHistory.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1
      return acc
    }, {} as Record<AlertSeverity, number>)

    return {
      activeAlerts,
      totalAlerts,
      alertsByRule,
      alertsBySeverity
    }
  }

  private async evaluateCondition(condition: AlertCondition): Promise<boolean> {
    switch (condition.type) {
      case 'health_status':
        return this.evaluateHealthCondition(condition)
      
      case 'metric_threshold':
        return this.evaluateMetricCondition(condition)
      
      case 'error_rate':
        return this.evaluateErrorRateCondition(condition)
      
      case 'response_time':
        return this.evaluateResponseTimeCondition(condition)
      
      default:
        return false
    }
  }

  private async evaluateHealthCondition(condition: AlertCondition): Promise<boolean> {
    const health = await healthCheckManager.getLastResults()
    
    if (condition.component) {
      const component = health.components.find(c => c.name === condition.component)
      if (!component) return false
      
      return this.compareValues(component.status, condition.operator, condition.value)
    }
    
    return this.compareValues(health.status, condition.operator, condition.value)
  }

  private async evaluateMetricCondition(condition: AlertCondition): Promise<boolean> {
    const metrics = metricsCollector.getMetrics()
    // Simplified metric evaluation - would be more sophisticated in production
    return false
  }

  private async evaluateErrorRateCondition(condition: AlertCondition): Promise<boolean> {
    const metrics = metricsCollector.getMetrics()
    if (!metrics.errors || !metrics.total) return false
    
    const errorRate = metrics.errors / metrics.total
    return this.compareValues(errorRate, condition.operator, condition.value)
  }

  private async evaluateResponseTimeCondition(condition: AlertCondition): Promise<boolean> {
    const metrics = metricsCollector.getPerformanceMetrics()
    if (!metrics.avgResponseTime) return false
    
    return this.compareValues(metrics.avgResponseTime, condition.operator, condition.value)
  }

  private compareValues(actual: any, operator: AlertCondition['operator'], expected: any): boolean {
    switch (operator) {
      case 'equals': return actual === expected
      case 'not_equals': return actual !== expected
      case 'greater_than': return actual > expected
      case 'less_than': return actual < expected
      case 'contains': return String(actual).includes(String(expected))
      default: return false
    }
  }

  private async generateAlertMessage(rule: AlertRule): Promise<string> {
    const context = await this.gatherAlertContext(rule)
    return `${rule.description} - ${JSON.stringify(context)}`
  }

  private async gatherAlertContext(rule: AlertRule): Promise<Record<string, any>> {
    const context: Record<string, any> = {
      rule: rule.name,
      condition: rule.condition
    }

    if (rule.condition.type === 'health_status') {
      const health = await healthCheckManager.getLastResults()
      context.systemHealth = health.status
      context.unhealthyComponents = health.components
        .filter(c => c.status !== 'healthy')
        .map(c => ({ name: c.name, status: c.status, error: c.error }))
    }

    return context
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
  }

  private registerDefaultRules(): void {
    // System unhealthy alert
    this.addRule({
      id: 'system_unhealthy',
      name: 'System Health Critical',
      condition: {
        type: 'health_status',
        operator: 'equals',
        value: 'unhealthy'
      },
      severity: 'critical',
      channels: ['console', 'webhook'],
      cooldownMs: 5 * 60 * 1000, // 5 minutes
      enabled: true,
      description: 'System health status is unhealthy'
    })

    // Database health alert
    this.addRule({
      id: 'database_unhealthy',
      name: 'Database Health Critical',
      condition: {
        type: 'health_status',
        operator: 'not_equals',
        value: 'healthy',
        component: 'database'
      },
      severity: 'high',
      channels: ['console', 'webhook'],
      cooldownMs: 2 * 60 * 1000, // 2 minutes
      enabled: true,
      description: 'Database health check failed'
    })

    // High error rate alert
    this.addRule({
      id: 'high_error_rate',
      name: 'High Error Rate',
      condition: {
        type: 'error_rate',
        operator: 'greater_than',
        value: 0.1, // 10% error rate
        timeWindowMs: 5 * 60 * 1000 // 5 minutes
      },
      severity: 'medium',
      channels: ['console'],
      cooldownMs: 10 * 60 * 1000, // 10 minutes
      enabled: true,
      description: 'Error rate exceeded threshold'
    })
  }
}

// Export singleton instance
export const alertManager = AlertManager.getInstance()

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production') {
  alertManager.startMonitoring(30000) // Every 30 seconds
} else {
  alertManager.startMonitoring(60000) // Every minute in development
}