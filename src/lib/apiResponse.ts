/**
 * Standardized API Response Utilities
 *
 * Provides consistent response formats across all API endpoints
 */

import { NextResponse } from 'next/server'

export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  meta?: {
    timestamp: string
    [key: string]: any
  }
}

export interface ApiErrorResponse {
  success: false
  error: {
    message: string
    code?: string
    details?: any
  }
  meta?: {
    timestamp: string
    [key: string]: any
  }
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Create a successful API response
 *
 * @param data - The response data
 * @param meta - Optional metadata
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with standardized success format
 */
export function apiSuccess<T = any>(
  data: T,
  meta?: Record<string, any>,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    { status }
  )
}

/**
 * Create an error API response
 *
 * @param message - Error message
 * @param status - HTTP status code (default: 500)
 * @param code - Optional error code
 * @param details - Optional error details
 * @returns NextResponse with standardized error format
 */
export function apiError(
  message: string,
  status: number = 500,
  code?: string,
  details?: any
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  )
}

/**
 * Create a 400 Bad Request response
 */
export function apiBadRequest(message: string, details?: any) {
  return apiError(message, 400, 'BAD_REQUEST', details)
}

/**
 * Create a 401 Unauthorized response
 */
export function apiUnauthorized(message: string = 'Unauthorized') {
  return apiError(message, 401, 'UNAUTHORIZED')
}

/**
 * Create a 403 Forbidden response
 */
export function apiForbidden(message: string = 'Forbidden') {
  return apiError(message, 403, 'FORBIDDEN')
}

/**
 * Create a 404 Not Found response
 */
export function apiNotFound(message: string = 'Not found') {
  return apiError(message, 404, 'NOT_FOUND')
}

/**
 * Create a 409 Conflict response
 */
export function apiConflict(message: string, details?: any) {
  return apiError(message, 409, 'CONFLICT', details)
}

/**
 * Create a 422 Unprocessable Entity response (validation error)
 */
export function apiValidationError(message: string, details?: any) {
  return apiError(message, 422, 'VALIDATION_ERROR', details)
}

/**
 * Create a 429 Too Many Requests response
 */
export function apiRateLimited(message: string = 'Too many requests') {
  return apiError(message, 429, 'RATE_LIMITED')
}

/**
 * Create a 500 Internal Server Error response
 */
export function apiInternalError(message: string = 'Internal server error', details?: any) {
  return apiError(message, 500, 'INTERNAL_ERROR', details)
}

/**
 * Wrap an async API handler with error handling
 *
 * @param handler - The async handler function
 * @returns Wrapped handler with automatic error responses
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<ApiResponse<R>>>
) {
  return async (...args: T): Promise<NextResponse<ApiResponse<R>>> => {
    try {
      return await handler(...args)
    } catch (error) {
      console.error('[API Error]', error)

      // Handle Zod validation errors
      if (error && typeof error === 'object' && 'issues' in error) {
        return apiValidationError(
          'Validation failed',
          (error as any).issues
        ) as any
      }

      // Handle standard errors
      if (error instanceof Error) {
        return apiInternalError(
          process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : error.message,
          process.env.NODE_ENV === 'production' ? undefined : error.stack
        ) as any
      }

      return apiInternalError() as any
    }
  }
}

/**
 * Legacy response format for backwards compatibility
 * @deprecated Use apiSuccess or apiError instead
 */
export function legacyResponse(ok: boolean, data?: any, error?: string, status: number = 200) {
  if (ok) {
    return NextResponse.json({ ok: true, ...data }, { status })
  } else {
    return NextResponse.json({ ok: false, error }, { status })
  }
}
