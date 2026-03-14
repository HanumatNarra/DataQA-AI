// lib/chartTypes.ts - Comprehensive chart data model and types
import { ChartType } from './chartTheme';

// Core chart data structure
export interface ChartDataPoint {
  label: string;
  value: number;
  [key: string]: any; // Allow additional properties for flexibility
}

// Chart metadata and configuration
export interface ChartConfig {
  id: string;
  name: string;
  createdAt: string;
  datasetId?: string;
  chartType: ChartType;
  query?: string;
  measure?: string;
  dimension?: string;
  data: ChartDataPoint[];
  vegaSpec?: any;
  thumbnailUrl?: string;
  previewDataSample?: ChartDataPoint[];
  exportConfig?: ExportConfig;
  metadata?: ChartMetadata;
}

// Chart metadata for analytics and tracking
export interface ChartMetadata {
  userId: string;
  sessionId?: string;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  performance?: {
    generationTime: number;
    thumbnailTime?: number;
  };
  filters?: Record<string, any>;
  conversationContext?: any;
}

// Export configuration
export interface ExportConfig {
  formats: ExportFormat[];
  defaultFormat: ExportFormat;
  quality?: 'low' | 'medium' | 'high';
  dimensions?: {
    width: number;
    height: number;
  };
}

export type ExportFormat = 'PNG' | 'CSV' | 'JSON' | 'SVG';

// Chart thumbnail configuration
export interface ThumbnailConfig {
  width: number;
  height: number;
  aspectRatio: number;
  quality: number;
  format: 'PNG' | 'JPEG';
  background: string;
}

// Default thumbnail configuration
export const DEFAULT_THUMBNAIL_CONFIG: ThumbnailConfig = {
  width: 240,
  height: 150, // 16:10 aspect ratio
  aspectRatio: 16 / 10,
  quality: 0.8,
  format: 'PNG',
  background: '#ffffff',
};

// Chart export result
export interface ChartExport {
  format: ExportFormat;
  data: string | Blob;
  filename: string;
  mimeType: string;
  size?: number;
}

// Chart gallery item (for Recent Charts grid)
export interface ChartGalleryItem {
  id: string;
  name: string;
  chartType: ChartType;
  thumbnailUrl?: string;
  chart_image_url?: string;
  createdAt: string;
  dataPreview?: ChartDataPoint[];
  quickActions?: QuickAction[];
  config?: any;
  resultMeta?: any;
  datasetId?: string;
  previewDataSample?: any;
}

// Quick actions for chart cards
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: 'view' | 'export' | 'delete' | 'share';
  href?: string;
  onClick?: () => void;
}

// Chart creation request
export interface CreateChartRequest {
  query: string;
  filters?: Record<string, any>;
  preferredChart?: ChartType;
  datasetId?: string;
  exportConfig?: Partial<ExportConfig>;
}

// Chart update request
export interface UpdateChartRequest {
  name?: string;
  exportConfig?: Partial<ExportConfig>;
  metadata?: Partial<ChartMetadata>;
}

// Chart search and filter options
export interface ChartSearchOptions {
  query?: string;
  chartType?: ChartType;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  limit?: number;
  offset?: number;
}

// Chart analytics and usage data
export interface ChartAnalytics {
  views: number;
  exports: number;
  shares: number;
  lastViewed?: string;
  lastExported?: string;
  averageViewTime?: number;
}

// Database chart record (matches current schema)
export interface DatabaseChartRecord {
  id: number;
  user_id: string;
  query: string | null;
  chart_type: ChartType;
  measure: string | null;
  dimension: string | null;
  data: ChartDataPoint[];
  vega_spec?: any;
  chart_image_url?: string | null;
  created_at: string;
}

// Utility types
export type ChartId = string;
export type DatasetId = string;
export type UserId = string;

// Chart state management
export interface ChartState {
  isLoading: boolean;
  error?: string;
  chart?: ChartConfig;
  thumbnail?: string;
  exports: ChartExport[];
}

// Chart validation result
export interface ChartValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
