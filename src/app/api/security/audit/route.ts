/**
 * Security Audit API Endpoint
 * Provides access to audit logs and security reports
 */

import { NextRequest } from 'next/server'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { auditLogger } from '@/lib/security/audit-logger'
import { withAuth } from '@/lib/middleware/auth-middleware'
import { withSecurityHeaders, SecurityProfiles } from '@/lib/middleware/security-headers'
import { withEnhancedRateLimit, rateLimitConfigs } from '@/lib/middleware/enhanced-rate-limiter'

async function auditHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'query'

    switch (action) {
      case 'query': {
        const userId = searchParams.get('userId') || undefined
        const resource = searchParams.get('resource') || undefined
        const riskLevel = searchParams.get('riskLevel')?.split(',') || undefined
        const outcome = searchParams.get('outcome')?.split(',') || undefined
        const limit = parseInt(searchParams.get('limit') || '100')
        const offset = parseInt(searchParams.get('offset') || '0')
        
        const startTime = searchParams.get('startTime') 
          ? new Date(searchParams.get('startTime')!) 
          : undefined
        const endTime = searchParams.get('endTime') 
          ? new Date(searchParams.get('endTime')!) 
          : undefined

        const events = auditLogger.query({
          userId,
          resource,
          riskLevel,
          outcome,
          startTime,
          endTime,
          limit,
          offset
        })

        return ApiResponseBuilder.success({
          events,
          pagination: {
            limit,
            offset,
            count: events.length
          }
        })
      }

      case 'threats': {
        const threats = auditLogger.getSecurityThreats()
        return ApiResponseBuilder.success({ threats })
      }

      case 'report': {
        const hoursStr = searchParams.get('hours') || '24'
        const hours = parseInt(hoursStr)
        
        const endTime = new Date()
        const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000))

        const report = auditLogger.generateSecurityReport({ start: startTime, end: endTime })
        
        return ApiResponseBuilder.success({
          ...report,
          timeRange: {
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            hours
          }
        })
      }

      case 'summary': {
        const hoursStr = searchParams.get('hours') || '1'
        const hours = parseInt(hoursStr)
        
        const endTime = new Date()
        const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000))

        const events = auditLogger.query({
          startTime,
          endTime,
          limit: 10000
        })

        const summary = {
          timeRange: { start: startTime, end: endTime, hours },
          totalEvents: events.length,
          eventsByRisk: {
            low: events.filter(e => e.riskLevel === 'low').length,
            medium: events.filter(e => e.riskLevel === 'medium').length,
            high: events.filter(e => e.riskLevel === 'high').length,
            critical: events.filter(e => e.riskLevel === 'critical').length
          },
          eventsByOutcome: {
            success: events.filter(e => e.outcome === 'success').length,
            failure: events.filter(e => e.outcome === 'failure').length,
            blocked: events.filter(e => e.outcome === 'blocked').length
          },
          topActions: getTopActions(events),
          topResources: getTopResources(events),
          recentHighRisk: events
            .filter(e => ['high', 'critical'].includes(e.riskLevel))
            .slice(0, 10)
        }

        return ApiResponseBuilder.success(summary)
      }

      default:
        return ApiResponseBuilder.validationError(
          'Invalid action',
          'Supported actions: query, threats, report, summary'
        )
    }

  } catch (error) {
    console.error('Error in audit endpoint:', error)
    return ApiResponseBuilder.internalError(
      'Audit endpoint error',
      'Unable to process audit request'
    )
  }
}

/**
 * Get top actions by frequency
 */
function getTopActions(events: any[]): Array<{ action: string; count: number }> {
  const actionCounts = events.reduce((acc, event) => {
    acc[event.action] = (acc[event.action] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return Object.entries(actionCounts)
    .map(([action, count]): { action: string; count: number } => ({ action, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

/**
 * Get top resources by frequency
 */
function getTopResources(events: any[]): Array<{ resource: string; count: number }> {
  const resourceCounts = events.reduce((acc, event) => {
    acc[event.resource] = (acc[event.resource] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return Object.entries(resourceCounts)
    .map(([resource, count]): { resource: string; count: number } => ({ resource, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

// Export with authentication (admin only), security headers, and rate limiting
export const GET = withSecurityHeaders({
  ...SecurityProfiles.strict,
  cors: {
    origins: ['https://admin.gemini-ocr.com'], // Restrict to admin interface
    methods: ['GET', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization'],
    credentials: true
  }
})(withAuth(withEnhancedRateLimit(rateLimitConfigs.expensive, auditHandler)))

// Handle CORS for audit endpoint
export async function OPTIONS(_request: NextRequest) {
  return ApiResponseBuilder.cors(
    ['GET', 'OPTIONS'],
    ['Content-Type', 'Authorization'],
    'https://admin.gemini-ocr.com'
  )
}