import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export interface AuthContext {
  user: {
    id: string
    email: string
    user_metadata?: any
  }
  supabase: any
}

export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // Create Supabase client for user verification
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Create context with user info and supabase client
    const context: AuthContext = {
      user: {
        id: user.id,
        email: user.email || '',
        user_metadata: user.user_metadata
      },
      supabase
    }

    // Call the handler with the authenticated context
    return await handler(request, context)

  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
  }
}

// Utility function for API routes that don't need authentication
export async function withOptionalAuth(
  request: NextRequest,
  handler: (request: NextRequest, context: Partial<AuthContext>) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth provided, call handler with empty context
      return await handler(request, {})
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      // Invalid auth, call handler with empty context
      return await handler(request, {})
    }

    const context: AuthContext = {
      user: {
        id: user.id,
        email: user.email || '',
        user_metadata: user.user_metadata
      },
      supabase
    }

    return await handler(request, context)

  } catch (error) {
    console.error('Optional authentication error:', error)
    // On error, proceed without auth
    return await handler(request, {})
  }
}

// Helper function to get user from Supabase client (for use in API routes)
export async function getUserFromSupabase(supabaseClient: any) {
  const { data: { user }, error } = await supabaseClient.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  return user
}