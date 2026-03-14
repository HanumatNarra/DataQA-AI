import { OpenAI } from 'openai'

type ParsedRow = Record<string, string>

export interface InsightResult {
  message: string
  insights: string[]
  stats: Record<string, unknown>
}

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

export function detectInsightIntent(query: string): boolean {
  const q = (query || '').toLowerCase()
  return /\binsight(s)?\b|\bsuggestion(s)?\b|\brecommendation(s)?\b|\bwhat\s+stands\s+out\b|\bpattern(s)?\b|\btrend(s)?\b|\banomal(y|ies)\b/.test(q)
}

export async function generateInsights(chunks: any[]): Promise<InsightResult> {
  // Parse rows from chunk_text
  const rows: ParsedRow[] = chunks.map((c: any) => parseRow(c.chunk_text)).filter(Boolean)
  const byFile = groupBy(chunks, (c: any) => c.filename || c.user_files?.filename || c.metadata?.file_name || 'unknown')

  const stats: Record<string, unknown> = {}
  const insights: string[] = []

  Object.entries(byFile).forEach(([file, fileChunks]) => {
    const fileRows: ParsedRow[] = (fileChunks as any[]).map(c => parseRow(c.chunk_text)).filter(Boolean)
    const fieldNames = inferFields(fileRows)
    const fieldTypes = inferFieldTypes(fileRows, fieldNames)
    const fieldStats: Record<string, unknown> = {}

    // Numeric fields: min, max, mean
    const numericFields = fieldNames.filter(f => fieldTypes[f] === 'number')
    numericFields.forEach(field => {
      const values = fileRows.map(r => toNumber(r[field])).filter((n): n is number => Number.isFinite(n))
      if (values.length === 0) return
      const sum = values.reduce((a, b) => a + b, 0)
      const mean = sum / values.length
      const min = Math.min(...values)
      const max = Math.max(...values)
      fieldStats[field] = { count: values.length, mean, min, max }
      insights.push(`${basename(file)}: ${pretty(field)} ranges ${fmt(min)}–${fmt(max)} (avg ${fmt(mean)}).`)
    })

    // Categorical fields: top frequencies
    const categoricalFields = fieldNames.filter(f => fieldTypes[f] === 'string')
    categoricalFields.forEach(field => {
      const freq = frequency(fileRows.map(r => r[field] || 'Unknown'))
      const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3)
      if (top.length > 0) {
        const total = fileRows.length
        const parts = top.map(([k, v]) => `${k} (${Math.round((v / total) * 100)}%)`)
        fieldStats[field] = { total, top }
        insights.push(`${basename(file)}: ${pretty(field)} top values → ${parts.join(', ')}.`)
      }
    })

    // Date-like fields: coverage window
    const dateFields = fieldNames.filter(f => fieldTypes[f] === 'date')
    dateFields.forEach(field => {
      const dates = fileRows
        .map(r => toDate(r[field]))
        .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()))
      if (dates.length === 0) return
      const min = new Date(Math.min(...dates.map(d => d.getTime())))
      const max = new Date(Math.max(...dates.map(d => d.getTime())))
      fieldStats[field] = { start: min.toISOString().split('T')[0], end: max.toISOString().split('T')[0] }
      insights.push(`${basename(file)}: ${pretty(field)} spans ${min.toISOString().split('T')[0]} to ${max.toISOString().split('T')[0]}.`)
    })

    stats[file] = {
      rows: fileRows.length,
      fields: fieldNames,
      types: fieldTypes,
      fieldStats
    }
  })

  const baseSummary = insights.length > 0
    ? `Here are data-driven observations:
- ${insights.join('\n- ')}`
    : 'I analyzed the uploaded data but could not derive notable insights from the available rows.'

  if (!openai) {
    return { message: baseSummary, insights, stats }
  }

  // Optionally polish with LLM (data-agnostic, no numbers invented)
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0.2,
      max_tokens: 350,
      messages: [
        { role: 'system', content: 'You are an analytics copilot. Rewrite provided insights into concise, business-helpful bullet points. NEVER invent numbers; echo only what is present. Keep 5 bullets max.' },
        { role: 'user', content: JSON.stringify({ insights, stats }) }
      ]
    })
    const text = completion.choices[0]?.message?.content?.trim()
    if (text && text.length > 0) {
      return { message: text, insights, stats }
    }
  } catch {
    // fall back silently
  }

  return { message: baseSummary, insights, stats }
}

// Helpers
function parseRow(text: string): ParsedRow {
  const obj: ParsedRow = {}
  if (!text || typeof text !== 'string') return obj
  text.split(', ').forEach(pair => {
    const idx = pair.indexOf(':')
    if (idx > -1) {
      const key = pair.slice(0, idx).trim()
      const value = pair.slice(idx + 1).trim()
      if (key) obj[key] = value
    }
  })
  return obj
}

function groupBy<T>(arr: T[], keyFn: (t: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = keyFn(item)
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

function inferFields(rows: ParsedRow[]): string[] {
  const set = new Set<string>()
  rows.slice(0, 50).forEach(r => Object.keys(r).forEach(k => set.add(k)))
  return Array.from(set)
}

function inferFieldTypes(rows: ParsedRow[], fields: string[]): Record<string, 'number' | 'date' | 'string'> {
  const types: Record<string, 'number' | 'date' | 'string'> = {}
  const sample = rows.slice(0, 200)
  fields.forEach(f => {
    const values = sample.map(r => r[f]).filter(v => v !== undefined && v !== null)
    const numeric = values.filter(v => Number.isFinite(toNumber(v))).length / (values.length || 1)
    const dated = values.filter(v => toDate(v) instanceof Date && !isNaN(toDate(v)!.getTime())).length / (values.length || 1)
    if (numeric > 0.8) types[f] = 'number'
    else if (dated > 0.6) types[f] = 'date'
    else types[f] = 'string'
  })
  return types
}

function frequency(values: string[]): Record<string, number> {
  return values.reduce((acc, v) => {
    const key = (v ?? 'Unknown').toString()
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return v
  if (typeof v !== 'string') return null
  const n = Number(v.replace(/[$,%]/g, ''))
  return Number.isFinite(n) ? n : null
}

function toDate(v: unknown): Date | null {
  if (v instanceof Date) return v
  if (typeof v !== 'string') return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return `${n}`
  const abs = Math.abs(n)
  if (abs >= 1000) return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n)
  return n.toFixed(2).replace(/\.00$/, '')
}

function pretty(s: string): string {
  return s.replace(/[_-]/g, ' ')
}

function basename(path: string): string {
  if (!path) return 'data'
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}



