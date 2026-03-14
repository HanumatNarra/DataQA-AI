import { NextResponse } from 'next/server'
import { createRouteHandlerClient, createServerClient } from '@/lib/supabase'
import { apiLogger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = await createRouteHandlerClient()
    const supabaseAdmin = createServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ items: [] })
    }

    const { data, error } = await supabase
      .from('chart_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    
    // Map storage paths to signed URLs for private buckets
    const items = await Promise.all((data || []).map(async (row: any) => {
      // If chart_image_url is a storage path, sign it
      if (row.chart_image_url && typeof row.chart_image_url === 'string') {
        const value: string = row.chart_image_url
        const isHttp = /^https?:\/\//i.test(value)
        const storagePath = isHttp 
          ? value.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/user-files\//, '')
          : value.replace(/^@/, '')
        try {
          const { data: signed, error: signErr } = await supabaseAdmin.storage
            .from('user-files')
            .createSignedUrl(storagePath, 60 * 60) // 1 hour
          if (!signErr && signed?.signedUrl) {
            row.chart_image_url = signed.signedUrl
          }
        } catch (e) {
          apiLogger.warn('Failed to sign URL', {
            route: 'charts/recent',
            storagePath,
            error: e instanceof Error ? e.message : 'Unknown error'
          })
        }
      }
      return row
    }))

    return NextResponse.json({ items })
  } catch (e) {
    apiLogger.error('Error fetching recent charts', e instanceof Error ? e : undefined, {
      route: 'charts/recent',
      error: e instanceof Error ? e.message : 'Unknown error'
    })
    return NextResponse.json({ items: [] })
  }
}
