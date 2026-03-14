'use server'

import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export interface SavedChart {
  id: number
  user_id: string
  query: string | null
  chart_type: 'bar' | 'line' | 'area' | 'pie'
  measure: string | null
  dimension: string | null
  data: Array<{ label: string; value: number }>
  vega_spec?: any
  chart_image_url?: string | null
  thumbnail_url?: string | null
  created_at: string
  updated_at?: string
  name?: string | null
  config?: any
  result_meta?: any
  dataset_id?: string | null
  preview_data_sample?: any
}

export async function saveChartToHistory(params: {
  userId: string
  query?: string
  chartType: 'bar' | 'line' | 'area' | 'pie'
  measure?: string
  dimension?: string
  data: Array<{ label: string; value: number }>
  vegaSpec?: any
}) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore } as any)
  const { userId, query, chartType, measure, dimension, data, vegaSpec } = params

  // Insert
  await supabase.from('chart_history').insert({
    user_id: userId,
    query: query ?? null,
    chart_type: chartType,
    measure: measure ?? null,
    dimension: dimension ?? null,
    data: data as any,
    vega_spec: vegaSpec ?? null,
  })

  // Enforce last 20 policy (delete older ones beyond 20)
  const { data: rows } = await supabase
    .from('chart_history')
    .select('id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(20, 9999)

  if (rows && rows.length) {
    const ids = rows.map(r => r.id)
    await supabase.from('chart_history').delete().in('id', ids)
  }
}

export async function getRecentCharts(limit = 20): Promise<SavedChart[]> {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore } as any)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('chart_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data as unknown as SavedChart[]) || []
}

// Get signed URL for chart image (for display purposes)
export async function getChartImageUrl(storagePath: string): Promise<string | null> {
  if (!storagePath) return null

  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore } as any)

    const { data, error } = await supabase.storage
      .from('user-files')
      .createSignedUrl(storagePath, 60 * 60)

    if (error) {
      console.error('Failed to create signed URL:', error)
      return null
    }

    return data?.signedUrl || null
  } catch (error) {
    console.error('Error getting chart image URL:', error)
    return null
  }
}
