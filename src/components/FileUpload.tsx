'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase'
import { colors } from '@/lib/tokens'
import { CloudArrowUpIcon, DocumentIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline'

interface FileRecord {
  id: string
  filename: string
  storage_path?: string
  file_size: number
  file_type: string
  status: 'uploaded' | 'processing' | 'processed' | 'error'
  created_at: string
}

export default function FileUpload({ userId }: { userId: string }) {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [q, setQ] = useState('')
  const [queryInput, setQueryInput] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(9)
  const [total, setTotal] = useState(0)
  const [uploading, setUploading] = useState(false)
  const uploadingRef = useRef(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [processingFiles, setProcessingFiles] = useState<string[]>([])
  const [isPolling, setIsPolling] = useState(true)
  const isPollingRef = useRef(true)
  const currentReqId = useRef(0)
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  
  const supabase = createClient()

  const fetchFiles = useCallback(async (force: boolean = true) => {
    if (!force && !isPollingRef.current) return; // Skip if not forced and polling disabled
    
    try {
      const reqId = ++currentReqId.current
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
      if (q.trim()) params.set('q', q.trim())
      // Fast path: do not sign on initial fetch, sign lazily on demand
      const res = await fetch(`/api/uploads/recent?${params.toString()}&sign=0`, { cache: 'no-store', credentials: 'same-origin' })
      if (res.status === 401) {
        // Session lost; preserve current list and stop polling
        isPollingRef.current = false;
        setIsPolling(false)
        return
      }
      if (!res.ok) throw new Error('Failed to load uploads')
      const body = await res.json()
      const newFiles: any[] = (body.items || []).map((f: any) => ({ ...f }))
      const meta = body.pagination || { total: newFiles.length }
      if (reqId === currentReqId.current) {
        setTotal(meta.total || 0)
        setFiles(newFiles as FileRecord[])
      }
      const stillProcessing: string[] = []
      newFiles.forEach((file: any) => {
        if (file.status === 'processing' || file.status === 'uploaded') {
          stillProcessing.push(file.id)
        }
      })
      setProcessingFiles(stillProcessing)
    } catch (error) {
      console.error('Error fetching files:', error)
      setError('Unable to load recent uploads. Please try again later.')
    }
  }, [page, pageSize, q])

  // Debounce search input updates
  useEffect(() => {
    const id = setTimeout(() => {
      setQ(queryInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(id)
  }, [queryInput])

  // Fetch existing files on component mount
  useEffect(() => {
    if (!isPolling) return
    
    fetchFiles(true)
    const id = setInterval(() => {
      if (isPollingRef.current) {
        fetchFiles(false)
      }
    }, 10000)
    return () => clearInterval(id)
  }, [userId, isPolling, fetchFiles])

  // Poll for status updates on processing files
  useEffect(() => {
    if (processingFiles.length === 0 || !isPolling) return

    const interval = setInterval(async () => {
      if (isPollingRef.current) {
        await fetchFiles()
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(interval)
  }, [processingFiles, isPolling, fetchFiles])

  // Update ref when state changes
  useEffect(() => {
    isPollingRef.current = isPolling;
  }, [isPolling]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      isPollingRef.current = false;
      setIsPolling(false)
    }
  }, [])

  const getFileType = (file: File): string => {
    if (file.type === 'text/csv') return 'csv'
    if (file.type.includes('excel') || file.type.includes('spreadsheet') || file.type.includes('xlsx') || file.type.includes('xls')) return 'xlsx'
    if (file.type === 'application/json') return 'json'
    if (file.type === 'application/pdf') return 'pdf'
    return 'unknown'
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'csv':
        return <DocumentIcon className="w-5 h-5 text-green-500" />
      case 'xlsx':
        return <DocumentIcon className="w-5 h-5 text-green-600" />
      case 'json':
        return <DocumentIcon className="w-5 h-5 text-yellow-500" />
      case 'pdf':
        return <DocumentIcon className="w-5 h-5 text-red-500" />
      default:
        return <DocumentIcon className="w-5 h-5 text-gray-500" />
    }
  }

  // Build a readable, accessible HTML table for preview
  const escapeHtml = (value: any): string => {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  const renderTableHtml = (headers: string[], rows: any[][]): string => {
    const head = `<thead style=\"position:sticky;top:0;background:var(--surface);z-index:1\"><tr>${headers
      .map(h => `<th style=\"text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);font-size:12px;color:var(--text)\">${escapeHtml(h)}</th>`)
      .join('')}</tr></thead>`
    const body = `<tbody>${rows
      .map((r, idx) => `<tr style=\"background:${idx % 2 ? 'var(--surface-2)' : 'transparent'}\">${r
        .map(c => `<td style=\"padding:6px 10px;border-bottom:1px solid var(--line);font-size:12px;color:var(--text)\">${escapeHtml(c)}</td>`)
        .join('')}</tr>`)
      .join('')}</tbody>`
    return `<div style=\"max-height:60vh;overflow:auto\"><table style=\"border-collapse:collapse;width:100%\">${head}${body}</table></div>`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg font-medium">Uploaded</span>
      case 'processing':
        return <span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-lg font-medium">Processing</span>
      case 'processed':
        return <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-lg font-medium">Processed</span>
      case 'error':
        return <span className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-lg font-medium">Error</span>
      default:
        return <span className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded-lg font-medium">{status}</span>
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const uploadFile = async (file: File) => {
    try {
      setUploading(true)
      uploadingRef.current = true
      setError(null)
      
      const formData = new FormData()
      formData.append('file', file)

      // Add a timeout to avoid hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        credentials: 'same-origin'
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let message = 'Upload failed'
        try {
          const ct = response.headers.get('content-type') || ''
          if (ct.includes('application/json')) {
            const errorData = await response.json()
            message = errorData.error || message
          } else {
            message = await response.text() || message
          }
        } catch {}
        throw new Error(message)
      }

      const result = await response.json()
      
      // Add new file to the list
      setFiles(prev => [result.file, ...prev])
      setSuccess(`File "${file.name}" uploaded successfully!`)
      
      // Stop showing uploading indicator as soon as upload finishes
      setUploading(false)
      uploadingRef.current = false
      // Reset file input so selecting the same file again triggers onChange
      const input = document.getElementById('file-upload') as HTMLInputElement | null
      if (input) input.value = ''
      
      // Process the file (status updates will be reflected by polling)
      await processFile(result.file.id, getFileType(file))
      
    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
      uploadingRef.current = false
      const input = document.getElementById('file-upload') as HTMLInputElement | null
      if (input) input.value = ''
    }
  }

  const uploadFiles = async (filesToUpload: File[]) => {
    if (!filesToUpload || filesToUpload.length === 0) return
    for (const f of filesToUpload) {
      await uploadFile(f)
    }
  }

  const processFile = async (fileId: string, fileType: string) => {
    try {
      // Add file to processing array
      setProcessingFiles(prev => [...prev, fileId])
      
      // Update local status to processing
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'processing' as const } : f
      ))
      
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, userId }),
        credentials: 'same-origin'
      })

      if (!response.ok) {
        let errorMessage = 'Processing failed'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (jsonError) {
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      // Fetch updated status from database immediately and once more after a short delay
      await fetchFiles(true)
      setTimeout(() => fetchFiles(true), 2000)

    } catch (error) {
      console.error('Processing error:', error)
      
      // Update local status to error
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'error' as const } : f
      ))
      
      // Remove from processing array
      setProcessingFiles(prev => prev.filter(id => id !== fileId))
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArr = Array.from(e.dataTransfer.files)
      uploadFiles(filesArr)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : []
    if (selected.length > 0) {
      uploadFiles(selected)
    }
    // Always reset the input immediately to ensure subsequent selections fire onChange
    e.currentTarget.value = ''
  }

  const deleteFile = async (fileId: string) => {
    try {
      const res = await fetch('/api/uploads/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: fileId }) })
      if (!res.ok) throw new Error('Failed to delete')

      setFiles(prev => prev.filter(f => f.id !== fileId))
      setSuccess('File deleted successfully')
    } catch (error) {
      console.error('Delete error:', error)
      setError('Failed to delete file')
    }
  }

  const retryFile = async (fileId: string, fileType: string) => {
    try {
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'processing' as const } : f
      ))
      
      setProcessingFiles(prev => [...prev, fileId])
      
      await processFile(fileId, fileType)
      
      setSuccess('File processing retried successfully')
    } catch (error) {
      console.error('Retry error:', error)
      setError('Failed to retry file processing')
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Data Section */}
      <div className="rounded-2xl border p-6 shadow-sm" style={{ background: colors.surface, borderColor: colors.line, color: colors.text }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>Upload Data</h3>
        
        {/* Drag & Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
            dragActive 
              ? 'border-[#2563EB] bg-blue-50' 
              : 'border-brand-line hover:border-[#2563EB] hover:bg-blue-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <CloudArrowUpIcon className="w-12 h-12 text-[#2563EB] mx-auto mb-4" />
          <p className="mb-2" style={{ color: 'var(--text)' }}>Drop files here or click to upload</p>
          <p className="text-sm text-gray-600 mb-4">Supports CSV, Excel, JSON files</p>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileSelect}
            accept=".csv,.xlsx,.xls,.json,.pdf"
            multiple
            disabled={uploading}
          />
          <label
            htmlFor="file-upload"
            className="bg-[#2563EB] text-white px-4 py-2 rounded-xl font-medium hover:opacity-95 transition-colors cursor-pointer inline-block shadow-sm"
          >
            {uploading ? 'Uploading...' : 'Choose Files'}
          </label>
        </div>

        {/* File Info */}
        <div className="mt-4 text-sm text-gray-600 space-y-1">
          <p>Maximum file size: 50MB</p>
          <p>Supported formats: CSV, Excel, JSON</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">
          <div className="flex items-center">
            <span className="text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4">
          <div className="flex items-center">
            <span className="text-green-700">{success}</span>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-400 hover:text-green-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Recent Uploads */}
      <div className="rounded-2xl border p-6 shadow-sm" style={{ background: colors.surface, borderColor: colors.line, color: colors.text }}>
        <div className="flex items-center justify-between mb-4 gap-2">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Recent Uploads</h3>
          <div className="relative w-full max-w-xs">
            <input
              value={queryInput}
              onChange={e => setQueryInput(e.target.value)}
              placeholder="Search filename..."
              aria-label="Search filename"
              className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40"
              style={{ background: colors.surface2, borderColor: colors.line, color: colors.text }}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>🔎</span>
          </div>
        </div>
        {files.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <DocumentIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm">No files uploaded yet</p>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="p-3 rounded-xl border flex flex-col transition-transform hover:shadow-md hover:-translate-y-[1px]"
                style={{ background: colors.surface2, borderColor: colors.line }}
                role="group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#2563EB]/10 rounded-lg flex items-center justify-center">
                      {getFileIcon(file.file_type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]" style={{ color: 'var(--text)' }}>{file.filename}</p>
                      <p className="text-[11px] text-gray-500">{formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {getStatusBadge(file.status)}
                </div>
                <div className="mt-auto flex items-center justify-end gap-1 pt-1">
                  {/* Preview */}
                  {file.status === 'processed' && (
                    <button
                      onClick={async () => {
                        try {
                          let url = (file as any).download_url as string | undefined
                          if (!url) {
                            const path = (file as any).storage_path
                            if (path) {
                              const resp = await fetch('/api/uploads/sign', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'same-origin',
                                body: JSON.stringify({ path })
                              })
                              if (resp.ok) {
                                const j = await resp.json()
                                url = j.url
                                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, download_url: url } as any : f))
                              }
                            }
                          }
                          if (!url) return
                          const resp = await fetch(url)
                          const text = await resp.text()
                          if (file.file_type === 'json') {
                            try {
                              const obj = JSON.parse(text)
                              setPreviewHtml(`<pre style=\"white-space:pre-wrap; font-size:12px\">${JSON.stringify(obj, null, 2)}</pre>`)
                            } catch {
                              setPreviewHtml(`<pre style=\"white-space:pre-wrap; font-size:12px\">${text}</pre>`)
                            }
                          } else {
                            // CSV/TSV and other text: use PapaParse for robust parsing
                            const parsed = Papa.parse<string[]>(text, { dynamicTyping: false })
                            const data: any[][] = Array.isArray(parsed.data) ? (parsed.data as any[][]) : []
                            const limited = data.slice(0, 50)
                            const headers = (limited[0] || []).map(String)
                            const rows = limited.slice(1)
                            setPreviewHtml(renderTableHtml(headers, rows))
                          }
                          setPreviewFile(file)
                        } catch (e) {
                          console.warn('Preview failed', e)
                        }
                      }}
                      className="p-2 rounded-md border hover:bg-[var(--primary)] hover:text-white transition-colors"
                      title="Preview"
                      style={{ borderColor: colors.line }}
                    >
                      🔍
                    </button>
                  )}
                  {file.status === 'error' && (
                    <button
                      onClick={() => retryFile(file.id, file.file_type)}
                      className="p-2 rounded-md border hover:bg-[var(--primary)] hover:text-white transition-colors"
                      title="Retry processing"
                      style={{ borderColor: 'var(--line)' }}
                    >
                      ↻
                    </button>
                  )}
                  {file.status === 'processed' && (
                    <button
                      onClick={async () => {
                        let url = (file as any).download_url
                        if (!url) {
                          // Lazy sign on demand
                          const path = (file as any).storage_path
                          if (path) {
                            try {
                              const resp = await fetch('/api/uploads/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ path }) })
                              if (resp.ok) {
                                const j = await resp.json()
                                url = j.url
                                // Optimistically store to avoid re-sign next time
                                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, download_url: url } as any : f))
                              }
                            } catch {}
                          }
                        }
                        if (!url) return
                        const a = document.createElement('a')
                        a.href = url
                        a.download = file.filename
                        a.click()
                      }}
                      className="p-2 rounded-md border hover:bg-[var(--primary)] hover:text-white transition-colors"
                      title="Download"
                      style={{ borderColor: colors.line }}
                    >
                      ⬇️
                    </button>
                  )}
                  <button
                    onClick={() => deleteFile(file.id)}
                    className="p-2 rounded-md border hover:bg-red-500 hover:text-white transition-colors"
                    title="Delete file"
                    style={{ borderColor: colors.line }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-sm">
            <div className="text-[var(--text-muted)]">{(total === 0) ? '0' : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)}`} of {total}</div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-md border disabled:opacity-50"
                style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
              >
                Previous
              </button>
              <button
                disabled={page * pageSize >= total}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded-md border disabled:opacity-50"
                style={{ borderColor: 'var(--line)', color: 'var(--text)' }}
              >
                Next
              </button>
            </div>
          </div>
          </>
        )}
      </div>
      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => { setPreviewFile(null); setPreviewHtml(null) }}>
          <div className="rounded-2xl border shadow-xl max-w-3xl w-[90%] max-h-[80vh] overflow-auto" style={{ background: 'var(--surface)', borderColor: 'var(--line)', color: 'var(--text)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--line)' }}>
              <div className="text-sm font-semibold">Preview: {previewFile.filename}</div>
              <button className="px-2 py-1 rounded-md border" style={{ borderColor: 'var(--line)' }} onClick={() => { setPreviewFile(null); setPreviewHtml(null) }}>Close</button>
            </div>
            <div className="p-4 text-sm" dangerouslySetInnerHTML={{ __html: previewHtml || '<div>No preview</div>' }} />
          </div>
        </div>
      )}
    </div>
  )
}
