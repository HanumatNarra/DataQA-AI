'use client';

import React, { useState, useRef } from 'react';
import { ChartConfig, ExportFormat } from '@/lib/chartTypes';
import { exportChart, downloadExport, ExportResult } from '@/lib/chartExport';
import { isThumbnailSupported } from '@/lib/chartThumbnail';

// Export menu props
interface ChartExportMenuProps {
  chart: ChartConfig;
  chartElementRef: React.RefObject<HTMLElement>;
  className?: string;
  onExportStart?: () => void;
  onExportComplete?: (result: ExportResult) => void;
  onExportError?: (error: string) => void;
}

// Export format configuration
const EXPORT_FORMATS: Array<{
  format: ExportFormat;
  label: string;
  icon: string;
  description: string;
  mimeType: string;
}> = [
  {
    format: 'PNG',
    label: 'PNG Image',
    icon: '🖼️',
    description: 'High-quality chart image',
    mimeType: 'image/png',
  },
  {
    format: 'CSV',
    label: 'CSV Data',
    icon: '📊',
    description: 'Chart data in spreadsheet format',
    mimeType: 'text/csv',
  },
  {
    format: 'JSON',
    label: 'JSON Config',
    icon: '⚙️',
    description: 'Chart configuration and data',
    mimeType: 'application/json',
  },
  {
    format: 'SVG',
    label: 'SVG Vector',
    icon: '🎨',
    description: 'Scalable vector graphics',
    mimeType: 'image/svg+xml',
  },
];

export default function ChartExportMenu({
  chart,
  chartElementRef,
  className = '',
  onExportStart,
  onExportComplete,
  onExportError,
}: ChartExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<Record<ExportFormat, boolean>>({
    PNG: false,
    CSV: false,
    JSON: false,
    SVG: false,
  });
  const [exportResults, setExportResults] = useState<Record<ExportFormat, ExportResult | null>>({
    PNG: null,
    CSV: null,
    JSON: null,
    SVG: null,
  });

  const menuRef = useRef<HTMLDivElement>(null);

  // Handle export for a specific format
  const handleExport = async (format: ExportFormat) => {
    if (!chartElementRef.current) {
      onExportError?.('Chart element not found');
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress(prev => ({ ...prev, [format]: true }));
      onExportStart?.();

      // Export the chart
      const result = await exportChart(chart, chartElementRef.current, { format });
      
      // Update results
      setExportResults(prev => ({ ...prev, [format]: result }));
      
      if (result.success) {
        // Download the export
        downloadExport(result);
        onExportComplete?.(result);
      } else {
        onExportError?.(result.error || 'Export failed');
      }

    } catch (error) {
      console.error(`Failed to export as ${format}:`, error);
      onExportError?.(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setExportProgress(prev => ({ ...prev, [format]: false }));
      setIsExporting(false);
    }
  };

  // Handle batch export
  const handleBatchExport = async (formats: ExportFormat[]) => {
    if (!chartElementRef.current) {
      onExportError?.('Chart element not found');
      return;
    }

    try {
      setIsExporting(true);
      onExportStart?.();

      // Export all formats
      const results = await Promise.all(
        formats.map(format => 
          exportChart(chart, chartElementRef.current!, { format })
        )
      );

      // Update results and download successful exports
      const newResults = { ...exportResults };
      let successCount = 0;

      results.forEach((result, index) => {
        const format = formats[index];
        newResults[format] = result;
        
        if (result.success) {
          downloadExport(result);
          successCount++;
        }
      });

      setExportResults(newResults);

      if (successCount > 0) {
        onExportComplete?.(results.find(r => r.success)!);
      } else {
        onExportError?.('All exports failed');
      }

    } catch (error) {
      console.error('Batch export failed:', error);
      onExportError?.(error instanceof Error ? error.message : 'Batch export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Check if any export is in progress
  const hasActiveExport = Object.values(exportProgress).some(Boolean);

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* Export button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          isExporting
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        }`}
        aria-label="Export chart"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {isExporting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Exporting...
          </>
        ) : (
          <>
            📥 Export
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {/* Export menu dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-50">
          {/* Header */}
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Export Chart</h3>
            <p className="text-sm text-slate-600 mt-1">
              Choose format and download your chart
            </p>
          </div>

          {/* Export options */}
          <div className="p-4 space-y-3">
            {EXPORT_FORMATS.map(({ format, label, icon, description, mimeType }) => {
              const isExporting = exportProgress[format];
              const hasResult = exportResults[format];
              const isSuccess = hasResult?.success;

              return (
                <div
                  key={format}
                  className={`p-3 rounded-lg border transition-all duration-200 ${
                    isExporting
                      ? 'border-blue-200 bg-blue-50'
                      : isSuccess
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{icon}</div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{label}</div>
                        <div className="text-sm text-slate-600">{description}</div>
                        {hasResult && (
                          <div className={`text-xs mt-1 ${
                            isSuccess ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {isSuccess ? '✓ Exported successfully' : `✗ ${hasResult.error}`}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleExport(format)}
                      disabled={isExporting || hasActiveExport}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        isExporting
                          ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
                          : isSuccess
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isExporting ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : isSuccess ? (
                        'Download'
                      ) : (
                        'Export'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Batch export */}
          <div className="p-4 border-t border-slate-200">
            <button
              onClick={() => handleBatchExport(['PNG', 'CSV', 'JSON'])}
              disabled={isExporting || hasActiveExport}
              className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export All Formats
            </button>
          </div>

          {/* Footer info */}
          <div className="p-4 bg-slate-50 rounded-b-xl">
            <div className="text-xs text-slate-500">
              <div className="flex items-center gap-2 mb-1">
                <span>📊</span>
                <span>Chart: {chart.name || `Chart ${chart.id}`}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>Created: {new Date(chart.createdAt).toLocaleDateString()}</span>
              </div>
              {!isThumbnailSupported() && (
                <div className="mt-2 text-amber-600">
                  ⚠️ PNG export may not work in this browser
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
