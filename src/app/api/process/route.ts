import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase'
import { generateEmbeddings } from '@/lib/embeddings'
import { z } from 'zod'
import { apiLogger } from '@/lib/logger'

interface FileRecord {
  id: string
  filename: string
  storage_path?: string
  file_type: string
  file_size: number
  status: string
  created_at: string
}

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const supabase = createServerClient()

  try {
    apiLogger.info('Starting file processing request', { requestId })

    const body = await request.json()
    const schema = z.object({
      fileId: z.string().uuid().optional(),
      fileIds: z.array(z.string().uuid()).optional(),
      userId: z.string().uuid().optional(),
    })
    const { fileId, userId, fileIds } = schema.parse(body)

    // Validate auth from cookie or header where possible for server-side safety if needed later
    const cookieStore = await cookies()
    const cookieToken = cookieStore.get('sb-access-token')?.value
    if (!userId && !cookieToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Support both single file and multiple files
    const filesToProcess = fileIds || [fileId];
    
    if (!filesToProcess.length || !userId) {
      return NextResponse.json(
        { error: 'File ID(s) and User ID are required' },
        { status: 400 }
      )
    }
    
    apiLogger.info('Processing files for user', {
      requestId,
      fileCount: filesToProcess.length,
      userId
    })

    const results = [];
    
    // Process each file
    for (const currentFileId of filesToProcess) {
      try {
        apiLogger.info('Processing file', { requestId, fileId: currentFileId })

        // Get file record
        const { data: fileRecord, error: fileError } = await supabase
          .from('user_files')
          .select('*')
          .eq('id', currentFileId)
          .eq('user_id', userId)
          .single()
        
        if (fileError || !fileRecord) {
          apiLogger.error('File not found', fileError ?? undefined, {
            requestId,
            fileId: currentFileId
          })
          results.push({
            fileId: currentFileId,
            success: false,
            error: 'File not found'
          });
          continue;
        }

        apiLogger.info('Processing file by type', {
          requestId,
          fileId: currentFileId,
          fileType: fileRecord.file_type
        })
        
        // Update status to processing
        await supabase
          .from('user_files')
          .update({ status: 'processing' })
          .eq('id', currentFileId)
        
        let processingResult: any = {}
        
        try {
          // Download file from storage
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('user-files')
            .download(fileRecord.storage_path!)
          
          if (downloadError) {
            throw new Error(`Failed to download file: ${downloadError.message}`)
          }
          
          apiLogger.info('File found', {
            requestId,
            filename: fileRecord.filename,
            fileSize: fileRecord.file_size,
            fileType: fileRecord.file_type
          })
          
          // Process based on file type
          switch (fileRecord.file_type) {
            case 'csv':
              apiLogger.info('Processing CSV file', { requestId, fileId: currentFileId })
              processingResult = await processCSVFile(supabase, fileRecord, userId, requestId, fileData)
              break

            case 'xlsx':
            case 'xls':
              apiLogger.info('Processing Excel file', { requestId, fileId: currentFileId })
              processingResult = await processExcelFile(supabase, fileRecord, userId, requestId, fileData)
              break

            case 'json':
              apiLogger.info('Processing JSON file', { requestId, fileId: currentFileId })
              processingResult = await processJSONFile(supabase, fileRecord, userId, requestId, fileData)
              break

            case 'pdf':
              apiLogger.info('Processing PDF file', { requestId, fileId: currentFileId })
              processingResult = await processPDFFile(supabase, fileRecord, userId, requestId, fileData)
              break

            default:
              apiLogger.warn('Unsupported file type', {
                requestId,
                fileType: fileRecord.file_type
              })
              throw new Error(`Unsupported file type: ${fileRecord.file_type}`)
          }
          
          // Update status to processed
          apiLogger.info('Updating file status to processed', {
            requestId,
            fileId: currentFileId
          })
          const { error: updateError } = await supabase
            .from('user_files')
            .update({
              status: 'processed'
            })
            .eq('id', currentFileId)
            .select()
          
          if (updateError) {
            apiLogger.error('Failed to update file status', updateError, {
              requestId,
              fileId: currentFileId
            })
            throw new Error(`Failed to update file status: ${updateError.message}`)
          }

          apiLogger.info('Successfully updated file status to processed', {
            requestId,
            fileId: currentFileId
          })
          
          // Verify the status was actually updated
          const { data: verifyData, error: verifyError } = await supabase
            .from('user_files')
            .select('status')
            .eq('id', currentFileId)
            .single()
          
          if (verifyError) {
            apiLogger.error('Failed to verify file status', verifyError, {
              requestId,
              fileId: currentFileId
            })
          } else {
            apiLogger.info('Verified file status in database', {
              requestId,
              fileId: currentFileId,
              status: verifyData.status
            })

            // If status is not 'processed', try to update it again
            if (verifyData.status !== 'processed') {
              apiLogger.warn('Status verification failed, attempting fallback update', {
                requestId,
                fileId: currentFileId,
                actualStatus: verifyData.status
              })
              const { error: fallbackError } = await supabase
                .from('user_files')
                .update({
                  status: 'processed'
                })
                .eq('id', currentFileId)
                .select()

              if (fallbackError) {
                apiLogger.error('Fallback status update failed', fallbackError, {
                  requestId,
                  fileId: currentFileId
                })
              } else {
                apiLogger.info('Fallback status update successful', {
                  requestId,
                  fileId: currentFileId
                })
              }
            }
          }
          
          results.push({
            fileId: currentFileId,
            success: true,
            filename: fileRecord.filename,
            chunksCreated: processingResult.chunksCreated || 0,
            message: `Successfully processed ${fileRecord.filename}`
          });
          
        } catch (processingError) {
          apiLogger.error('Error processing file', processingError instanceof Error ? processingError : undefined, {
            requestId,
            fileId: currentFileId,
            error: processingError instanceof Error ? processingError.message : 'Unknown error'
          })

          // Update status to failed
          apiLogger.info('Updating file status to failed', {
            requestId,
            fileId: currentFileId
          })
          const { error: updateError } = await supabase
            .from('user_files')
            .update({
              status: 'failed'
            })
            .eq('id', currentFileId)
            .select()

          if (updateError) {
            apiLogger.error('Failed to update file status to failed', updateError, {
              requestId,
              fileId: currentFileId
            })
          } else {
            apiLogger.info('Successfully updated file status to failed', {
              requestId,
              fileId: currentFileId
            })
          }
          
          results.push({
            fileId: currentFileId,
            success: false,
            filename: fileRecord.filename,
            error: processingError instanceof Error ? processingError.message : 'Unknown error'
          });
        }
        
      } catch (fileError) {
        apiLogger.error('Error processing file', fileError instanceof Error ? fileError : undefined, {
          requestId,
          fileId: currentFileId,
          error: fileError instanceof Error ? fileError.message : 'Unknown error'
        })
        results.push({
          fileId: currentFileId,
          success: false,
          error: fileError instanceof Error ? fileError.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    apiLogger.info('Processing complete', {
      requestId,
      successCount,
      failureCount,
      totalFiles: results.length
    })
    
    return NextResponse.json({
      success: true,
      message: `Processed ${filesToProcess.length} file(s): ${successCount} successful, ${failureCount} failed`,
      results
    })
    
  } catch (error) {
    apiLogger.error('Unexpected error in file processing', error instanceof Error ? error : undefined, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Process CSV files with unified embedding approach
async function processCSVFile(supabase: any, fileRecord: FileRecord, userId: string, requestId: string, fileData: any) {
  apiLogger.info('Processing CSV file', {
    requestId,
    filename: fileRecord.filename
  })

  try {
    const storagePath = fileRecord.storage_path
    apiLogger.info('Using storage path', { requestId, storagePath })

    // Parse CSV content
    apiLogger.info('Starting CSV parsing', { requestId })
    const text = await fileData.text()
    apiLogger.info('File content loaded', {
      requestId,
      contentLength: text.length
    })

    const { default: Papa } = await import('papaparse')
    apiLogger.info('Papa.parse imported successfully', { requestId })

    const { data: rows, errors } = Papa.parse(text, { header: true })
    apiLogger.info('Papa.parse completed', { requestId })

    if (errors.length > 0) {
      apiLogger.warn('CSV parsing warnings', {
        requestId,
        errorCount: errors.length,
        errors
      })
    }

    apiLogger.info('CSV parsed', {
      requestId,
      rowCount: rows.length,
      columnCount: Object.keys(rows[0] || {}).length
    })

    if (rows.length === 0) {
      apiLogger.warn('No rows found in CSV', { requestId })
      return {
        status: 'completed',
        rowsProcessed: 0,
        columns: [],
        chunksCreated: 0,
        processingNote: 'CSV file contained no data rows'
      }
    }

    // Store basic table info
    apiLogger.info('Storing table info', { requestId })
    const { error: tableError } = await supabase
      .from('user_tables')
      .insert({
        user_id: userId,
        file_id: fileRecord.id,
        table_name: `table_${fileRecord.id.replace(/-/g, '_')}`,
        columns: rows[0] ? Object.keys(rows[0]) : [],
        row_count: rows.length,
        sample_data: rows.slice(0, 5)
      })
      .select()
      .single()
    
    if (tableError) {
      apiLogger.error('Failed to save table info', tableError, { requestId })
      throw tableError
    }
    apiLogger.info('Table info stored successfully', { requestId })

    // Create embeddings for each row (unified approach)
    apiLogger.info('Creating chunks for rows', {
      requestId,
      rowCount: rows.length
    })
    const chunks = rows.map((row: any, index: number) => {
      // Convert row to meaningful text representation
      const rowText = Object.entries(row)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
      
      return {
        text: rowText,
        index: index,
        metadata: {
          row_index: index,
          file_name: fileRecord.filename,
          file_type: 'csv',
          columns: Object.keys(row)
        }
      }
    })
    
    apiLogger.info('Created chunks, generating embeddings', {
      requestId,
      chunkCount: chunks.length
    })

    // Generate embeddings for all chunks
    const texts = chunks.map(chunk => chunk.text)
    const embeddings = await generateEmbeddings(texts)
    apiLogger.info('Generated embeddings', {
      requestId,
      embeddingCount: embeddings.length
    })

    // Store chunks with embeddings (unified storage)
    apiLogger.info('Storing chunks with embeddings', { requestId })
    let successfulChunks = 0
    for (let i = 0; i < chunks.length; i++) {
      try {
        const { error: chunkError } = await supabase.from('pdf_chunks').insert({
          user_id: userId,
          file_id: fileRecord.id,
          chunk_type: 'csv_row',
          chunk_index: i,
          chunk_text: chunks[i].text,
          embedding: embeddings[i],
          metadata: chunks[i].metadata
        })
        
        if (chunkError) {
          apiLogger.error('Failed to save CSV chunk', chunkError, {
            requestId,
            chunkIndex: i
          })
          // Continue with other chunks instead of failing completely
        } else {
          successfulChunks++
        }
      } catch (chunkError) {
        apiLogger.error('Exception saving CSV chunk', chunkError instanceof Error ? chunkError : undefined, {
          requestId,
          chunkIndex: i
        })
        // Continue with other chunks
      }
    }

    apiLogger.info('Successfully saved CSV chunks with embeddings', {
      requestId,
      successfulChunks,
      totalChunks: chunks.length
    })
    
    if (successfulChunks === 0) {
      throw new Error('Failed to save any chunks to database')
    }
    
    return {
      status: 'completed',
      rowsProcessed: rows.length,
      columns: Object.keys(rows[0] || {}),
      chunksCreated: chunks.length,
      processingNote: 'CSV rows converted to embeddings for unified search'
    }
    
  } catch (error) {
    apiLogger.error('CSV processing error', error instanceof Error ? error : undefined, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// Process Excel files with unified embedding approach
async function processExcelFile(supabase: any, fileRecord: FileRecord, userId: string, requestId: string, fileData: any) {
  apiLogger.info('Processing Excel file', {
    requestId,
    filename: fileRecord.filename
  })

  try {
    const arrayBuffer = await fileData.arrayBuffer()
    const { default: XLSX } = await import('xlsx')
    const workbook = XLSX.read(arrayBuffer)

    // Get first sheet
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(worksheet)

    apiLogger.info('Excel parsed', {
      requestId,
      rowCount: rows.length,
      columnCount: Object.keys(rows[0] || {}).length
    })

    // Store basic table info
    const { error: tableError } = await supabase
      .from('user_tables')
      .insert({
        user_id: userId,
        file_id: fileRecord.id,
        table_name: `table_${fileRecord.id.replace(/-/g, '_')}`,
        columns: rows[0] ? Object.keys(rows[0]) : [],
        row_count: rows.length,
        sample_data: rows.slice(0, 5)
      })
      .select()
      .single()

    if (tableError) {
      apiLogger.error('Failed to save table info', tableError, { requestId })
      throw tableError
    }
    
    // Create embeddings for each row (unified approach)
    const chunks = rows.map((row: any, index: number) => {
      // Convert row to meaningful text representation
      const rowText = Object.entries(row)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
      
      return {
        text: rowText,
        index: index,
        metadata: {
          row_index: index,
          file_name: fileRecord.filename,
          file_type: 'excel',
          columns: Object.keys(row)
        }
      }
    })
    
    // Generate embeddings for all chunks
    const texts = chunks.map(chunk => chunk.text)
    const embeddings = await generateEmbeddings(texts)
    apiLogger.info('Generated embeddings for Excel', {
      requestId,
      embeddingCount: embeddings.length
    })

    // Store chunks with embeddings (unified storage)
    let successfulChunks = 0
    for (let i = 0; i < chunks.length; i++) {
      try {
        const { error: chunkError } = await supabase.from('pdf_chunks').insert({
          user_id: userId,
          file_id: fileRecord.id,
          chunk_type: 'excel_row',
          chunk_index: i,
          chunk_text: chunks[i].text,
          embedding: embeddings[i],
          metadata: chunks[i].metadata
        })

        if (chunkError) {
          apiLogger.error('Failed to save Excel chunk', chunkError, {
            requestId,
            chunkIndex: i
          })
          // Continue with other chunks instead of failing completely
        } else {
          successfulChunks++
        }
      } catch (chunkError) {
        apiLogger.error('Exception saving Excel chunk', chunkError instanceof Error ? chunkError : undefined, {
          requestId,
          chunkIndex: i
        })
        // Continue with other chunks
      }
    }

    apiLogger.info('Successfully saved Excel chunks with embeddings', {
      requestId,
      successfulChunks,
      totalChunks: chunks.length
    })
    
    if (successfulChunks === 0) {
      throw new Error('Failed to save any Excel chunks to database')
    }
    
    return {
      status: 'completed',
      rowsProcessed: rows.length,
      columns: Object.keys(rows[0] || {}),
      chunksCreated: chunks.length,
      processingNote: 'Excel rows converted to embeddings for unified search'
    }
    
  } catch (error) {
    apiLogger.error('Excel processing error', error instanceof Error ? error : undefined, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// Process JSON files with unified embedding approach
async function processJSONFile(supabase: any, fileRecord: FileRecord, userId: string, requestId: string, fileData: any) {
  apiLogger.info('Processing JSON file', {
    requestId,
    filename: fileRecord.filename
  })

  try {
    const text = await fileData.text()
    const data = JSON.parse(text)

    // Handle different JSON structures
    let rows: any[] = []
    if (Array.isArray(data)) {
      rows = data
    } else if (typeof data === 'object') {
      rows = [data]
    } else {
      throw new Error('Unsupported JSON structure')
    }

    apiLogger.info('JSON parsed', {
      requestId,
      rowCount: rows.length,
      columnCount: Object.keys(rows[0] || {}).length
    })

    // Store basic table info
    const { error: tableError } = await supabase
      .from('user_tables')
      .insert({
        user_id: userId,
        file_id: fileRecord.id,
        table_name: `table_${fileRecord.id.replace(/-/g, '_')}`,
        columns: rows[0] ? Object.keys(rows[0]) : [],
        row_count: rows.length,
        sample_data: rows.slice(0, 5)
      })
      .select()
      .single()

    if (tableError) {
      apiLogger.error('Failed to save table info', tableError, { requestId })
      throw tableError
    }
    
    // Create embeddings for each row (unified approach)
    const chunks = rows.map((row: any, index: number) => {
      // Convert row to meaningful text representation
      const rowText = Object.entries(row)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
      
      return {
        text: rowText,
        index: index,
        metadata: {
          row_index: index,
          file_name: fileRecord.filename,
          file_type: 'json',
          columns: Object.keys(row)
        }
      }
    })
    
    // Generate embeddings for all chunks
    const texts = chunks.map(chunk => chunk.text)
    const embeddings = await generateEmbeddings(texts)
    apiLogger.info('Generated embeddings for JSON', {
      requestId,
      embeddingCount: embeddings.length
    })

    // Store chunks with embeddings (unified storage)
    for (let i = 0; i < chunks.length; i++) {
      const { error: chunkError } = await supabase.from('pdf_chunks').insert({
        user_id: userId,
        file_id: fileRecord.id,
        chunk_type: 'json_row',
        chunk_index: i,
        chunk_text: chunks[i].text,
        embedding: embeddings[i],
        metadata: chunks[i].metadata
      })

      if (chunkError) {
        apiLogger.warn('Failed to save JSON chunk', {
          requestId,
          chunkIndex: i,
          error: chunkError
        })
      }
    }

    apiLogger.info('Successfully saved JSON chunks with embeddings', {
      requestId,
      chunkCount: chunks.length
    })

    return {
      status: 'completed',
      rowsProcessed: rows.length,
      columns: Object.keys(rows[0] || {}),
      chunksCreated: chunks.length,
      processingNote: 'JSON rows converted to embeddings for unified search'
    }

  } catch (error) {
    apiLogger.error('JSON processing error', error instanceof Error ? error : undefined, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// Process PDF files with full text extraction and unified embedding approach
async function processPDFFile(supabase: any, fileRecord: FileRecord, userId: string, requestId: string, fileData: any) {
  apiLogger.info('Processing PDF file', {
    requestId,
    filename: fileRecord.filename
  })

  try {
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Import pdf-parse dynamically
    const pdfParseModule = await import('pdf-parse'); const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;

    // Extract text from PDF
    apiLogger.info('Extracting text from PDF', { requestId })
    const pdfData = await pdfParse(buffer)

    apiLogger.info('PDF text extracted', {
      requestId,
      pageCount: pdfData.numpages,
      characterCount: pdfData.text.length
    })

    // Split text into chunks (approximately 1000 characters per chunk with overlap)
    const CHUNK_SIZE = 1000
    const CHUNK_OVERLAP = 200
    const chunks: Array<{ text: string; index: number; metadata: any }> = []

    if (pdfData.text.trim().length === 0) {
      // PDF has no extractable text (might be scanned images)
      apiLogger.warn('PDF has no extractable text, storing metadata only', {
        requestId,
        pageCount: pdfData.numpages
      })
      chunks.push({
        text: `PDF document: ${fileRecord.filename} (${pdfData.numpages} pages, no extractable text)`,
        index: 0,
        metadata: {
          page_count: pdfData.numpages,
          file_name: fileRecord.filename,
          file_type: 'pdf',
          has_text: false,
          info: pdfData.info
        }
      })
    } else {
      // Split text into overlapping chunks
      let startIndex = 0
      let chunkIndex = 0

      while (startIndex < pdfData.text.length) {
        const endIndex = Math.min(startIndex + CHUNK_SIZE, pdfData.text.length)
        const chunkText = pdfData.text.slice(startIndex, endIndex).trim()

        if (chunkText.length > 0) {
          chunks.push({
            text: chunkText,
            index: chunkIndex,
            metadata: {
              page_count: pdfData.numpages,
              file_name: fileRecord.filename,
              file_type: 'pdf',
              chunk_start: startIndex,
              chunk_end: endIndex,
              has_text: true,
              info: pdfData.info
            }
          })
          chunkIndex++
        }

        // Move to next chunk with overlap
        startIndex += CHUNK_SIZE - CHUNK_OVERLAP
      }

      apiLogger.info('Created text chunks from PDF', {
        requestId,
        chunkCount: chunks.length
      })
    }

    // Generate embeddings for chunks
    const texts = chunks.map(chunk => chunk.text)
    const embeddings = await generateEmbeddings(texts)
    apiLogger.info('Generated embeddings for PDF chunks', {
      requestId,
      embeddingCount: embeddings.length
    })

    // Store chunks with embeddings
    let successfulChunks = 0
    for (let i = 0; i < chunks.length; i++) {
      try {
        const { error: chunkError } = await supabase.from('pdf_chunks').insert({
          user_id: userId,
          file_id: fileRecord.id,
          chunk_type: pdfData.text.trim().length === 0 ? 'pdf_metadata' : 'pdf_text',
          chunk_index: chunks[i].index,
          chunk_text: chunks[i].text,
          embedding: embeddings[i],
          metadata: chunks[i].metadata
        })

        if (chunkError) {
          apiLogger.error('Failed to save PDF chunk', chunkError, {
            requestId,
            chunkIndex: i
          })
        } else {
          successfulChunks++
        }
      } catch (error) {
        apiLogger.error('Error saving PDF chunk', error instanceof Error ? error : undefined, {
          requestId,
          chunkIndex: i
        })
      }
    }

    apiLogger.info('Successfully saved PDF chunks with embeddings', {
      requestId,
      successfulChunks,
      totalChunks: chunks.length
    })

    return {
      status: 'completed',
      chunksCreated: successfulChunks,
      pages: pdfData.numpages,
      charactersExtracted: pdfData.text.length,
      processingNote: pdfData.text.trim().length === 0
        ? 'PDF processed - no extractable text found (may be scanned images)'
        : 'PDF processed with full text extraction and embeddings'
    }

  } catch (error) {
    apiLogger.error('PDF processing error', error instanceof Error ? error : undefined, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}
