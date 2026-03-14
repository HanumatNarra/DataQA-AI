// src/hooks/useChartThumbnail.ts - Chart thumbnail management hook
import { useState, useCallback, useRef, useEffect } from 'react';
import { generateChartThumbnail, ThumbnailResult } from '@/lib/chartThumbnail';
import { ChartConfig } from '@/lib/chartTypes';

// Thumbnail generation state
interface ThumbnailState {
  isGenerating: boolean;
  isUploading: boolean;
  thumbnail: ThumbnailResult | null;
  error: string | null;
  uploadedUrl: string | null;
}

// Hook options
interface UseChartThumbnailOptions {
  autoGenerate?: boolean;
  delay?: number;
  quality?: number;
  onThumbnailGenerated?: (thumbnail: ThumbnailResult) => void;
  onThumbnailUploaded?: (url: string) => void;
  onError?: (error: string) => void;
}

export function useChartThumbnail(
  chart: ChartConfig | null,
  options: UseChartThumbnailOptions = {}
) {
  const {
    autoGenerate = true,
    delay = 1000,
    quality = 0.8,
    onThumbnailGenerated,
    onThumbnailUploaded,
    onError,
  } = options;

  // State
  const [state, setState] = useState<ThumbnailState>({
    isGenerating: false,
    isUploading: false,
    thumbnail: null,
    error: null,
    uploadedUrl: null,
  });

  // Refs
  const chartElementRef = useRef<HTMLElement | null>(null);
  const generationTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
      }
    };
  }, []);

  // Generate thumbnail from chart element
  const generateThumbnail = useCallback(async (
    element: HTMLElement,
    customOptions?: { delay?: number; quality?: number }
  ) => {
    if (!element || !isMountedRef.current) return;

    try {
      setState(prev => ({ ...prev, isGenerating: true, error: null }));

      const thumbnailOptions = {
        delay: customOptions?.delay || delay,
        quality: customOptions?.quality || quality,
      };

      const thumbnail = await generateChartThumbnail(element, thumbnailOptions);

      if (!isMountedRef.current) return;

      setState(prev => ({ ...prev, thumbnail, isGenerating: false }));
      onThumbnailGenerated?.(thumbnail);

    } catch (error) {
      if (!isMountedRef.current) return;

      const errorMessage = error instanceof Error ? error.message : 'Thumbnail generation failed';
      setState(prev => ({ ...prev, error: errorMessage, isGenerating: false }));
      onError?.(errorMessage);
    }
  }, [delay, quality, onThumbnailGenerated, onError]);

  // Upload thumbnail to server
  const uploadThumbnail = useCallback(async (thumbnail: ThumbnailResult) => {
    if (!chart || !isMountedRef.current) return;

    try {
      setState(prev => ({ ...prev, isUploading: true, error: null }));

      const response = await fetch('/api/charts/upload-thumbnail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chartId: chart.id,
          thumbnailData: thumbnail.dataUrl,
          format: thumbnail.format,
          width: thumbnail.width,
          height: thumbnail.height,
          quality: thumbnail.format === 'PNG' ? 0.9 : 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      if (!isMountedRef.current) return;

      setState(prev => ({ 
        ...prev, 
        uploadedUrl: result.thumbnailUrl, 
        isUploading: false 
      }));
      onThumbnailUploaded?.(result.thumbnailUrl);

    } catch (error) {
      if (!isMountedRef.current) return;

      const errorMessage = error instanceof Error ? error.message : 'Thumbnail upload failed';
      setState(prev => ({ ...prev, error: errorMessage, isUploading: false }));
      onError?.(errorMessage);
    }
  }, [chart, onThumbnailUploaded, onError]);

  // Auto-generate thumbnail when chart element is available
  const setChartElement = useCallback((element: HTMLElement | null) => {
    chartElementRef.current = element;

    if (element && autoGenerate && chart) {
      // Clear any existing timeout
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
      }

      // Set timeout for delayed generation
      generationTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && chartElementRef.current === element) {
          generateThumbnail(element);
        }
      }, delay);
    }
  }, [autoGenerate, chart, delay, generateThumbnail]);

  // Manual thumbnail generation trigger
  const triggerGeneration = useCallback(() => {
    if (chartElementRef.current && chart) {
      generateThumbnail(chartElementRef.current);
    }
  }, [chart, generateThumbnail]);

  // Manual upload trigger
  const triggerUpload = useCallback(() => {
    if (state.thumbnail && !state.uploadedUrl) {
      uploadThumbnail(state.thumbnail);
    }
  }, [state.thumbnail, state.uploadedUrl, uploadThumbnail]);

  // Reset state
  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      isUploading: false,
      thumbnail: null,
      error: null,
      uploadedUrl: null,
    });
  }, []);

  // Check if thumbnail generation is supported
  const isSupported = typeof window !== 'undefined' && 
                     typeof HTMLCanvasElement !== 'undefined' && 
                     typeof HTMLCanvasElement.prototype.toBlob === 'function';

  return {
    // State
    ...state,
    
    // Refs
    chartElementRef,
    
    // Actions
    setChartElement,
    generateThumbnail,
    uploadThumbnail,
    triggerGeneration,
    triggerUpload,
    reset,
    
    // Utilities
    isSupported,
    hasThumbnail: !!state.thumbnail,
    hasUploaded: !!state.uploadedUrl,
    canGenerate: isSupported && !!chartElementRef.current && !!chart,
    canUpload: !!state.thumbnail && !state.uploadedUrl && !state.isUploading,
  };
}
