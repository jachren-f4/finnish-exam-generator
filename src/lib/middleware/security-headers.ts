/**
 * Security Headers Middleware
 * Comprehensive security headers and CORS configuration
 */

import { NextRequest, NextResponse } from 'next/server'

export interface SecurityConfig {
  csp?: {
    enabled?: boolean
    directives?: Record<string, string | string[]>
    reportOnly?: boolean
  }
  hsts?: {
    enabled?: boolean
    maxAge?: number
    includeSubDomains?: boolean
    preload?: boolean
  }
  cors?: {
    origins?: string | string[]
    methods?: string[]
    headers?: string[]
    credentials?: boolean
    maxAge?: number
  }
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM'
  contentTypeOptions?: boolean
  referrerPolicy?: string
  permissionsPolicy?: Record<string, string[]>
  expectCt?: {
    enabled?: boolean
    maxAge?: number
    enforce?: boolean
    reportUri?: string
  }
  crossOriginEmbedderPolicy?: boolean
  crossOriginOpenerPolicy?: boolean
  crossOriginResourcePolicy?: 'same-site' | 'same-origin' | 'cross-origin'
}

/**
 * Content Security Policy builder
 */
export class CSPBuilder {
  private directives: Record<string, string[]> = {}

  /**
   * Set a CSP directive
   */
  directive(name: string, values: string | string[]): this {
    this.directives[name] = Array.isArray(values) ? values : [values]
    return this
  }

  /**
   * Add common secure defaults
   */
  secureDefaults(): this {
    return this
      .directive('default-src', ["'self'"])
      .directive('script-src', ["'self'", "'unsafe-inline'"])
      .directive('style-src', ["'self'", "'unsafe-inline'"])
      .directive('img-src', ["'self'", 'data:', 'https:'])
      .directive('connect-src', ["'self'"])
      .directive('font-src', ["'self'"])
      .directive('object-src', ["'none'"])
      .directive('media-src', ["'self'"])
      .directive('frame-src', ["'none'"])
      .directive('child-src', ["'none'"])
      .directive('worker-src', ["'self'"])
      .directive('base-uri', ["'self'"])
      .directive('form-action', ["'self'"])
      .directive('frame-ancestors', ["'none'"])
      .directive('block-all-mixed-content', [])
      .directive('upgrade-insecure-requests', [])
  }

  /**
   * Allow inline styles (less secure, use sparingly)
   */
  allowInlineStyles(): this {
    const current = this.directives['style-src'] || ["'self'"]
    if (!current.includes("'unsafe-inline'")) {
      current.push("'unsafe-inline'")
      this.directives['style-src'] = current
    }
    return this
  }

  /**
   * Allow inline scripts (less secure, use sparingly)
   */
  allowInlineScripts(): this {
    const current = this.directives['script-src'] || ["'self'"]
    if (!current.includes("'unsafe-inline'")) {
      current.push("'unsafe-inline'")
      this.directives['script-src'] = current
    }
    return this
  }

  /**
   * Add external domains for specific resource types
   */
  allowDomain(directive: string, domain: string): this {
    const current = this.directives[directive] || ["'self'"]
    if (!current.includes(domain)) {
      current.push(domain)
      this.directives[directive] = current
    }
    return this
  }

  /**
   * Build CSP header value
   */
  build(): string {
    return Object.entries(this.directives)
      .map(([directive, values]) => {
        if (values.length === 0) {
          return directive
        }
        return `${directive} ${values.join(' ')}`
      })
      .join('; ')
  }
}

/**
 * CORS configuration helper
 */
export class CORSConfig {
  private config: Required<SecurityConfig['cors']> = {
    origins: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false,
    maxAge: 86400 // 24 hours
  }

  /**
   * Set allowed origins
   */
  origins(origins: string | string[]): this {
    if (this.config) {
      this.config.origins = origins
    }
    return this
  }

  /**
   * Set allowed methods
   */
  methods(methods: string[]): this {
    if (this.config) {
      this.config.methods = methods
    }
    return this
  }

  /**
   * Set allowed headers
   */
  headers(headers: string[]): this {
    if (this.config) {
      this.config.headers = headers
    }
    return this
  }

  /**
   * Enable credentials
   */
  withCredentials(): this {
    if (this.config) {
      this.config.credentials = true
    }
    return this
  }

  /**
   * Set preflight cache duration
   */
  maxAge(seconds: number): this {
    if (this.config) {
      this.config.maxAge = seconds
    }
    return this
  }

  /**
   * Apply CORS headers to response
   */
  applyHeaders(response: NextResponse, request: NextRequest): void {
    if (!this.config) return

    const origin = request.headers.get('origin')

    // Handle origin
    if (this.config.origins === '*') {
      response.headers.set('Access-Control-Allow-Origin', '*')
    } else if (typeof this.config.origins === 'string') {
      if (origin === this.config.origins) {
        response.headers.set('Access-Control-Allow-Origin', origin)
      }
    } else if (Array.isArray(this.config.origins)) {
      if (origin && this.config.origins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin)
      }
    }

    // Handle methods
    response.headers.set('Access-Control-Allow-Methods', this.config.methods.join(', '))

    // Handle headers
    response.headers.set('Access-Control-Allow-Headers', this.config.headers.join(', '))

    // Handle credentials
    if (this.config.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }

    // Handle preflight cache
    response.headers.set('Access-Control-Max-Age', this.config.maxAge.toString())
  }
}


/**
 * Security headers middleware
 */
export function withSecurityHeaders<T extends any[]>(
  config: SecurityConfig
) {
  return (handler: (request: NextRequest, ...args: T) => Promise<NextResponse>) => {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      // Handle preflight requests
    if (request.method === 'OPTIONS' && config.cors) {
      const response = new NextResponse(null, { status: 200 })
      const corsConfig = new CORSConfig()
      
      if (config.cors.origins) {
        corsConfig.origins(config.cors.origins)
      }
      if (config.cors.methods) {
        corsConfig.methods(config.cors.methods)
      }
      if (config.cors.headers) {
        corsConfig.headers(config.cors.headers)
      }
      if (config.cors.credentials) {
        corsConfig.withCredentials()
      }
      if (config.cors.maxAge) {
        corsConfig.maxAge(config.cors.maxAge)
      }
      
      corsConfig.applyHeaders(response, request)
      applySecurityHeaders(response, config)
      
      return response
    }

    // Execute the handler
    const response = await handler(request, ...args)

    // Apply CORS headers
    if (config.cors) {
      const corsConfig = new CORSConfig()
      
      if (config.cors.origins) {
        corsConfig.origins(config.cors.origins)
      }
      if (config.cors.methods) {
        corsConfig.methods(config.cors.methods)
      }
      if (config.cors.headers) {
        corsConfig.headers(config.cors.headers)
      }
      if (config.cors.credentials) {
        corsConfig.withCredentials()
      }
      if (config.cors.maxAge) {
        corsConfig.maxAge(config.cors.maxAge)
      }
      
      corsConfig.applyHeaders(response, request)
    }

    // Apply security headers
    applySecurityHeaders(response, config)

    return response
  }
}

/**
 * Apply security headers to response
 */
function applySecurityHeaders(response: NextResponse, config: SecurityConfig): void {
  // Content Security Policy
  if (config.csp?.enabled !== false) {
    const cspBuilder = new CSPBuilder()
    
    if (config.csp?.directives) {
      Object.entries(config.csp.directives).forEach(([directive, values]) => {
        cspBuilder.directive(directive, values)
      })
    } else {
      cspBuilder.secureDefaults()
    }
    
    const headerName = config.csp?.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy'
    response.headers.set(headerName, cspBuilder.build())
  }

  // HTTP Strict Transport Security
  if (config.hsts?.enabled !== false) {
    const maxAge = config.hsts?.maxAge || 31536000 // 1 year
    const includeSubDomains = config.hsts?.includeSubDomains !== false
    const preload = config.hsts?.preload === true
    
    let hstsValue = `max-age=${maxAge}`
    if (includeSubDomains) hstsValue += '; includeSubDomains'
    if (preload) hstsValue += '; preload'
    
    response.headers.set('Strict-Transport-Security', hstsValue)
  }

  // X-Frame-Options
  if (config.frameOptions) {
    response.headers.set('X-Frame-Options', config.frameOptions)
  } else {
    response.headers.set('X-Frame-Options', 'DENY')
  }

  // X-Content-Type-Options
  if (config.contentTypeOptions !== false) {
    response.headers.set('X-Content-Type-Options', 'nosniff')
  }

  // Referrer Policy
  const referrerPolicy = config.referrerPolicy || 'strict-origin-when-cross-origin'
  response.headers.set('Referrer-Policy', referrerPolicy)

  // Permissions Policy
  if (config.permissionsPolicy) {
    const permissionsPolicy = Object.entries(config.permissionsPolicy)
      .map(([directive, allowlist]) => `${directive}=(${allowlist.join(' ')})`)
      .join(', ')
    response.headers.set('Permissions-Policy', permissionsPolicy)
  }

  // Expect-CT
  if (config.expectCt?.enabled) {
    let expectCtValue = `max-age=${config.expectCt.maxAge || 86400}`
    if (config.expectCt.enforce) expectCtValue += ', enforce'
    if (config.expectCt.reportUri) expectCtValue += `, report-uri="${config.expectCt.reportUri}"`
    
    response.headers.set('Expect-CT', expectCtValue)
  }

  // Cross-Origin-Embedder-Policy
  if (config.crossOriginEmbedderPolicy) {
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
  }

  // Cross-Origin-Opener-Policy
  if (config.crossOriginOpenerPolicy) {
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  }

  // Cross-Origin-Resource-Policy
  if (config.crossOriginResourcePolicy) {
    response.headers.set('Cross-Origin-Resource-Policy', config.crossOriginResourcePolicy)
  }

  // Additional security headers
  response.headers.set('X-Powered-By', 'GeminiOCR/1.0')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  response.headers.set('X-XSS-Protection', '1; mode=block')
}
}

/**
 * Pre-configured security profiles
 */
export const SecurityProfiles = {
  // Strict security for API endpoints
  strict: {
    csp: {
      enabled: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'none'"],
        'style-src': ["'none'"],
        'img-src': ["'none'"],
        'connect-src': ["'self'"],
        'font-src': ["'none'"],
        'object-src': ["'none'"],
        'media-src': ["'none'"],
        'frame-src': ["'none'"],
        'child-src': ["'none'"],
        'worker-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'none'"],
        'frame-ancestors': ["'none'"],
        'block-all-mixed-content': [],
        'upgrade-insecure-requests': []
      }
    },
    hsts: {
      enabled: true,
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    frameOptions: 'DENY' as const,
    contentTypeOptions: true,
    referrerPolicy: 'no-referrer',
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: 'same-origin' as const
  },

  // Balanced security for web applications
  balanced: {
    csp: {
      enabled: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'"],
        'font-src': ["'self'"],
        'object-src': ["'none'"],
        'frame-ancestors': ["'self'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"]
      }
    },
    hsts: {
      enabled: true,
      maxAge: 31536000,
      includeSubDomains: true
    },
    frameOptions: 'SAMEORIGIN' as const,
    contentTypeOptions: true,
    referrerPolicy: 'strict-origin-when-cross-origin'
  },

  // Permissive for development
  development: {
    csp: { enabled: false },
    hsts: { enabled: false },
    frameOptions: 'SAMEORIGIN' as const,
    contentTypeOptions: true,
    cors: {
      origins: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
      credentials: true
    }
  }
} as const satisfies Record<string, SecurityConfig>

/**
 * Quick setup for common API CORS
 */
export const apiCors = (origins: string[] = ['*']) => withSecurityHeaders({
  cors: {
    origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
  },
  ...SecurityProfiles.balanced
})

/**
 * Quick setup for strict API security
 */
export const secureAPI = () => withSecurityHeaders(SecurityProfiles.strict)