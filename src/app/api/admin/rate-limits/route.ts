import { NextRequest, NextResponse } from 'next/server'
import { getRateLimiter } from '@/lib/services/rate-limiter'
import { createClient } from '@supabase/supabase-js'

/**
 * Admin endpoint to view rate limit usage
 * Requires admin authentication (Supabase service role)
 *
 * GET /api/admin/rate-limits - View all users' rate limit status
 * GET /api/admin/rate-limits?user_id=xxx - View specific user's status
 * DELETE /api/admin/rate-limits?user_id=xxx - Reset specific user's limits
 */

/**
 * Verify admin access using Supabase service role key
 */
function verifyAdminAccess(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    return false
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.replace('Bearer ', '')

  // Check if token matches service role key
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    console.error('[Admin] SUPABASE_SERVICE_ROLE_KEY not configured')
    return false
  }

  return token === serviceRoleKey
}

/**
 * GET - View rate limit usage
 */
export async function GET(request: NextRequest) {
  // Verify admin access
  if (!verifyAdminAccess(request)) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        error_code: 'ADMIN_AUTH_REQUIRED',
        message: 'Admin access required. Provide service role key in Authorization header.'
      },
      { status: 401 }
    )
  }

  try {
    const rateLimiter = getRateLimiter()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    // Get specific user or all users
    if (userId) {
      // Get specific user's usage
      const usage = await rateLimiter.getUsage(userId)

      return NextResponse.json({
        user_id: userId,
        hourly: {
          used: usage.hourly,
          limit: usage.hourlyLimit,
          remaining: usage.hourlyLimit - usage.hourly
        },
        daily: {
          used: usage.daily,
          limit: usage.dailyLimit,
          remaining: usage.dailyLimit - usage.daily
        }
      })
    } else {
      // Get all users' usage
      const allUsage = await rateLimiter.getAllUsage()

      return NextResponse.json({
        total_users: allUsage.length,
        tracked_users: rateLimiter.getTrackedUsersCount(),
        users: allUsage.map(u => ({
          user_id: u.userId,
          hourly: {
            used: u.hourly,
            reset_at: u.hourlyResetAt.toISOString()
          },
          daily: {
            used: u.daily,
            reset_at: u.dailyResetAt.toISOString()
          }
        }))
      })
    }
  } catch (error) {
    console.error('[Admin] Rate limit query error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        error_code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Reset rate limits for a user
 */
export async function DELETE(request: NextRequest) {
  // Verify admin access
  if (!verifyAdminAccess(request)) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        error_code: 'ADMIN_AUTH_REQUIRED',
        message: 'Admin access required'
      },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Bad request',
          error_code: 'MISSING_USER_ID',
          message: 'user_id query parameter required'
        },
        { status: 400 }
      )
    }

    const rateLimiter = getRateLimiter()
    await rateLimiter.resetLimit(userId)

    console.log(`[Admin] Reset rate limits for user: ${userId}`)

    return NextResponse.json({
      success: true,
      message: `Rate limits reset for user ${userId}`,
      user_id: userId
    })
  } catch (error) {
    console.error('[Admin] Rate limit reset error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        error_code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
