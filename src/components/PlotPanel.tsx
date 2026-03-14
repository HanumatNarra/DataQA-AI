'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { BarChart3, LineChart, PieChart, TrendingUp, Loader2, AlertCircle, RefreshCw, Download } from 'lucide-react'
import { BarChart, Bar, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

interface PlotData {
  label: string
  value: number
}

interface PlotMeta {
  measure: string
  dimension: string
  filters: Record<string, any>
  rowCount: number
  chartType: string
  summary: {
    total: number
    count: number
    average: number
    max: number
    min: number
  }
}

interface PlotResponse {
  data: PlotData[]
  meta: PlotMeta
  vegaLite: any
  success: boolean
  error?: string
}

export default function PlotPanel() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResponse, setLastResponse] = useState<PlotResponse | null>(null)
  const [preferredChart, setPreferredChart] = useState<'bar' | 'line' | 'area' | 'pie' | null>(null)

  // Measured size of the chart container to avoid 0x0 mounts
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const chartHeight = 300

  // Lightweight SVG fallback for bar charts (never fails to render)
  const renderSvgBars = (data: { name: string; value: number }[], width: number, height: number) => {
    const safeWidth = Math.max(200, Math.floor(width))
    const safeHeight = Math.max(200, Math.floor(height))
    const padding = { top: 20, right: 20, bottom: 40, left: 40 }
    const innerWidth = safeWidth - padding.left - padding.right
    const innerHeight = safeHeight - padding.top - padding.bottom
    const maxVal = Math.max(...data.map(d => d.value), 1)
    const barGap = 12
    const barWidth = Math.max(10, Math.floor((innerWidth - barGap * (data.length - 1)) / data.length))
    const colors = ['#2563EB', '#14B8A6', '#F59E0B', '#EF4444', '#22C55E', '#6366F1']

    const bars = data.map((d, i) => {
      const x = padding.left + i * (barWidth + barGap)
      const barH = Math.round((d.value / maxVal) * innerHeight)
      const y = padding.top + (innerHeight - barH)
      return (
        <g key={i}>
          <rect x={x} y={y} width={barWidth} height={barH} fill={colors[i % colors.length]} rx={4} />
          <text x={x + barWidth / 2} y={safeHeight - 12} textAnchor="middle" fontSize={12} fill="#9CA3AF">
            {d.name}
          </text>
        </g>
      )
    })

    // y-axis line
    const axis = (
      <g>
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={safeHeight - padding.bottom} stroke="#374151" />
        <line x1={padding.left} y1={safeHeight - padding.bottom} x2={safeWidth - padding.right} y2={safeHeight - padding.bottom} stroke="#374151" />
      </g>
    )

    return (
      <svg width={safeWidth} height={safeHeight} role="img" aria-label="Bar chart">
        <rect x={0} y={0} width={safeWidth} height={safeHeight} fill="transparent" />
        {axis}
        {bars}
      </svg>
    )
  }

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    // Initialize width immediately
    setContainerWidth(element.getBoundingClientRect().width)

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width
        if (width !== containerWidth) {
          setContainerWidth(width)
        }
      }
    })

    resizeObserver.observe(element)
    return () => resizeObserver.disconnect()
  }, [containerRef.current])

  const generateChart = useCallback(async () => {
    if (!query.trim()) {
      setError('Please enter a chart request')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/plots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          preferredChart: preferredChart || undefined
        }),
      })

      const result: PlotResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate chart')
      }

      setLastResponse(result)
      setError(null)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate chart'
      setError(errorMessage)
      console.error('Chart generation error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [query, preferredChart])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    generateChart()
  }

  const handleRetry = () => {
    if (lastResponse) {
      generateChart()
    }
  }

  const clearChart = () => {
    setLastResponse(null)
    setError(null)
  }

  const downloadChart = useCallback(async () => {
    try {
      const node = containerRef.current
      if (!node) {
        console.warn('[PlotPanel] downloadChart: container not found')
        return
      }

      // Prefer an inline SVG inside the container (works for SVG fallback and Recharts)
      const svgEl = node.querySelector('svg') as SVGSVGElement | null
      if (!svgEl) {
        console.warn('[PlotPanel] downloadChart: no SVG found in container')
        return
      }

      // Clone to inline styles and set width/height explicitly
      const cloned = svgEl.cloneNode(true) as SVGSVGElement
      const { width, height } = svgEl.getBoundingClientRect()
      cloned.setAttribute('width', String(Math.max(1, Math.floor(width))))
      cloned.setAttribute('height', String(Math.max(1, Math.floor(height))))
      cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(cloned)
      const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString)

      // Draw onto a canvas for PNG export
      const img = new Image()
      const scale = Math.min(3, Math.max(1, Math.floor(window.devicePixelRatio || 1)))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.floor(width * scale))
      canvas.height = Math.max(1, Math.floor(height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.warn('[PlotPanel] downloadChart: 2d context not available')
        return
      }
      ctx.scale(scale, scale)

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.clearRect(0, 0, width, height)
          ctx.drawImage(img, 0, 0, width, height)
          resolve()
        }
        img.onerror = (e) => reject(e)
        img.src = svgDataUrl
      })

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
      if (!blob) {
        console.warn('[PlotPanel] downloadChart: failed to create blob')
        return
      }

      const a = document.createElement('a')
      const url = URL.createObjectURL(blob)
      a.href = url
      const filenameBase = lastResponse?.meta ? `${lastResponse.meta.measure || 'chart'}-by-${lastResponse.meta.dimension || 'category'}` : 'chart'
      a.download = `${filenameBase}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }, [containerRef.current, lastResponse])

  // Remove previous imperative DOM clearing; React will handle updates

  const renderChart = useCallback((data: PlotData[], chartType: string, width: number) => {
    if (!data || data.length === 0) {
      return <div className="text-sm text-gray-500">No data available for chart</div>
    }

    const chartData = data.map(item => ({
      name: item.label,
      value: item.value,
      label: item.label
    }))

    const colors = ['#2563EB', '#14B8A6', '#F59E0B', '#EF4444', '#22C55E', '#6366F1']
    const finalChartType = chartType || preferredChart || 'bar'

    if (finalChartType === 'bar') {
      return (
        <div className="w-full h-full flex items-center justify-center">
          {renderSvgBars(chartData, width || 600, chartHeight)}
        </div>
      )
    }

    // Handle other chart types
    switch (finalChartType) {
      case 'line':
        return (
          <div className="w-full h-full">
            <RechartsLineChart width={Math.max(0, Math.floor(width))} height={chartHeight} data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF"
                fontSize={12}
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tick={{ fill: '#9CA3AF' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#FFFFFF'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#14B8A6" 
                strokeWidth={3}
                dot={{ fill: '#14B8A6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#14B8A6', strokeWidth: 2 }}
              />
            </RechartsLineChart>
          </div>
        )

      case 'pie':
        return (
          <div className="w-full h-full">
            <RechartsPieChart width={Math.max(0, Math.floor(width))} height={chartHeight}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent ? (percent * 100).toFixed(0) : 0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#FFFFFF'
                }}
              />
            </RechartsPieChart>
          </div>
        )

      case 'area':
        return (
          <div className="w-full h-full">
            <AreaChart width={Math.max(0, Math.floor(width))} height={chartHeight} data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF"
                fontSize={12}
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tick={{ fill: '#9CA3AF' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#FFFFFF'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#F59E0B" 
                fill="#F59E0B" 
                fillOpacity={0.6}
              />
            </AreaChart>
          </div>
        )

      default:
        return (
          <div className="w-full h-full">
            <BarChart width={Math.max(0, Math.floor(width))} height={chartHeight} data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF"
                fontSize={12}
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tick={{ fill: '#9CA3AF' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#FFFFFF'
                }}
              />
              <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </div>
        )
    }
  }, [preferredChart])

  const getChartIcon = (chartType: string) => {
    switch (chartType) {
      case 'bar':
        return <BarChart3 className="w-4 h-4" />
      case 'line':
        return <LineChart className="w-4 h-4" />
      case 'pie':
        return <PieChart className="w-4 h-4" />
      case 'area':
        return <TrendingUp className="w-4 h-4" />
      default:
        return <BarChart3 className="w-4 h-4" />
    }
  }

  return (
    <div className="rounded-2xl border shadow-sm p-6 h-full flex flex-col" style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--text)' }}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>Chart Generator</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Create visualizations from your data</p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="space-y-4">
          {/* Query Input */}
          <div>
            <label htmlFor="chart-query" className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Chart Request
            </label>
            <textarea
              id="chart-query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Plot the number of items for various categories"
              className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent resize-none placeholder-gray-500"
              style={{ 
                borderColor: 'var(--line)', 
                color: 'var(--text)', 
                backgroundColor: 'var(--surface)'
              }}
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Chart Type Preference */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
              Chart Type
            </label>
            <div className="flex space-x-2">
              {(['bar', 'line', 'area', 'pie'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPreferredChart(preferredChart === type ? null : type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                    preferredChart === type
                      ? 'bg-[#2563EB] text-white'
                      : 'hover:opacity-70'
                  }`}
                  style={{
                    backgroundColor: preferredChart === type ? '#2563EB' : 'var(--line)',
                    color: preferredChart === type ? 'white' : 'var(--text)'
                  }}
                  disabled={isLoading}
                >
                  {getChartIcon(type)}
                  <span className="capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="w-full bg-[#2563EB] text-white py-3 px-6 rounded-xl font-medium hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Chart...
              </>
            ) : (
              <>
                <BarChart3 className="w-5 h-5 mr-2" />
                Generate Chart
              </>
            )}
          </button>

        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <div>
              <h3 className="text-sm font-semibold text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="mt-3 text-sm text-red-600 hover:text-red-800 flex items-center font-medium"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Try Again
          </button>
        </div>
      )}

      {/* Chart Display */}
      {lastResponse && (
        <div className="flex-1 border-t pt-6" style={{ borderColor: 'var(--line)' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Generated Chart</h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={downloadChart}
                className="flex items-center space-x-2 px-3 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-xl hover:opacity-95 transition-colors"
                title="Download chart as PNG"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
              <button
                onClick={clearChart}
                className="text-sm font-medium hover:text-blue-600 transition-colors"
                style={{ color: 'var(--text)' }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Chart Container */}
          <div className="border rounded-2xl p-6 mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--line)' }}>
            <div id="chart-container" ref={containerRef} className="w-full flex items-center justify-center" style={{ minHeight: `${chartHeight + 20}px`, minWidth: '100%' }}>
              {lastResponse && lastResponse.data && lastResponse.data.length > 0 ? (
                renderChart(lastResponse.data, lastResponse.meta.chartType, containerWidth || 600)
              ) : (
                <div className="text-sm text-gray-500">No chart data available</div>
              )}
            </div>
          </div>

          {/* Data Preview */}
          <div>
            <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Data Preview</h4>

            <div className="max-h-48 overflow-y-auto rounded-2xl border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--line)' }}>
              <table className="w-full text-sm" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
                <colgroup>
                  <col style={{ width: '50%', minWidth: '120px' }} />
                  <col style={{ width: '50%', minWidth: '120px' }} />
                </colgroup>
                <thead style={{ backgroundColor: 'rgba(var(--line), 0.3)' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text)', wordBreak: 'break-word', minWidth: '120px' }}>
                      <div className="truncate" title={lastResponse.meta.dimension || 'Category'}>
                        {lastResponse.meta.dimension || 'Category'}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'var(--text)', wordBreak: 'break-word', minWidth: '120px' }}>
                      <div className="truncate" title={lastResponse.meta.measure || 'Value'}>
                        {lastResponse.meta.measure || 'Value'}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--line)' }}>
                  {lastResponse.data.slice(0, 10).map((item, index) => (
                    <tr key={index} className="transition-colors hover:bg-gray-100">
                      <td className="px-4 py-3">
                        <div className="truncate text-sm font-medium" style={{ color: 'var(--text)' }} title={item.label}>
                          {item.label}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="truncate text-sm" style={{ color: 'var(--text)' }}>
                          {item.value.toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {lastResponse.data.length > 10 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-sm text-gray-500 text-center" style={{ backgroundColor: 'rgba(var(--line), 0.3)' }}>
                        ... and {lastResponse.data.length - 10} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
