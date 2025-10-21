import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Session Heartbeat Endpoint
 *
 * Tracks user sessions for analytics (DAU, retention, engagement)
 * Called when mobile app opens or web app loads
 *
 * POST /api/session/heartbeat
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extract user_id (accept both user_id and student_id for backward compat)
    const userId = body.user_id || body.student_id
    const platform = body.platform || 'web'
    const appVersion = body.app_version
    const deviceInfo = body.device_info

    // Validate user_id
    if (!userId) {
      return NextResponse.json(
        { error: 'user_id or student_id is required' },
        { status: 400 }
      )
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Heartbeat] Missing Supabase credentials')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if this is user's first session ever
    const { data: existingSessions, error: checkError } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (checkError) {
      console.error('[Heartbeat] Error checking existing sessions:', checkError)
      // Don't fail - just mark as not new user
    }

    const isNewUser = !existingSessions || existingSessions.length === 0

    // Check for active session (within last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    const { data: activeSession, error: activeError } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('user_id', userId)
      .gte('last_heartbeat', thirtyMinutesAgo)
      .order('last_heartbeat', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeError) {
      console.error('[Heartbeat] Error checking active session:', activeError)
    }

    let sessionId: string

    if (activeSession) {
      // Update existing session's last_heartbeat
      const { data: updated, error: updateError } = await supabase
        .from('user_sessions')
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('id', activeSession.id)
        .select('id')
        .single()

      if (updateError) {
        console.error('[Heartbeat] Error updating session:', updateError)
        return NextResponse.json(
          { error: 'Failed to update session' },
          { status: 500 }
        )
      }

      sessionId = updated.id
    } else {
      // Create new session
      const { data: newSession, error: insertError } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          is_new_user: isNewUser,
          platform,
          app_version: appVersion,
          device_info: deviceInfo,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('[Heartbeat] Error creating session:', insertError)
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500 }
        )
      }

      sessionId = newSession.id
    }

    return NextResponse.json({
      success: true,
      session_id: sessionId,
      is_new_user: isNewUser,
    })
  } catch (error) {
    console.error('[Heartbeat] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
