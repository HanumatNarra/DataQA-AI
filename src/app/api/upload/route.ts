import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServerClient, verifyBearerToken } from '@/lib/supabase'
import { z } from 'zod'
import { apiLogger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user via route handler client (handles cookie refresh)
    const authClient = await createRouteHandlerClient()
    let user = undefined as any
    try {
      const { data } = await authClient.auth.getUser()
      user = data?.user
    } catch (e) {
      apiLogger.warn('auth.getUser() failed, trying Authorization header fallback', {
        route: 'upload',
        error: e instanceof Error ? e.message : 'Unknown error'
      })
    }

    if (!user) {
      const authHeader = request.headers.get('authorization') || ''
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        user = await verifyBearerToken(token)
      }
    }

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Admin client for privileged storage/db ops
    const supabase = createServerClient()

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size too large. Maximum 10MB allowed.' }, { status: 400 })
    }

    // Detect and validate file type (supports cases where file.type is empty)
    const detectFileType = (f: File): string => {
      const mime = f.type || ''
      const name = (f.name || '').toLowerCase()
      if (mime === 'text/csv' || name.endsWith('.csv')) return 'csv'
      if (
        mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mime === 'application/vnd.ms-excel' ||
        mime.includes('spreadsheet') ||
        mime.includes('excel') ||
        name.endsWith('.xlsx') ||
        name.endsWith('.xls')
      ) return 'xlsx'
      if (mime === 'application/json' || name.endsWith('.json')) return 'json'
      if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
      return 'unknown'
    }

    const normalizedFileType = detectFileType(file)
    if (normalizedFileType === 'unknown') {
      return NextResponse.json({ error: 'File type not supported' }, { status: 400 })
    }

    // Generate unique filename for storage
    const timestamp = Date.now()
    const storageFileName = `${user.id}/${timestamp}_${file.name}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(storageFileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      apiLogger.error('Upload error', uploadError, {
        route: 'upload',
        userId: user.id
      })
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Insert file record into database with normalized file type
    const { data: fileRecord, error: dbError } = await supabase
      .from('user_files')
      .insert({
        user_id: user.id,
        filename: file.name,
        storage_path: storageFileName,
        file_type: normalizedFileType, // Use normalized file type
        file_size: file.size,
        status: 'uploaded'
      })
      .select()
      .single()

    if (dbError) {
      apiLogger.error('Database error', dbError, {
        route: 'upload',
        userId: user.id
      })
      return NextResponse.json({ error: 'Failed to save file record' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      file: fileRecord,
      message: 'File uploaded successfully'
    })

  } catch (error) {
    apiLogger.error('Upload error', error instanceof Error ? error : undefined, {
      route: 'upload',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
