/**
 * Rate Limiting Utilities
 *
 * Provides in-memory rate limiting for API endpoints
 * For production, consider using Redis or Upstash for distributed rate limiting
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limit data
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup interval to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Cleanup every minute

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number

  /**
   * Time window in seconds
   */
  windowSeconds: number

  /**
   * Custom identifier function (defaults to IP address)
   */
  identifier?: (request: NextRequest) => string

  /**
   * Custom error message
   */
  message?: string
}

/**
 * Get client identifier from request
 * Uses IP address by default
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback to connection remote address
  return 'unknown'
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier for the client (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Object with { limited: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { limited: boolean; remaining: number; resetTime: number; retryAfter?: number } {
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const key = `ratelimit:${identifier}`

  let entry = rateLimitStore.get(key)

  // Create new entry or reset if window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
    }
    rateLimitStore.set(key, entry)
  }

  // Increment count
  entry.count++

  const remaining = Math.max(0, config.maxRequests - entry.count)
  const limited = entry.count > config.maxRequests

  return {
    limited,
    remaining,
    resetTime: entry.resetTime,
    retryAfter: limited ? Math.ceil((entry.resetTime - now) / 1000) : undefined,
  }
}

/**
 * Rate limit middleware for API routes
 *
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @returns NextResponse with 429 status if rate limited, null otherwise
 */
export function rateLimitMiddleware(
  request: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  const identifier = config.identifier
    ? config.identifier(request)
    : getClientIdentifier(request)

  const result = checkRateLimit(identifier, config)

  // Add rate limit headers to all responses
  const headers = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
  }

  if (result.limited) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            config.message || 'Too many requests. Please try again later.',
          code: 'RATE_LIMITED',
          retryAfter: result.retryAfter,
        },
      },
      {
        status: 429,
        headers: {
          ...headers,
          'Retry-After': result.retryAfter?.toString() || '60',
        },
      }
    )
  }

  return null
}

/**
 * Wrap an API handler with rate limiting
 *
 * @param handler - The API handler function
 * @param config - Rate limit configuration
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit<T extends (req: NextRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: T,
  config: RateLimitConfig
): T {
  return (async (req: NextRequest, ...args: any[]) => {
    const rateLimitResponse = rateLimitMiddleware(req, config)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    return handler(req, ...args)
  }) as T
}

/**
 * Preset rate limit configurations for common use cases
 */
export const RateLimitPresets = {
  /**
   * Strict: 10 requests per minute
   * Use for sensitive operations (authentication, payments)
   */
  strict: {
    maxRequests: 10,
    windowSeconds: 60,
  },

  /**
   * Moderate: 30 requests per minute
   * Use for standard API endpoints
   */
  moderate: {
    maxRequests: 30,
    windowSeconds: 60,
  },

  /**
   * Generous: 60 requests per minute
   * Use for read-heavy endpoints
   */
  generous: {
    maxRequests: 60,
    windowSeconds: 60,
  },

  /**
   * Upload: 5 uploads per 5 minutes
   * Use for file upload endpoints
   */
  upload: {
    maxRequests: 5,
    windowSeconds: 300,
  },

  /**
   * Search: 20 requests per minute
   * Use for search/query endpoints
   */
  search: {
    maxRequests: 20,
    windowSeconds: 60,
  },
} as const

/**
 * Rate limit by user ID (requires authenticated request)
 *
 * @param userId - User ID to rate limit
 * @param config - Rate limit configuration
 */
export function checkUserRateLimit(
  userId: string,
  config: RateLimitConfig
) {
  return checkRateLimit(`user:${userId}`, config)
}
