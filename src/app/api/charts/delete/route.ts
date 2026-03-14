import { NextResponse } from 'next/server'
import { createRouteHandlerClient, createServerClient } from '@/lib/supabase'
import { apiLogger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ ok: false }, { status: 400 })

    const supabase = await createRouteHandlerClient()
    const admin = createServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false }, { status: 401 })

    // Fetch row to get storage path
    const { data, error } = await supabase
      .from('chart_history')
      .select('id, user_id, chart_image_url')
      .eq('id', id)
      .single()
    if (error || !data) throw error || new Error('Not found')
    if (data.user_id !== user.id) return NextResponse.json({ ok: false }, { status: 403 })

    // Remove storage asset if present
    if (data.chart_image_url) {
      const path = String(data.chart_image_url).replace(/^@/, '')
      await admin.storage.from('user-files').remove([path])
    }

    // Delete row
    await supabase.from('chart_history').delete().eq('id', id)

    return NextResponse.json({ ok: true })
  } catch (e) {
    apiLogger.error('Error deleting chart', e instanceof Error ? e : undefined, {
      route: 'charts/delete',
      error: e instanceof Error ? e.message : 'Unknown error'
    })
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
