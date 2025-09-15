/**
 * Test audit logging functionality
 */

import { NextRequest } from 'next/server'
import { ApiResponseBuilder } from '@/lib/utils/api-response'
import { auditLogger } from '@/lib/security/audit-logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, testType } = body

    if (action === 'log_test') {
      // Log a test event
      auditLogger.log({
        action: `test_${testType || 'general'}`,
        resource: 'test_endpoint',
        outcome: 'success',
        riskLevel: 'low',
        userId: 'test-user',
        details: {
          method: request.method,
          endpoint: '/api/test/audit',
          ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
          userAgent: request.headers.get('user-agent') || undefined,
          testData: body
        }
      })

      return ApiResponseBuilder.success({
        message: 'Test audit event logged',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'query_events') {
      const events = auditLogger.query({
        limit: 10,
        userId: 'test-user'
      })

      return ApiResponseBuilder.success({
        message: 'Recent audit events',
        events: events.map(e => ({
          id: e.id,
          action: e.action,
          resource: e.resource,
          outcome: e.outcome,
          riskLevel: e.riskLevel,
          timestamp: e.timestamp.toISOString()
        }))
      })
    }

    if (action === 'security_report') {
      const report = auditLogger.generateSecurityReport({
        start: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        end: new Date()
      })

      return ApiResponseBuilder.success({
        message: 'Security report generated',
        report: {
          summary: report.summary,
          threatCount: report.threats.length,
          recentEventCount: report.recentEvents.length,
          recommendations: report.recommendations
        }
      })
    }

    return ApiResponseBuilder.validationError('Invalid action', 'Supported actions: log_test, query_events, security_report')

  } catch (error) {
    return ApiResponseBuilder.internalError(
      'Audit test error',
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}