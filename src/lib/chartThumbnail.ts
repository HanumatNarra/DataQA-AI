// lib/chartThumbnail.ts - Client-side chart thumbnail generation
import { ThumbnailConfig, DEFAULT_THUMBNAIL_CONFIG } from './chartTypes';

// Thumbnail generation options
export interface ThumbnailOptions {
  config?: Partial<ThumbnailConfig>;
  quality?: number;
  format?: 'PNG' | 'JPEG';
  background?: string;
  delay?: number; // Delay before capture to ensure rendering
}

// Thumbnail generation result
export interface ThumbnailResult {
  dataUrl: string;
  blob?: Blob;
  width: number;
  height: number;
  format: string;
  size: number;
}

// Generate thumbnail from chart element
export async function generateChartThumbnail(
  chartElement: HTMLElement,
  options: ThumbnailOptions = {}
): Promise<ThumbnailResult> {
  const config = { ...DEFAULT_THUMBNAIL_CONFIG, ...options.config, ...options };
  
  try {
    // Ensure element is visible and rendered
    if (!chartElement.offsetWidth || !chartElement.offsetHeight) {
      throw new Error('Chart element must be visible and rendered');
    }

    // Wait for any pending renders
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    // Use requestIdleCallback for performance optimization
    return await new Promise((resolve, reject) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => generateThumbnail(chartElement, config, resolve, reject));
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => generateThumbnail(chartElement, config, resolve, reject), 0);
      }
    });

  } catch (error) {
    console.error('Failed to generate chart thumbnail:', error);
    throw error;
  }
}

// Core thumbnail generation logic
async function generateThumbnail(
  chartElement: HTMLElement,
  config: ThumbnailConfig,
  resolve: (result: ThumbnailResult) => void,
  reject: (error: Error) => void
) {
  try {
    // Dynamic import of html2canvas for code splitting
    const html2canvas = (await import('html2canvas')).default;
    
    // Configure html2canvas options
    const canvasOptions = {
      width: config.width,
      height: config.height,
      scale: 2, // Higher resolution for crisp thumbnails
      useCORS: true,
      allowTaint: true,
      backgroundColor: config.background,
      logging: false,
      removeContainer: true,
      foreignObjectRendering: false,
      imageTimeout: 15000,
    };

    // Generate canvas
    const canvas = await html2canvas(chartElement, canvasOptions);
    
    // Convert to blob with specified quality
    const blob = await new Promise<Blob>((resolveBlob) => {
      canvas.toBlob(
        (blob) => resolveBlob(blob!),
        `image/${config.format.toLowerCase()}`,
        config.quality
      );
    });

    // Convert to data URL for immediate use
    const dataUrl = canvas.toDataURL(`image/${config.format.toLowerCase()}`, config.quality);

    const result: ThumbnailResult = {
      dataUrl,
      blob,
      width: config.width,
      height: config.height,
      format: config.format,
      size: blob.size,
    };

    resolve(result);

  } catch (error) {
    reject(error instanceof Error ? error : new Error('Unknown thumbnail generation error'));
  }
}

// Generate thumbnail from SVG string (for server-side charts)
export async function generateThumbnailFromSVG(
  svgString: string,
  config: Partial<ThumbnailConfig> = {}
): Promise<ThumbnailResult> {
  const fullConfig = { ...DEFAULT_THUMBNAIL_CONFIG, ...config };
  
  try {
    // Create a temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = `${fullConfig.width}px`;
    container.style.height = `${fullConfig.height}px`;
    container.style.backgroundColor = fullConfig.background;
    container.innerHTML = svgString;
    
    document.body.appendChild(container);
    
    // Generate thumbnail
    const result = await generateChartThumbnail(container, { config: fullConfig });
    
    // Cleanup
    document.body.removeChild(container);
    
    return result;
    
  } catch (error) {
    console.error('Failed to generate thumbnail from SVG:', error);
    throw error;
  }
}

// Optimize thumbnail for storage (reduce size while maintaining quality)
export async function optimizeThumbnail(
  thumbnail: ThumbnailResult,
  targetSizeKB: number = 50
): Promise<ThumbnailResult> {
  if (thumbnail.size <= targetSizeKB * 1024) {
    return thumbnail;
  }

  try {
    // Create canvas to resize and recompress
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Load image
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = thumbnail.dataUrl;
    });

    // Calculate new dimensions while maintaining aspect ratio
    const aspectRatio = thumbnail.width / thumbnail.height;
    let newWidth = thumbnail.width;
    let newHeight = thumbnail.height;
    
    // Reduce size progressively until we meet target
    let quality = thumbnail.format === 'PNG' ? 0.9 : 0.8;
    
    while (newWidth * newHeight > targetSizeKB * 1024 && (newWidth > 120 || newHeight > 75)) {
      newWidth = Math.max(120, newWidth * 0.9);
      newHeight = newWidth / aspectRatio;
      quality = Math.max(0.5, quality * 0.95);
    }

    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // Draw resized image
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, newWidth, newHeight);
    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    // Convert to blob with optimized quality
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob!),
        `image/${thumbnail.format.toLowerCase()}`,
        quality
      );
    });

    const dataUrl = canvas.toDataURL(`image/${thumbnail.format.toLowerCase()}`, quality);

    return {
      dataUrl,
      blob,
      width: newWidth,
      height: newHeight,
      format: thumbnail.format,
      size: blob.size,
    };

  } catch (error) {
    console.warn('Failed to optimize thumbnail, returning original:', error);
    return thumbnail;
  }
}

// Utility to check if thumbnail generation is supported
export function isThumbnailSupported(): boolean {
  return typeof window !== 'undefined' && 
         typeof HTMLCanvasElement !== 'undefined' && 
         typeof HTMLCanvasElement.prototype.toBlob === 'function';
}

// Utility to get optimal thumbnail dimensions for different screen sizes
export function getResponsiveThumbnailDimensions(
  baseWidth: number = 240,
  baseHeight: number = 150
): Record<string, { width: number; height: number }> {
  return {
    sm: { width: Math.round(baseWidth * 0.75), height: Math.round(baseHeight * 0.75) },
    md: { width: baseWidth, height: baseHeight },
    lg: { width: Math.round(baseWidth * 1.25), height: Math.round(baseHeight * 1.25) },
    xl: { width: Math.round(baseWidth * 1.5), height: Math.round(baseHeight * 1.5) },
  };
}
