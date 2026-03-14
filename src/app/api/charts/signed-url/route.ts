// src/app/api/charts/signed-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient, createServerClient } from '@/lib/supabase';
import { z } from 'zod';
import { apiLogger } from '@/lib/logger';

export const runtime = 'nodejs';

// Input validation schema
const SignedUrlRequestSchema = z.object({
  storagePath: z.string().min(1),
  expiresIn: z.number().min(60).max(86400).default(3600), // 1 hour default, max 24 hours
});

export async function POST(request: NextRequest) {
  try {
    // 1. Validate input
    const body = await request.json();
    const validationResult = SignedUrlRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: `Invalid input: ${validationResult.error.errors.map(e => e.message).join(', ')}`
      }, { status: 400 });
    }

    const { storagePath, expiresIn } = validationResult.data;

    // 2. Get user context for validation
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // 3. Verify the storage path belongs to the user
    if (!storagePath.startsWith(`charts/${user.id}/`) && !storagePath.startsWith(`thumbnails/${user.id}/`)) {
      return NextResponse.json({
        success: false,
        error: 'Access denied: Invalid storage path'
      }, { status: 403 });
    }

    // 4. Create signed URL using service role key for full permissions
    const supabaseAdmin = createServerClient();

    const { data, error } = await supabaseAdmin.storage
      .from('user-files')
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      apiLogger.error('Failed to create signed URL', error, {
        route: 'charts/signed-url',
        storagePath,
        userId: user.id
      });
      return NextResponse.json({
        success: false,
        error: 'Failed to create signed URL',
        details: error.message
      }, { status: 500 });
    }

    // 5. Return success response
    return NextResponse.json({
      success: true,
      signedUrl: data?.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      metadata: {
        storagePath,
        expiresIn,
        generatedAt: new Date().toISOString(),
      }
    });

  } catch (error) {
    apiLogger.error('Unexpected error creating signed URL', error instanceof Error ? error : undefined, {
      route: 'charts/signed-url',
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
    service: 'chart-signed-url'
  });
}
