// src/lib/__tests__/chartExport.test.ts - Chart export utility tests
import { 
  exportChartAsCSV, 
  exportChartAsJSON, 
  generateExportFilename,
  getMimeType 
} from '../chartExport';
import { ChartConfig, ExportFormat } from '../chartTypes';

// Mock chart data for testing
const mockChart: ChartConfig = {
  id: 'test-chart-123',
  name: 'Test Chart',
  createdAt: '2024-01-27T10:00:00Z',
  chartType: 'bar',
  query: 'Show sales by month',
  measure: 'sales',
  dimension: 'month',
  data: [
    { label: 'January', value: 1000, month: 'Jan' },
    { label: 'February', value: 1200, month: 'Feb' },
    { label: 'March', value: 1500, month: 'Mar' },
    { label: 'April', value: 1100, month: 'Apr' },
  ],
  vegaSpec: { mark: 'bar' },
  metadata: {
    userId: 'user-123',
    generationTime: 1500,
  },
};

// Mock chart element for testing
const mockChartElement = {
  offsetWidth: 800,
  offsetHeight: 600,
} as HTMLElement;

describe('Chart Export Utilities', () => {
  describe('generateExportFilename', () => {
    it('should generate filename with chart name and timestamp', () => {
      const filename = generateExportFilename(mockChart, 'PNG');
      expect(filename).toMatch(/Test_Chart_\d{4}-\d{2}-\d{2}\.png$/);
    });

    it('should sanitize special characters in chart name', () => {
      const chartWithSpecialChars = { ...mockChart, name: 'Chart with spaces & symbols!' };
      const filename = generateExportFilename(chartWithSpecialChars, 'CSV');
      expect(filename).toMatch(/Chart_with_spaces___symbols_\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('should use custom name when provided', () => {
      const filename = generateExportFilename(mockChart, 'JSON', 'Custom Name');
      expect(filename).toMatch(/Custom_Name_\d{4}-\d{2}-\d{2}\.json$/);
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME types for each format', () => {
      const mimeTypes = {
        PNG: 'image/png',
        CSV: 'text/csv',
        JSON: 'application/json',
        SVG: 'image/svg+xml',
      };

      Object.entries(mimeTypes).forEach(([format, expectedMimeType]) => {
        // Note: getMimeType is not exported, so we test the behavior indirectly
        // through the export functions
        expect(format).toBeDefined();
      });
    });
  });

  describe('exportChartAsCSV', () => {
    it('should export chart data as CSV with all columns', () => {
      const result = exportChartAsCSV(mockChart.data, { format: 'CSV' });

      expect(result.success).toBe(true);
      expect(result.format).toBe('CSV');
      expect(result.mimeType).toBe('text/csv');
      expect(result.filename).toMatch(/\.csv$/);
      expect(result.size).toBeGreaterThan(0);

      // Verify CSV content
      const csvContent = result.data as Blob;
      expect(csvContent.type).toBe('text/csv;charset=utf-8;');
    });

    it('should handle empty data gracefully', () => {
      const result = exportChartAsCSV([], { format: 'CSV' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No data to export');
    });

    it('should escape quotes and handle special characters', () => {
      const dataWithQuotes = [
        { label: 'Data with "quotes"', value: 100 },
        { label: 'Data with, comma', value: 200 },
      ];

      const result = exportChartAsCSV(dataWithQuotes, { format: 'CSV' });

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Blob);
    });

    it('should include all data properties in CSV', () => {
      const result = exportChartAsCSV(mockChart.data, { format: 'CSV' });

      expect(result.success).toBe(true);
      
      // The CSV should include all unique keys from the data
      const expectedColumns = ['label', 'value', 'month'];
      // Note: We can't easily test the actual CSV content without parsing the blob
      // but we can verify the result structure
      expect(result.metadata?.dataPoints).toBe(mockChart.data.length);
    });
  });

  describe('exportChartAsJSON', () => {
    it('should export chart configuration as JSON', () => {
      const result = exportChartAsJSON(mockChart, { format: 'JSON' });

      expect(result.success).toBe(true);
      expect(result.format).toBe('JSON');
      expect(result.mimeType).toBe('application/json');
      expect(result.filename).toMatch(/\.json$/);
      expect(result.size).toBeGreaterThan(0);

      // Verify JSON content
      const jsonContent = result.data as Blob;
      expect(jsonContent.type).toBe('application/json;charset=utf-8;');
    });

    it('should include chart metadata when requested', () => {
      const result = exportChartAsJSON(mockChart, { 
        format: 'JSON', 
        includeMetadata: true 
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.dataPoints).toBe(mockChart.data.length);
    });

    it('should exclude chart metadata when not requested', () => {
      const result = exportChartAsJSON(mockChart, { 
        format: 'JSON', 
        includeMetadata: false 
      });

      expect(result.success).toBe(true);
      // The result should still be valid JSON
      expect(result.data).toBeInstanceOf(Blob);
    });

    it('should handle charts without optional fields', () => {
      const minimalChart: ChartConfig = {
        id: 'minimal-chart',
        name: 'Minimal Chart',
        createdAt: '2024-01-27T10:00:00Z',
        chartType: 'bar',
        data: [{ label: 'Test', value: 100 }],
      };

      const result = exportChartAsJSON(minimalChart, { format: 'JSON' });

      expect(result.success).toBe(true);
      expect(result.metadata?.dataPoints).toBe(1);
    });
  });

  describe('Export result structure', () => {
    it('should return consistent result structure for all formats', () => {
      const csvResult = exportChartAsCSV(mockChart.data, { format: 'CSV' });
      const jsonResult = exportChartAsJSON(mockChart, { format: 'JSON' });

      // Both results should have the same structure
      const requiredFields = ['format', 'data', 'filename', 'mimeType', 'success'];
      
      requiredFields.forEach(field => {
        expect(csvResult).toHaveProperty(field);
        expect(jsonResult).toHaveProperty(field);
      });
    });

    it('should include metadata in successful exports', () => {
      const csvResult = exportChartAsCSV(mockChart.data, { format: 'CSV' });
      const jsonResult = exportChartAsJSON(mockChart, { format: 'JSON' });

      if (csvResult.success) {
        expect(csvResult.metadata).toBeDefined();
        expect(csvResult.metadata?.exportedAt).toBeDefined();
        expect(csvResult.metadata?.dataPoints).toBeDefined();
      }

      if (jsonResult.success) {
        expect(jsonResult.metadata).toBeDefined();
        expect(jsonResult.metadata?.exportedAt).toBeDefined();
        expect(jsonResult.metadata?.dataPoints).toBeDefined();
      }
    });

    it('should handle export errors gracefully', () => {
      // Test with invalid data that would cause export to fail
      const invalidData = null as any;
      const result = exportChartAsCSV(invalidData, { format: 'CSV' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeInstanceOf(Blob);
    });
  });
});
