/**
 * Centralized Supabase client creation utilities
 *
 * This module provides standardized Supabase clients for different contexts:
 * - Server-side admin operations (service role)
 * - API route handlers (with cookie-based auth)
 * - Client-side operations (browser)
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createRouteHandlerClient as createRouteClient } from '@supabase/auth-helpers-nextjs'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

/**
 * Get Supabase URL from environment
 * Throws if not configured
 */
function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }
  return url
}

/**
 * Get Supabase service role key from environment
 * Throws if not configured
 */
function getSupabaseServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }
  return key
}

/**
 * Create a server-side Supabase client with service role privileges
 *
 * Use this for:
 * - Admin operations that bypass RLS
 * - Server-side data operations in API routes
 * - Background jobs and cron tasks
 *
 * WARNING: This client bypasses Row Level Security (RLS).
 * Only use when you need admin privileges and have validated the user's authorization.
 *
 * @returns Supabase client with service role key
 */
export function createServerClient() {
  return createSupabaseClient(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}

/**
 * Create a Supabase client for Next.js API route handlers
 *
 * Use this in API routes for:
 * - Reading/writing data with user authentication
 * - Operations that respect RLS policies
 * - Accessing the authenticated user's session
 *
 * This client automatically handles cookie-based authentication.
 *
 * @returns Supabase client configured for route handlers
 */
export async function createRouteHandlerClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return createRouteClient({
    cookies: () => cookieStore
  } as any)
}

/**
 * Create a Supabase client for browser/client-side use (legacy name)
 *
 * @deprecated Use createBrowserClient instead
 */
export const createClient = () => createClientComponentClient()

/**
 * Create a Supabase client for browser/client-side use
 *
 * Use this in:
 * - React components marked with 'use client'
 * - Client-side data fetching
 * - Real-time subscriptions
 *
 * This client automatically manages authentication state in the browser.
 *
 * @returns Supabase client for browser use
 */
export function createBrowserClient() {
  return createClientComponentClient()
}

/**
 * Verify a bearer token and get the associated user
 *
 * Use this for:
 * - API routes that accept Authorization header
 * - Verifying tokens from external clients
 *
 * @param token - Bearer token to verify
 * @returns User object if valid, null otherwise
 */
export async function verifyBearerToken(token: string) {
  const client = createServerClient()

  try {
    const { data, error } = await client.auth.getUser(token)

    if (error || !data.user) {
      console.warn('[AUTH] Token verification failed:', error?.message)
      return null
    }

    return data.user
  } catch (error) {
    console.error('[AUTH] Token verification error:', error)
    return null
  }
}
