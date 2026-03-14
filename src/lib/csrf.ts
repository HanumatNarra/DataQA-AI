import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'

const CSRF_TOKEN_LENGTH = 32
const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

/**
 * Hash a CSRF token for storage
 */
export function hashCsrfToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Verify that a CSRF token matches the expected hash
 */
export function verifyCsrfToken(token: string, expectedHash: string): boolean {
  const tokenHash = hashCsrfToken(token)
  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(tokenHash, expectedHash)
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Get CSRF token from request cookies
 */
export function getCsrfTokenFromCookie(request: NextRequest): string | null {
  const cookieValue = request.cookies.get(CSRF_COOKIE_NAME)?.value
  return cookieValue || null
}

/**
 * Get CSRF token from request header
 */
export function getCsrfTokenFromHeader(request: NextRequest): string | null {
  return request.headers.get(CSRF_HEADER_NAME)
}

/**
 * Set CSRF token cookie in response
 */
export function setCsrfTokenCookie(response: NextResponse, token: string) {
  response.cookies.set(CSRF_COOKIE_NAME, hashCsrfToken(token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 // 24 hours
  })
}

/**
 * Validate CSRF token from request
 * Returns true if valid, false otherwise
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const cookieToken = getCsrfTokenFromCookie(request)
  const headerToken = getCsrfTokenFromHeader(request)

  if (!cookieToken || !headerToken) {
    console.warn('[CSRF] Missing CSRF token in cookie or header')
    return false
  }

  const isValid = verifyCsrfToken(headerToken, cookieToken)

  if (!isValid) {
    console.warn('[CSRF] CSRF token validation failed')
  }

  return isValid
}

/**
 * Middleware helper to validate CSRF for state-changing requests
 */
export function csrfProtection(request: NextRequest): NextResponse | null {
  const statefulMethods = ['POST', 'PUT', 'DELETE', 'PATCH']

  // Skip CSRF validation for non-state-changing methods
  if (!statefulMethods.includes(request.method)) {
    return null
  }

  // Skip CSRF validation for auth endpoints (they have their own protection)
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return null
  }

  // Validate CSRF token
  if (!validateCsrfToken(request)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    )
  }

  return null
}
