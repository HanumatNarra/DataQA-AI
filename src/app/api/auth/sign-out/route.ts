import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { apiLogger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore } as any)
    await supabase.auth.signOut()
    // Immediately return 204 and let client redirect; don't trigger extra re-renders
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    apiLogger.error('Error signing out', e instanceof Error ? e : undefined, {
      route: 'auth/sign-out',
      error: e instanceof Error ? e.message : 'Unknown error'
    })
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
