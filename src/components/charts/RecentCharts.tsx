'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChartGalleryItem } from '@/lib/chartTypes';
import { getRecentCharts } from '@/lib/chartHistory';
import { isThumbnailSupported } from '@/lib/chartThumbnail';
import { downloadChartImage } from '@/lib/chartDownload';
import ChartActionBar from './ChartActionBar';
import ChartPreviewModal from './ChartPreviewModal';
import DeleteConfirmation from './DeleteConfirmation';
import { ToastContainer, ToastProps, ToastInput } from '@/components/ui/Toast';
import { ChartCardSkeleton } from '@/components/ui/Skeleton';

// Chart card component
interface ChartCardProps {
  chart: ChartGalleryItem;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
  isLoading?: boolean;
}

function ChartCard({ chart, onPreview, onDownload, onDelete, isLoading = false }: ChartCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getChartTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'bar':
        return '📊';
      case 'line':
        return '📈';
      case 'pie':
        return '🥧';
      case 'area':
        return '📉';
      default:
        return '📊';
    }
  };

  if (isLoading) {
    return <ChartCardSkeleton />;
  }

  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
      {/* Thumbnail */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-t-xl bg-slate-50">
        {!imageError && chart.thumbnailUrl ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <ChartCardSkeleton />
              </div>
            )}
            <Image
              src={chart.thumbnailUrl}
              alt={`${chart.name} chart thumbnail`}
              fill
              className={`object-cover transition-all duration-200 group-hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              sizes="(min-width: 1024px) 360px, 50vw"
              onError={() => {
                setImageError(true);
              }}
              onLoad={() => {
                setImageLoaded(true);
              }}
              priority={false}
              loading="lazy"
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-100 to-slate-200">
            <div className="text-center">
              <div className="text-3xl mb-2">{getChartTypeIcon(chart.chartType)}</div>
              <div className="text-sm text-slate-500 font-medium">{chart.chartType}</div>
              {!chart.thumbnailUrl && (
                <div className="text-xs text-slate-400 mt-1">No preview</div>
              )}
              {imageError && (
                <div className="text-xs text-red-400 mt-1">Load failed</div>
              )}
            </div>
          </div>
        )}
        
        {/* Chart type badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-white/85 backdrop-blur-sm text-slate-700 rounded-full border border-slate-200">
            {chart.chartType}
          </span>
        </div>

        {/* Action bar */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ChartActionBar
            onPreview={onPreview}
            onDownload={onDownload}
            onDelete={onDelete}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 
          className="font-medium text-slate-900 mb-1 line-clamp-1"
          title={chart.name}
        >
          {chart.name}
        </h3>
        <p 
          className="text-sm text-slate-500"
          title={formatDate(chart.createdAt)}
        >
          {formatDate(chart.createdAt)}
        </p>
      </div>
    </div>
  );
}

// Main RecentCharts component
interface RecentChartsProps {
  className?: string;
  showTitle?: boolean;
  limit?: number;
}

export default function RecentCharts({ 
  className = '', 
  showTitle = true, 
  limit = 12 
}: RecentChartsProps) {
  const router = useRouter();
  const [charts, setCharts] = useState<ChartGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasThumbnails] = useState(isThumbnailSupported());
  
  // Modal and action states
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewChart, setPreviewChart] = useState<ChartGalleryItem | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteChart, setDeleteChart] = useState<ChartGalleryItem | null>(null);
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const [deletedCharts, setDeletedCharts] = useState<Map<string, { chart: ChartGalleryItem; timeout: NodeJS.Timeout }>>(new Map());

  // Generate signed URLs for chart images
  const getChartImageUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/charts/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storagePath,
          expiresIn: 3600,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[RecentCharts] Failed to get signed URL for ${storagePath}:`, response.status, response.statusText, errorText);
        return null;
      }

      const result = await response.json();
      
      if (!result.success) {
        console.error(`[RecentCharts] API error for ${storagePath}:`, result.error);
        return null;
      }

      return result.signedUrl || null;
    } catch (error) {
      console.error('Error getting chart image URL:', error);
      return null;
    }
  }, []);

  // Load charts with debouncing
  const loadCharts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const recentCharts = await getRecentCharts(limit);
      const chartsWithImages: ChartGalleryItem[] = [];

      for (const chart of recentCharts) {
        const imagePath = chart.chart_image_url;
        let thumbnailUrl: string | null = null;

        if (imagePath) {
          thumbnailUrl = await getChartImageUrl(imagePath);
        }

        const chartItem: ChartGalleryItem = {
          id: chart.id.toString(),
          name: chart.name || `Chart: ${chart.chart_type} of ${chart.dimension}`,
          chartType: chart.chart_type,
          createdAt: chart.created_at,
          chart_image_url: chart.chart_image_url || undefined,
          thumbnailUrl: thumbnailUrl || undefined,
          config: chart.config || {},
          resultMeta: chart.result_meta || { columns: [], types: {} },
          datasetId: chart.dataset_id || undefined,
          previewDataSample: chart.preview_data_sample || null,
        };

        chartsWithImages.push(chartItem);
      }

      setCharts(chartsWithImages);
    } catch (err) {
      console.error('Error loading charts:', err);
      setError('Failed to load charts');
    } finally {
      setLoading(false);
    }
  }, [limit, getChartImageUrl]);

  // Load charts on mount
  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  // Add toast
  const addToast = useCallback((toast: ToastInput) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id, onClose: removeToast }]);
  }, []);

  // Remove toast
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Handle preview
  const handlePreview = useCallback((chart: ChartGalleryItem) => {
    setPreviewChart(chart);
    setPreviewModalOpen(true);
  }, []);

  // Handle download
  const handleDownload = useCallback(async (chart: ChartGalleryItem) => {
    try {
      const result = await downloadChartImage(chart);
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Download started',
          message: `Chart saved as ${result.filename}`,
        });
      } else {
        addToast({
          type: 'error',
          title: 'Download failed',
          message: result.error || 'Unknown error',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Download failed',
        message: 'An unexpected error occurred',
      });
    }
  }, [addToast]);

  // Handle delete
  const handleDelete = useCallback((chart: ChartGalleryItem) => {
    setDeleteChart(chart);
    setDeleteModalOpen(true);
  }, []);

  // Confirm delete
  const confirmDelete = useCallback(async (chart: ChartGalleryItem) => {
    // Optimistically remove from UI
    setCharts(prev => prev.filter(c => c.id !== chart.id));
    setDeleteModalOpen(false);
    setDeleteChart(null);

    // Show undo toast
    const undoTimeout = setTimeout(async () => {
      // Finalize deletion after 10 seconds
      try {
        // Call API to delete from database and storage
        const response = await fetch(`/api/charts/${chart.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          console.error('Failed to delete chart:', response.statusText);
          // Restore to UI on error
          setCharts(prev => [...prev, chart].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ));
          addToast({
            type: 'error',
            title: 'Delete failed',
            message: 'Failed to delete chart from server',
          });
        }
      } catch (error) {
        console.error('Error deleting chart:', error);
        // Restore to UI on error
        setCharts(prev => [...prev, chart].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
        addToast({
          type: 'error',
          title: 'Delete failed',
          message: 'An error occurred while deleting the chart',
        });
      }

      setDeletedCharts(prev => {
        const newMap = new Map(prev);
        newMap.delete(chart.id);
        return newMap;
      });
    }, 10000);

    setDeletedCharts(prev => new Map(prev).set(chart.id, { chart, timeout: undoTimeout }));

    addToast({
      type: 'info',
      title: 'Chart deleted',
      message: 'You can undo for the next 10 seconds',
      action: {
        label: 'Undo',
        onClick: () => {
          // Cancel deletion
          const deletedChart = deletedCharts.get(chart.id);
          if (deletedChart) {
            clearTimeout(deletedChart.timeout);
            setDeletedCharts(prev => {
              const newMap = new Map(prev);
              newMap.delete(chart.id);
              return newMap;
            });
            
            // Restore to UI
            setCharts(prev => [...prev, chart].sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ));
          }
        }
      },
      duration: 10000
    });
  }, [addToast, deletedCharts]);

  // Handle open full view
  const handleOpenFullView = useCallback((chart: ChartGalleryItem) => {
    // Close modal first, then navigate
    setPreviewModalOpen(false);
    router.push(`/charts/${chart.id}`);
  }, [router]);

  // Render loading state
  if (loading) {
    return (
      <div className={className}>
        {showTitle && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Recent Charts</h2>
            <p className="mt-2 text-slate-600">Loading your charts...</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ChartCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={className}>
        {showTitle && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Recent Charts</h2>
          </div>
        )}
        
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Failed to load charts</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={loadCharts}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (charts.length === 0) {
    return (
      <div className={className}>
        {showTitle && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Recent Charts</h2>
          </div>
        )}
        
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No charts yet</h3>
          <p className="text-slate-600 mb-4">Create your first chart to see it here</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {showTitle && (
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Recent Charts</h2>
              <p className="mt-2 text-slate-600">
                Your recently generated charts and visualizations
                {!hasThumbnails && ' (thumbnails not supported in this browser)'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {charts.map((chart) => (
          <ChartCard
            key={chart.id}
            chart={chart}
            onPreview={() => handlePreview(chart)}
            onDownload={() => handleDownload(chart)}
            onDelete={() => handleDelete(chart)}
          />
        ))}
      </div>

      {/* Modals rendered in portal */}
      {typeof window !== 'undefined' && (
        <>
          {previewModalOpen && createPortal(
            <ChartPreviewModal
              isOpen={previewModalOpen}
              onClose={() => setPreviewModalOpen(false)}
              chart={previewChart}
              charts={charts}
              onDownload={handleDownload}
              onOpenFullView={handleOpenFullView}
            />,
            document.getElementById('modal-portal') || document.body
          )}
          
          {deleteModalOpen && createPortal(
            <DeleteConfirmation
              isOpen={deleteModalOpen}
              onClose={() => setDeleteModalOpen(false)}
              onConfirm={() => deleteChart && confirmDelete(deleteChart)}
              chartName={deleteChart?.name || ''}
            />,
            document.getElementById('modal-portal') || document.body
          )}
          
          {toasts.length > 0 && createPortal(
            <ToastContainer toasts={toasts} onClose={removeToast} />,
            document.getElementById('modal-portal') || document.body
          )}
        </>
      )}
    </div>
  );
}