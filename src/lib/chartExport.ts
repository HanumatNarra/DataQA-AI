// lib/chartExport.ts - Chart export utilities for multiple formats
import { ChartExport, ExportFormat, ChartDataPoint, ChartConfig } from './chartTypes';

// Export options for different formats
export interface ExportOptions {
  format: ExportFormat;
  quality?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  filename?: string;
  includeMetadata?: boolean;
}

// Export result with metadata
export interface ExportResult extends ChartExport {
  success: boolean;
  error?: string;
  metadata?: {
    exportedAt: string;
    chartType: string;
    dataPoints: number;
    exportTime: number;
  };
}

// Generate filename for exported chart
export function generateExportFilename(
  chart: ChartConfig,
  format: ExportFormat,
  customName?: string
): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const chartName = customName || chart.name || `chart_${chart.id}`;
  const sanitizedName = chartName.replace(/[^a-zA-Z0-9-_]/g, '_');
  
  return `${sanitizedName}_${timestamp}.${format.toLowerCase()}`;
}

// Export chart as PNG from canvas element
export async function exportChartAsPNG(
  chartElement: HTMLElement,
  options: ExportOptions
): Promise<ExportResult> {
  const startTime = Date.now();
  
  try {
    // Dynamic import of html2canvas for code splitting
    const html2canvas = (await import('html2canvas')).default;
    
    // Configure export options
    const exportOptions = {
      width: options.dimensions?.width || chartElement.offsetWidth,
      height: options.dimensions?.height || chartElement.offsetHeight,
      scale: 2, // Higher resolution for exports
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      removeContainer: true,
      foreignObjectRendering: false,
      imageTimeout: 30000,
    };

    // Generate high-quality canvas
    const canvas = await html2canvas(chartElement, exportOptions);
    
    // Convert to blob with specified quality
    const quality = options.quality || 0.95;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
        'image/png',
        quality
      );
    });

    // Generate filename
    const filename = options.filename || generateExportFilename(
      { id: 'export', name: 'Chart Export', chartType: 'bar', createdAt: new Date().toISOString(), data: [] } as ChartConfig,
      'PNG'
    );

    const result: ExportResult = {
      format: 'PNG',
      data: blob,
      filename,
      mimeType: 'image/png',
      size: blob.size,
      success: true,
      metadata: {
        exportedAt: new Date().toISOString(),
        chartType: 'PNG',
        dataPoints: 0,
        exportTime: Date.now() - startTime,
      },
    };

    return result;

  } catch (error) {
    console.error('Failed to export chart as PNG:', error);
    return {
      format: 'PNG',
      data: new Blob(),
      filename: 'export_error.png',
      mimeType: 'image/png',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown export error',
    };
  }
}

// Export chart data as CSV
export function exportChartAsCSV(
  data: ChartDataPoint[],
  options: ExportOptions
): ExportResult {
  const startTime = Date.now();
  
  try {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    // Extract all unique keys from data points
    const allKeys = new Set<string>();
    data.forEach(point => {
      Object.keys(point).forEach(key => allKeys.add(key));
    });
    
    const keys = Array.from(allKeys);
    
    // Create CSV header
    const header = keys.map(key => `"${key}"`).join(',');
    
    // Create CSV rows
    const rows = data.map(point => 
      keys.map(key => {
        const value = point[key];
        // Escape quotes and wrap in quotes if contains comma or newline
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    );
    
    // Combine header and rows
    const csvContent = [header, ...rows].join('\n');
    
    // Create blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Generate filename
    const filename = options.filename || generateExportFilename(
      { id: 'export', name: 'Chart Data', chartType: 'bar', createdAt: new Date().toISOString(), data } as ChartConfig,
      'CSV'
    );

    const result: ExportResult = {
      format: 'CSV',
      data: blob,
      filename,
      mimeType: 'text/csv',
      size: blob.size,
      success: true,
      metadata: {
        exportedAt: new Date().toISOString(),
        chartType: 'CSV',
        dataPoints: data.length,
        exportTime: Date.now() - startTime,
      },
    };

    return result;

  } catch (error) {
    console.error('Failed to export chart as CSV:', error);
    return {
      format: 'CSV',
      data: new Blob(),
      filename: 'export_error.csv',
      mimeType: 'text/csv',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown export error',
    };
  }
}

// Export chart configuration as JSON
export function exportChartAsJSON(
  chart: ChartConfig,
  options: ExportOptions
): ExportResult {
  const startTime = Date.now();
  
  try {
    // Prepare export data
    const exportData = {
      chart: {
        id: chart.id,
        name: chart.name,
        chartType: chart.chartType,
        createdAt: chart.createdAt,
        query: chart.query,
        measure: chart.measure,
        dimension: chart.dimension,
        data: chart.data,
        vegaSpec: chart.vegaSpec,
      },
      metadata: {
        exportedAt: new Date().toISOString(),
        exportFormat: 'JSON',
        version: '1.0',
        ...(options.includeMetadata && chart.metadata ? { chartMetadata: chart.metadata } : {}),
      },
    };

    // Convert to JSON string with formatting
    const jsonContent = JSON.stringify(exportData, null, 2);
    
    // Create blob
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    
    // Generate filename
    const filename = options.filename || generateExportFilename(chart, 'JSON');

    const result: ExportResult = {
      format: 'JSON',
      data: blob,
      filename,
      mimeType: 'application/json',
      size: blob.size,
      success: true,
      metadata: {
        exportedAt: new Date().toISOString(),
        chartType: 'JSON',
        dataPoints: chart.data.length,
        exportTime: Date.now() - startTime,
      },
    };

    return result;

  } catch (error) {
    console.error('Failed to export chart as JSON:', error);
    return {
      format: 'JSON',
      data: new Blob(),
      filename: 'export_error.json',
      mimeType: 'application/json',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown export error',
    };
  }
}

// Export chart as SVG (if available)
export function exportChartAsSVG(
  svgContent: string,
  options: ExportOptions
): ExportResult {
  const startTime = Date.now();
  
  try {
    if (!svgContent || !svgContent.includes('<svg')) {
      throw new Error('Invalid SVG content');
    }

    // Create blob
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8;' });
    
    // Generate filename
    const filename = options.filename || generateExportFilename(
      { id: 'export', name: 'Chart SVG', chartType: 'bar', createdAt: new Date().toISOString(), data: [] } as ChartConfig,
      'SVG'
    );

    const result: ExportResult = {
      format: 'SVG',
      data: blob,
      filename,
      mimeType: 'image/svg+xml',
      size: blob.size,
      success: true,
      metadata: {
        exportedAt: new Date().toISOString(),
        chartType: 'SVG',
        dataPoints: 0,
        exportTime: Date.now() - startTime,
      },
    };

    return result;

  } catch (error) {
    console.error('Failed to export chart as SVG:', error);
    return {
      format: 'SVG',
      data: new Blob(),
      filename: 'export_error.svg',
      mimeType: 'image/svg+xml',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown export error',
    };
  }
}

// Main export function that routes to appropriate format
export async function exportChart(
  chart: ChartConfig,
  chartElement: HTMLElement,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    switch (options.format) {
      case 'PNG':
        return await exportChartAsPNG(chartElement, options);
      
      case 'CSV':
        return exportChartAsCSV(chart.data, options);
      
      case 'JSON':
        return exportChartAsJSON(chart, options);
      
      case 'SVG':
        // Try to get SVG content from chart element
        const svgElement = chartElement.querySelector('svg');
        if (svgElement) {
          const svgContent = svgElement.outerHTML;
          return exportChartAsSVG(svgContent, options);
        } else {
          throw new Error('SVG content not available');
        }
      
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  } catch (error) {
    console.error(`Failed to export chart as ${options.format}:`, error);
    return {
      format: options.format,
      data: new Blob(),
      filename: `export_error.${options.format.toLowerCase()}`,
      mimeType: getMimeType(options.format),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown export error',
    };
  }
}

// Get MIME type for export format
function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'PNG': return 'image/png';
    case 'CSV': return 'text/csv';
    case 'JSON': return 'application/json';
    case 'SVG': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

// Download exported file
export function downloadExport(result: ExportResult): void {
  if (!result.success || !result.data) {
    console.error('Cannot download failed export:', result.error);
    return;
  }

  try {
    // Create download link
    const url = URL.createObjectURL(result.data instanceof Blob ? result.data : new Blob([result.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    link.style.display = 'none';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Failed to download export:', error);
  }
}

// Batch export multiple formats
export async function batchExportChart(
  chart: ChartConfig,
  chartElement: HTMLElement,
  formats: ExportFormat[],
  options: Partial<ExportOptions> = {}
): Promise<ExportResult[]> {
  const results: ExportResult[] = [];
  
  for (const format of formats) {
    const exportOptions: ExportOptions = {
      format,
      ...options,
    };
    
    const result = await exportChart(chart, chartElement, exportOptions);
    results.push(result);
  }
  
  return results;
}
