/**
 * Admin Authentication Utilities
 *
 * Simple Basic HTTP Auth for admin dashboard access
 * Credentials stored in environment variables (ADMIN_USERNAME, ADMIN_PASSWORD)
 */

export function checkBasicAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }

  try {
    const base64 = authHeader.slice(6) // Remove "Basic " prefix
    const decoded = Buffer.from(base64, 'base64').toString('utf-8')
    const [username, password] = decoded.split(':')

    const expectedUsername = process.env.ADMIN_USERNAME
    const expectedPassword = process.env.ADMIN_PASSWORD

    if (!expectedUsername || !expectedPassword) {
      console.error('[Admin Auth] Missing ADMIN_USERNAME or ADMIN_PASSWORD in environment')
      return false
    }

    return username === expectedUsername && password === expectedPassword
  } catch (error) {
    console.error('[Admin Auth] Error parsing authorization header:', error)
    return false
  }
}

export function requireAuth(request: Request): Response | null {
  if (!checkBasicAuth(request)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="ExamGenie Admin Dashboard"',
      },
    })
  }

  return null // Auth passed
}

/**
 * Higher-order function to wrap API routes with admin auth
 */
export function withAdminAuth<T extends Request = Request>(
  handler: (request: T) => Promise<Response>
): (request: T) => Promise<Response> {
  return async (request: T) => {
    const authError = requireAuth(request)
    if (authError) {
      return authError
    }

    return handler(request)
  }
}
