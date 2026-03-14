// src/lib/chartDownload.ts - Chart download utilities
import { ChartGalleryItem } from './chartTypes';

export interface DownloadResult {
  success: boolean;
  error?: string;
  filename?: string;
}

/**
 * Downloads a chart image file (SVG or PNG) - uses full resolution image
 */
export async function downloadChartImage(chart: ChartGalleryItem): Promise<DownloadResult> {
  try {
    // Use chart_image_url for full resolution download
    const imageUrl = chart.chart_image_url || chart.thumbnailUrl;
    
    if (!imageUrl) {
      return { success: false, error: 'No image URL available' };
    }

    // If it's a storage path, get a signed URL
    let downloadUrl = imageUrl;
    if (!imageUrl.startsWith('http')) {
      const response = await fetch('/api/charts/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storagePath: imageUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to get signed URL for download');
      }

      const { signedUrl } = await response.json();
      downloadUrl = signedUrl;
    }

    // Fetch the image
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Get the content type to determine file extension
    const contentType = response.headers.get('content-type') || '';
    const isSvg = contentType.includes('svg') || imageUrl.includes('.svg');
    
    // Generate filename with correct extension
    const filename = generateChartFilename(chart, isSvg ? 'svg' : 'png');
    
    // Convert to blob with correct MIME type
    const blob = await response.blob();
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    return { success: true, filename };
  } catch (error) {
    console.error('Download failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Download failed' 
    };
  }
}

/**
 * Generates a filename for the chart download
 */
function generateChartFilename(chart: ChartGalleryItem, extension: string = 'png'): string {
  const date = new Date(chart.createdAt);
  const dateStr = date.toISOString().slice(0, 19).replace(/[:-]/g, '-').replace('T', '_');
  const type = chart.chartType.toLowerCase();
  
  return `chart-${type}-${dateStr}.${extension}`;
}

/**
 * Downloads chart data as CSV
 */
export async function downloadChartData(chart: ChartGalleryItem): Promise<DownloadResult> {
  try {
    // This would need to be implemented based on your chart data structure
    // For now, return a placeholder
    return { success: false, error: 'CSV download not yet implemented' };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'CSV download failed' 
    };
  }
}

/**
 * Downloads chart configuration as JSON
 */
export async function downloadChartConfig(chart: ChartGalleryItem): Promise<DownloadResult> {
  try {
    const config = {
      id: chart.id,
      name: chart.name,
      chartType: chart.chartType,
      createdAt: chart.createdAt,
      config: chart.config,
      resultMeta: chart.resultMeta
    };

    const filename = `chart-config-${chart.id}.json`;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    return { success: true, filename };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Config download failed' 
    };
  }
}
