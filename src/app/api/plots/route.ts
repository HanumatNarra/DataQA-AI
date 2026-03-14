import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServerClient } from '@/lib/supabase'
import { z } from 'zod'
import { processUniversalQuery } from '@/lib/universalHybridProcessor'

export const runtime = 'nodejs'

// Input validation schema
const PlotRequestSchema = z.object({
  query: z.string().min(1).max(500).describe('Natural language chart request'),
  filters: z.record(z.any()).optional().describe('Optional structured filters'),
  preferredChart: z.enum(['bar', 'line', 'area', 'pie']).optional().describe('Preferred chart type')
})

// Response schema
const PlotResponseSchema = z.object({
  data: z.array(z.object({
    label: z.string(),
    value: z.number()
  })),
  meta: z.object({
    measure: z.string(),
    dimension: z.string(),
    filters: z.record(z.any()),
    rowCount: z.number(),
    chartType: z.string(),
    summary: z.object({
      total: z.number(),
      count: z.number(),
      average: z.number(),
      max: z.number(),
      min: z.number()
    })
  }),
  vegaLite: z.any(),
  success: z.boolean(),
  error: z.string().optional()
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Validate input
    const body = await request.json()
    const validationResult = PlotRequestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: `Invalid input: ${validationResult.error.errors.map(e => e.message).join(', ')}`
      }, { status: 400 })
    }

    const { query, filters = {}, preferredChart } = validationResult.data

    // 2. Get user context (reuse existing auth)
    const supabase = await createRouteHandlerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Create service role client for storage operations (bypasses RLS)
    const supabaseAdmin = createServerClient()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    // 3. Rate limiting check (basic implementation)
    const { data: rateLimitData } = await supabase
      .from('user_files')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 60000).toISOString())
      .limit(10)

    if (rateLimitData && rateLimitData.length >= 10) {
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded. Please wait before making more chart requests.'
      }, { status: 429 })
    }

    // 4. Get user's uploaded data (reuse existing file access)
    const { data: userFiles, error: filesError } = await supabase
      .from('user_files')
      .select('id, filename, status')
      .eq('user_id', user.id)
      .eq('status', 'processed')

    if (filesError) {
      console.error('Error fetching user files:', filesError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch user data'
      }, { status: 500 })
    }

    if (!userFiles || userFiles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No processed files found. Please upload and process some data first.'
      }, { status: 404 })
    }

    // 5. Get chunks for all processed files
    const fileIds = userFiles.map(file => file.id)
    const { data: chunks, error: chunksError } = await supabase
      .from('pdf_chunks')
      .select('*, user_files!inner(filename)')
      .in('file_id', fileIds)
      .limit(1000)

    if (chunksError) {
      console.error('Error fetching chunks:', chunksError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch data chunks'
      }, { status: 500 })
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data chunks found. Please ensure your files have been processed.'
      }, { status: 404 })
    }

    // 6. Transform chunks to include filename
    const processedChunks = chunks.map((chunk: Record<string, any>) => ({
      ...chunk,
      filename: chunk.user_files?.filename || chunk.metadata?.file_name || 'data'
    }))

    // 7. Use the existing Data Q&A backend to process the query
    const universalResponse = await processUniversalQuery(query, processedChunks)

    if (!universalResponse.message || universalResponse.count === 0) {
      return NextResponse.json({
        success: false,
        error: universalResponse.message || 'Failed to process chart request'
      }, { status: 400 })
    }

    // 8. Extract data from the universal response for charting
    const chartData = extractChartDataFromResponse(universalResponse, preferredChart)

    if (!chartData) {
      return NextResponse.json({
        success: false,
        error: 'Unable to extract chart data from the response'
      }, { status: 400 })
    }

    // 9. Decide on chart type (query override -> data-aware heuristic)
    const queryPreferred = inferPreferredChartType(query)
    const decidedChartType = preferredChart || queryPreferred || chooseChartTypeByData(chartData.data)
    chartData.meta.chartType = decidedChartType

    // 10. Generate Vega-Lite specification
    const vegaSpec = createVegaSpec(chartData.data, { ...chartData.meta, chartType: decidedChartType })

    // Ensure the Vega-Lite spec has the correct chart type
    vegaSpec.mark = decidedChartType

    // 11. Validate response
    const response = {
      data: chartData.data,
      meta: chartData.meta,
      vegaLite: vegaSpec,
      success: true
    }

    const responseValidation = PlotResponseSchema.safeParse(response)
    if (!responseValidation.success) {
      console.error('Response validation failed:', responseValidation.error)
      return NextResponse.json({
        success: false,
        error: 'Internal error: Invalid response format'
      }, { status: 500 })
    }

    // 12. Log performance metrics
    const duration = Date.now() - startTime
    void duration // duration tracked for future logging integration

    // 13. Save to user chart history (best-effort)
    try {
      // Generate chart image and save to existing user-files storage bucket
      const chartImageBuffer = await generateChartImage(response.vegaLite, response.data)

      const fileNameOnly = `chart_${Date.now()}_${user.id}.svg`
      const storagePath = `charts/${user.id}/${fileNameOnly}`

      // Upload chart image to existing user-files bucket using admin client (bypasses RLS)
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('user-files')
        .upload(storagePath, chartImageBuffer, {
          contentType: 'image/svg+xml',
          cacheControl: '3600'
        })

      let chartImageUrl = null
      if (uploadError) {
        console.warn('[PLOTS] Failed to upload chart image:', uploadError)
      } else {
        void uploadData
        // Store STORAGE PATH in DB; URLs will be signed when fetching history
        chartImageUrl = storagePath
      }

      // Insert chart into history with image URL
      const { error: insertError } = await supabase.from('chart_history').insert({
        user_id: user.id,
        query: query ?? null,
        chart_type: decidedChartType,
        measure: response.meta.measure ?? null,
        dimension: response.meta.dimension ?? null,
        data: response.data,
        vega_spec: response.vegaLite ?? null,
        chart_image_url: chartImageUrl,
      })

      if (insertError) {
        console.warn('[PLOTS] Failed to insert chart history:', insertError)
      } else {
        // Enforce last 20 policy (delete older ones beyond 20)
        const { data: rows } = await supabase
          .from('chart_history')
          .select('id, created_at, chart_image_url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(20, 9999)

        if (rows && rows.length) {
          const ids = rows.map(r => r.id)
          await supabase.from('chart_history').delete().in('id', ids)

          // Also delete old chart images from storage (by storage path)
          for (const row of rows) {
            if (row.chart_image_url) {
              const storagePathToRemove = String(row.chart_image_url).replace(/^@/, '')
              await supabaseAdmin.storage.from('user-files').remove([storagePathToRemove])
            }
          }
        }
      }
    } catch (e) {
      console.warn('[PLOTS] Failed to save chart history:', e)
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[PLOTS] Error generating chart:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// Helper function to extract chart data from universal response
function extractChartDataFromResponse(universalResponse: Record<string, any>, preferredChart?: string) {
  try {
    // For breakdown analysis (both single-table and cross-table), extract breakdown data FIRST (highest priority)
    if (universalResponse.breakdown && Array.isArray(universalResponse.breakdown) && universalResponse.breakdown.length > 0) {
      const breakdown = universalResponse.breakdown
      const data = breakdown.map((item: Record<string, any>) => ({
        label: item.group || item.label || 'Unknown',
        value: item.count || item.value || 0
      }))

      // Extract dimension from the universal response or infer from breakdown data
      let dimension = 'category';

      // Priority 1: Extract dimension dynamically from the query itself (truly data-agnostic)
      if (universalResponse.message) {
        // Extract the actual field name mentioned in the response message
        const messagePatterns = [
          /(\d+)\s+\w+\s+across\s+\d+\s+(\w+)/i, // "X items across Y dimensions" - capture group 2
          /across\s+\d+\s+(\w+)/i,                // "across 5 statuses"
          /per\s+each\s+(\w+)/i,                  // "per each status"
          /by\s+(\w+)/i,                          // "by status"
          /each\s+(\w+)/i,                        // "each status"
        ];

        for (let i = 0; i < messagePatterns.length; i++) {
          const pattern = messagePatterns[i];
          const match = pattern.exec(universalResponse.message);
          if (match) {
            // For the first pattern (with "X items across Y dimensions"), use group 2
            // For all other patterns, use group 1
            const groupIndex = i === 0 ? 2 : 1;
            if (match[groupIndex]) {
              // Preserve the original case and only remove plural forms intelligently
              let extractedDimension = match[groupIndex];

              // Only remove trailing 's' if it's a common plural pattern and the word is long enough
              // This prevents truncating words like "status" to "statu"
              if (extractedDimension.endsWith('s') &&
                  extractedDimension.length > 4 &&
                  !extractedDimension.endsWith('ss') &&
                  !extractedDimension.endsWith('us') &&
                  !extractedDimension.endsWith('is') &&
                  !extractedDimension.endsWith('as') &&
                  !extractedDimension.endsWith('os')) {
                extractedDimension = extractedDimension.slice(0, -1);
              }

              dimension = extractedDimension;
              break;
            }
          }
        }
      }

      // Priority 2: Extract from the original query if still not found
      if (dimension === 'category') {
        const queryPatterns = [
          /plot.*per\s+each\s+(\w+)/i,
          /plot.*by\s+(\w+)/i,
          /chart.*per\s+each\s+(\w+)/i,
          /chart.*by\s+(\w+)/i,
          /per\s+each\s+(\w+)/i,
          /by\s+(\w+)/i
        ];

        const originalQuery = universalResponse.conversationContext?.lastQuery || '';
        for (const pattern of queryPatterns) {
          const match = pattern.exec(originalQuery);
          if (match && match[1]) {
            let extractedDimension = match[1];

            if (extractedDimension.endsWith('s') &&
                extractedDimension.length > 4 &&
                !extractedDimension.endsWith('ss') &&
                !extractedDimension.endsWith('us') &&
                !extractedDimension.endsWith('is') &&
                !extractedDimension.endsWith('as') &&
                !extractedDimension.endsWith('os')) {
              extractedDimension = extractedDimension.slice(0, -1);
            }

            dimension = extractedDimension;
            break;
          }
        }
      }

      // Priority 3: Use group-by dimension from conversation context (for breakdowns)
      if (dimension === 'category' && universalResponse.conversationContext?.lastGroupByDimension) {
        dimension = universalResponse.conversationContext.lastGroupByDimension;
      }

      // Priority 4: Fallback to conversation context entity type (least accurate for breakdowns)
      if (dimension === 'category' && universalResponse.conversationContext?.lastEntityType) {
        dimension = universalResponse.conversationContext.lastEntityType;
      }

      return {
        data,
        meta: {
          measure: 'count',
          dimension: dimension,
          filters: {},
          rowCount: data.length,
          chartType: preferredChart || 'bar',
          summary: {
            total: data.reduce((sum: number, item: Record<string, any>) => sum + item.value, 0),
            count: data.length,
            average: data.reduce((sum: number, item: Record<string, any>) => sum + item.value, 0) / data.length,
            max: Math.max(...data.map((item: Record<string, any>) => item.value)),
            min: Math.min(...data.map((item: Record<string, any>) => item.value))
          }
        }
      }
    }

    // For count queries, create a simple bar chart
    if (universalResponse.isCountQuery || universalResponse.isAnalyticalQuery) {
      const count = universalResponse.count || 0
      const entityType = universalResponse.conversationContext?.lastEntityType || 'item'

      return {
        data: [{
          label: entityType,
          value: count
        }],
        meta: {
          measure: 'count',
          dimension: entityType,
          filters: {},
          rowCount: 1,
          chartType: preferredChart || 'bar',
          summary: {
            total: count,
            count: 1,
            average: count,
            max: count,
            min: count
          }
        }
      }
    }

    // For list queries, create a chart based on the items
    if (universalResponse.isListQuery && universalResponse.items) {
      const items = universalResponse.items
      const data = items.map((item: string) => ({
        label: item,
        value: 1
      }))

      return {
        data,
        meta: {
          measure: 'count',
          dimension: 'items',
          filters: {},
          rowCount: data.length,
          chartType: preferredChart || 'bar',
          summary: {
            total: data.length,
            count: data.length,
            average: 1,
            max: 1,
            min: 1
          }
        }
      }
    }

    // Try to parse breakdown from message for any breakdown queries
    if (universalResponse.message && universalResponse.message.includes('across')) {
      const message = universalResponse.message
      // Look for patterns like "X items in Y" (data-agnostic)
      const matches = message.match(/(\d+)\s+\w+\s+in\s+([^,]+)/g)
      if (matches) {
        const data = matches.map((match: string) => {
          const [, count, group] = match.match(/(\d+)\s+\w+\s+in\s+([^,]+)/) || []
          return {
            label: group?.trim() || 'Unknown',
            value: parseInt(count) || 0
          }
        })

        return {
          data,
          meta: {
            measure: 'count',
            dimension: 'group',
            filters: {},
            rowCount: data.length,
            chartType: preferredChart || 'bar',
            summary: {
              total: data.reduce((sum: number, item: Record<string, any>) => sum + item.value, 0),
              count: data.length,
              average: data.reduce((sum: number, item: Record<string, any>) => sum + item.value, 0) / data.length,
              max: Math.max(...data.map((item: Record<string, any>) => item.value)),
              min: Math.min(...data.map((item: Record<string, any>) => item.value))
            }
          }
        }
      }
    }

    return null
  } catch (error) {
    console.error('[PLOTS] Error extracting chart data:', error)
    return null
  }
}

// Generate chart image from Vega-Lite spec
async function generateChartImage(vegaSpec: Record<string, any>, data: Array<{ label: string; value: number }>): Promise<Buffer> {
  try {
    // Create a simple, guaranteed-to-work SVG (supports bar and pie)
    const width = 600
    const height = 400
    const chartType = vegaSpec?.mark || 'bar'

    // Helper function to escape XML entities
    const escapeXml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    }

    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`
    svg += `<rect width="${width}" height="${height}" fill="#1f2937"/>`
    svg += `<text x="${width/2}" y="30" text-anchor="middle" fill="white" font-size="16" font-family="Arial">${escapeXml(chartType.toUpperCase())} Chart</text>`

    const colors = ['#2563EB', '#14B8A6', '#F59E0B', '#EF4444', '#22C55E', '#6366F1']

    if (String(chartType).toLowerCase() === 'pie' || String(chartType).toLowerCase() === 'arc') {
      // PIE - Make chart fill the entire canvas
      const cx = width / 2
      const cy = height / 2
      const r = Math.min(width, height) * 0.25 // Scale radius based on canvas size
      const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1
      let start = 0
      data.forEach((d, i) => {
        const value = d.value || 0
        const angle = (value / total) * Math.PI * 2
        const end = start + angle
        const x1 = cx + r * Math.cos(start)
        const y1 = cy + r * Math.sin(start)
        const x2 = cx + r * Math.cos(end)
        const y2 = cy + r * Math.sin(end)
        const largeArc = angle > Math.PI ? 1 : 0
        svg += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${colors[i % colors.length]}"/>`
        start = end
      })
      // Legend positioned to fill available space
      const legendStartX = 40
      const legendStartY = 80
      const legendItemHeight = 25
      data.forEach((d, i) => {
        const lx = legendStartX
        const ly = legendStartY + i * legendItemHeight
        svg += `<rect x="${lx}" y="${ly - 10}" width="16" height="16" fill="${colors[i % colors.length]}"/>`
        svg += `<text x="${lx + 22}" y="${ly}" fill="white" font-size="14" font-weight="bold">${escapeXml(d.label)} (${d.value})</text>`
      })
    } else {
      // BAR - Make chart fill the entire canvas
      const margin = { top: 60, right: 40, bottom: 80, left: 40 }
      const chartWidth = width - margin.left - margin.right
      const chartHeight = height - margin.top - margin.bottom

      const barWidth = Math.min(80, (chartWidth - (data.length - 1) * 15) / data.length)
      const barSpacing = Math.max(15, (chartWidth - data.length * barWidth) / (data.length - 1))
      const maxValue = Math.max(1, ...data.map(d => d.value || 0))

      data.forEach((item, i) => {
        const x = margin.left + i * (barWidth + barSpacing)
        const barHeight = (item.value / maxValue) * chartHeight
        const y = margin.top + chartHeight - barHeight

        svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${colors[i % colors.length]}"/>`
        svg += `<text x="${x + barWidth/2}" y="${y - 15}" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${item.value}</text>`
        svg += `<text x="${x + barWidth/2}" y="${margin.top + chartHeight + 25}" text-anchor="middle" fill="white" font-size="12">${escapeXml(item.label)}</text>`
      })
    }

    svg += '</svg>'
    return Buffer.from(svg, 'utf-8')
  } catch (error) {
    console.error('[PLOTS] Error generating chart image:', error)
    // Return a simple placeholder
    const svg = `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="600" height="400" fill="#1f2937"/><text x="300" y="200" text-anchor="middle" fill="white" font-size="14">Chart Preview</text></svg>`
    return Buffer.from(svg, 'utf-8')
  }
}

// Simple Vega-Lite spec generator
function createVegaSpec(data: Array<{ label: string; value: number }>, meta: Record<string, any>) {
  const chartType = meta.chartType || 'bar'

  const baseSpec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 400,
    height: 300,
    data: {
      values: data
    },
    title: {
      text: `Chart: ${meta.measure} by ${meta.dimension}`,
      fontSize: 16
    }
  }

  switch (chartType) {
    case 'bar':
      return {
        ...baseSpec,
        mark: 'bar',
        encoding: {
          x: { field: 'label', type: 'nominal', title: meta.dimension },
          y: { field: 'value', type: 'quantitative', title: meta.measure }
        }
      }

    case 'line':
      return {
        ...baseSpec,
        mark: 'line',
        encoding: {
          x: { field: 'label', type: 'nominal', title: meta.dimension },
          y: { field: 'value', type: 'quantitative', title: meta.measure }
        }
      }

    case 'pie':
      return {
        ...baseSpec,
        mark: 'arc',
        encoding: {
          theta: { field: 'value', type: 'quantitative' },
          color: { field: 'label', type: 'nominal' }
        }
      }

    case 'area':
      return {
        ...baseSpec,
        mark: 'area',
        encoding: {
          x: { field: 'label', type: 'nominal', title: meta.dimension },
          y: { field: 'value', type: 'quantitative', title: meta.measure }
        }
      }

    default:
      return {
        ...baseSpec,
        mark: 'bar',
        encoding: {
          x: { field: 'label', type: 'nominal', title: meta.dimension },
          y: { field: 'value', type: 'quantitative', title: meta.measure }
        }
      }
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'chart-generation'
  })
}

// Simple, data-agnostic heuristics
function inferPreferredChartType(query: string | undefined): 'bar' | 'line' | 'area' | 'pie' | undefined {
  if (!query) return undefined
  const q = query.toLowerCase()
  if (/\bpie\b/.test(q)) return 'pie'
  if (/\bline\b|trend|over time|by month|by year/.test(q)) return 'line'
  if (/\barea\b/.test(q)) return 'area'
  if (/\bbar\b|histogram/.test(q)) return 'bar'
  return undefined
}

function chooseChartTypeByData(data: Array<{ label: string; value: number }>): 'bar' | 'line' | 'area' | 'pie' {
  // If only one or few categories (<=6), a pie can work; otherwise, bar is more readable.
  const unique = new Set(data.map(d => d.label)).size
  if (unique <= 6) return 'pie'
  return 'bar'
}
