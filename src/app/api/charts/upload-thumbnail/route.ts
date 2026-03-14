// src/app/api/charts/upload-thumbnail/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient, createServerClient } from '@/lib/supabase';
import { z } from 'zod';
import { apiLogger } from '@/lib/logger';

export const runtime = 'nodejs';

// Input validation schema
const ThumbnailUploadSchema = z.object({
  chartId: z.string().min(1),
  thumbnailData: z.string().min(1), // base64 data URL
  format: z.enum(['PNG', 'JPEG']).default('PNG'),
  width: z.number().min(100).max(1000),
  height: z.number().min(75).max(750),
  quality: z.number().min(0.1).max(1.0).default(0.8),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Validate input
    const body = await request.json();
    const validationResult = ThumbnailUploadSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: `Invalid input: ${validationResult.error.errors.map(e => e.message).join(', ')}`
      }, { status: 400 });
    }

    const { chartId, thumbnailData, format, width, height, quality } = validationResult.data;

    // 2. Get user context
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // 3. Verify chart ownership
    const { data: chart, error: chartError } = await supabase
      .from('chart_history')
      .select('id, user_id')
      .eq('id', chartId)
      .eq('user_id', user.id)
      .single();

    if (chartError || !chart) {
      return NextResponse.json({
        success: false,
        error: 'Chart not found or access denied'
      }, { status: 404 });
    }

    // 4. Create service role client for storage operations
    const supabaseAdmin = createServerClient();

    // 5. Convert base64 to buffer
    let thumbnailBuffer: Buffer;
    try {
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64Data = thumbnailData.replace(/^data:image\/[a-z]+;base64,/, '');
      thumbnailBuffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid thumbnail data format'
      }, { status: 400 });
    }

    // 6. Generate storage path
    const timestamp = Date.now();
    const fileName = `thumbnail_${chartId}_${timestamp}.${format.toLowerCase()}`;
    const storagePath = `thumbnails/${user.id}/${fileName}`;

    // 7. Upload thumbnail to storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('user-files')
      .upload(storagePath, thumbnailBuffer, {
        contentType: `image/${format.toLowerCase()}`,
        cacheControl: '3600',
        metadata: {
          chartId,
          width: width.toString(),
          height: height.toString(),
          quality: quality.toString(),
          format,
          uploadedAt: new Date().toISOString(),
        }
      });

    if (uploadError) {
      apiLogger.error('Thumbnail upload failed', uploadError, {
        route: 'charts/upload-thumbnail',
        chartId
      });
      return NextResponse.json({
        success: false,
        error: 'Failed to upload thumbnail'
      }, { status: 500 });
    }

    // 8. Update chart record with thumbnail URL
    const { error: updateError } = await supabase
      .from('chart_history')
      .update({
        thumbnail_url: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chartId)
      .eq('user_id', user.id);

    if (updateError) {
      apiLogger.warn('Failed to update chart record', {
        route: 'charts/upload-thumbnail',
        chartId,
        error: updateError
      });
      // Don't fail the request if DB update fails, thumbnail is still uploaded
    }

    // 9. Generate signed URL for immediate use
    const { data: signedUrl, error: signError } = await supabaseAdmin.storage
      .from('user-files')
      .createSignedUrl(storagePath, 60 * 60 * 24); // 24 hours

    if (signError) {
      apiLogger.warn('Failed to generate signed URL', {
        route: 'charts/upload-thumbnail',
        error: signError
      });
    }

    // 10. Return success response
    return NextResponse.json({
      success: true,
      thumbnailUrl: storagePath,
      signedUrl: signedUrl?.signedUrl || null,
      metadata: {
        chartId,
        width,
        height,
        format,
        quality,
        size: thumbnailBuffer.length,
        uploadedAt: new Date().toISOString(),
      }
    });

  } catch (error) {
    apiLogger.error('Unexpected error in thumbnail upload', error instanceof Error ? error : undefined, {
      route: 'charts/upload-thumbnail',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'thumbnail-upload'
  });
}
