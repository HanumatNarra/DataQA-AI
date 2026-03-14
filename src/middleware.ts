import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { rateLimitMiddleware, RateLimitPresets, RateLimitConfig } from '@/lib/rateLimit'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Rate Limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Apply different rate limits based on endpoint
    let rateLimitConfig: RateLimitConfig = RateLimitPresets.moderate // Default: 30 req/min

    if (request.nextUrl.pathname.startsWith('/api/upload') ||
        request.nextUrl.pathname.startsWith('/api/process')) {
      rateLimitConfig = RateLimitPresets.upload // 5 req/5min for uploads
    } else if (request.nextUrl.pathname.startsWith('/api/search')) {
      rateLimitConfig = RateLimitPresets.search // 20 req/min for search
    } else if (request.nextUrl.pathname.startsWith('/api/plots')) {
      rateLimitConfig = RateLimitPresets.strict // 10 req/min for charts
    }

    const rateLimitResponse = rateLimitMiddleware(request, rateLimitConfig)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
  }

  // CSRF Protection: Verify Origin header for state-changing requests
  const statefulMethods = ['POST', 'PUT', 'DELETE', 'PATCH']
  if (statefulMethods.includes(request.method)) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    // Allow requests from the same origin or if no origin header (native app/curl)
    if (origin && host) {
      const originUrl = new URL(origin)
      const expectedOrigins = [
        `https://${host}`,
        `http://${host}`,
        process.env.NEXT_PUBLIC_APP_URL
      ].filter(Boolean)

      const isValidOrigin = expectedOrigins.some(expected =>
        expected && originUrl.origin === new URL(expected).origin
      )

      if (!isValidOrigin) {
        console.warn(`[CSRF] Blocked request from invalid origin: ${origin} (expected: ${host})`)
        return NextResponse.json(
          { error: 'Invalid origin' },
          { status: 403 }
        )
      }
    }
  }

  // Refresh Supabase session if needed
  const supabase = createMiddlewareClient({ req: request, res: response })
  const { data: { session } } = await supabase.auth.getSession()

  // Protect dashboard and chart routes - require authentication
  const protectedPaths = ['/dashboard', '/charts']
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtectedPath && !session) {
    const redirectUrl = new URL('/sign-in', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Add security headers to response
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
