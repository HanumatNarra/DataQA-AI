import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { apiLogger } from '@/lib/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: chartIdParam } = await params;
    const chartId = parseInt(chartIdParam, 10);

    apiLogger.info('Attempting to delete chart', {
      route: 'charts/[id]',
      chartId,
      chartIdParam,
      userId: user.id
    });

    if (isNaN(chartId)) {
      apiLogger.warn('Invalid chart ID', {
        route: 'charts/[id]',
        chartIdParam
      });
      return NextResponse.json(
        { success: false, error: 'Invalid chart ID' },
        { status: 400 }
      );
    }

    // Get the chart to find the storage paths
    const { data: chart, error: fetchError } = await supabase
      .from('chart_history')
      .select('chart_image_url, user_id')
      .eq('id', chartId)
      .eq('user_id', user.id)
      .single();

    apiLogger.info('Chart fetch result', {
      route: 'charts/[id]',
      chartId,
      found: !!chart,
      hasError: !!fetchError
    });

    if (fetchError || !chart) {
      apiLogger.warn('Chart not found or access denied', {
        route: 'charts/[id]',
        chartId
      });
      return NextResponse.json(
        { success: false, error: 'Chart not found' },
        { status: 404 }
      );
    }

    // Delete files from storage
    const filesToDelete = [
      chart.chart_image_url
    ].filter(Boolean);

    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove(filesToDelete);

      if (storageError) {
        apiLogger.error('Error deleting files from storage', storageError, {
          route: 'charts/[id]',
          chartId
        });
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('chart_history')
      .delete()
      .eq('id', chartId)
      .eq('user_id', user.id);

    if (deleteError) {
      apiLogger.error('Error deleting chart from database', deleteError, {
        route: 'charts/[id]',
        chartId
      });
      return NextResponse.json(
        { success: false, error: 'Failed to delete chart' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error('Error in DELETE charts/[id]', error instanceof Error ? error : undefined, {
      route: 'charts/[id]',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
