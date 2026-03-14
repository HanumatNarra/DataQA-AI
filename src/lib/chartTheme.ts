// lib/chartTheme.ts - Production-grade chart theming system
export const chartPalette = {
  // Primary brand colors
  primary: '#2563EB',      // blue-600
  secondary: '#10B981',    // emerald-500
  accent: '#F59E0B',       // amber-500
  warning: '#EF4444',      // red-500
  
  // Semantic colors for status/data
  completed: '#2563EB',    // blue
  pending: '#14B8A6',      // teal
  processing: '#F59E0B',   // amber
  cancelled: '#EF4444',    // red
  success: '#10B981',      // emerald
  error: '#EF4444',        // red
  
  // Extended palette for complex charts
  blue: '#3B82F6',         // blue-500
  indigo: '#6366F1',       // indigo-500
  purple: '#8B5CF6',       // violet-500
  pink: '#EC4899',         // pink-500
  rose: '#F43F5E',         // rose-500
  amber: '#F59E0B',        // amber-500
  orange: '#F97316',       // orange-500
  yellow: '#EAB308',       // yellow-500
  lime: '#84CC16',         // lime-500
  green: '#22C55E',        // green-500
  emerald: '#10B981',      // emerald-500
  teal: '#14B8A6',         // teal-500
  cyan: '#06B6D4',         // cyan-500
  sky: '#0EA5E9',          // sky-500
  gray: '#6B7280',         // gray-500
  slate: '#64748B',        // slate-500
  zinc: '#71717A',         // zinc-500
  neutral: '#737373',      // neutral-500
  stone: '#78716C',        // stone-500
} as const;

export const chartColors = [
  chartPalette.blue,
  chartPalette.emerald,
  chartPalette.amber,
  chartPalette.rose,
  chartPalette.indigo,
  chartPalette.orange,
  chartPalette.teal,
  chartPalette.purple,
  chartPalette.pink,
  chartPalette.lime,
  chartPalette.cyan,
  chartPalette.sky,
] as const;

// Chart configuration presets
export const chartConfigs = {
  bar: {
    colors: chartColors,
    opacity: 0.8,
    strokeWidth: 0,
    cornerRadius: 4,
  },
  line: {
    colors: chartColors,
    strokeWidth: 3,
    pointSize: 6,
    opacity: 0.9,
  },
  area: {
    colors: chartColors,
    opacity: 0.6,
    strokeWidth: 2,
  },
  pie: {
    colors: chartColors,
    opacity: 0.8,
    strokeWidth: 2,
    stroke: '#ffffff',
  },
} as const;

// Export theme for external use
export const chartTheme = {
  palette: chartPalette,
  colors: chartColors,
  configs: chartConfigs,
  // Responsive breakpoints
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  // Typography scale
  typography: {
    title: { fontSize: 16, fontWeight: 600 },
    axis: { fontSize: 12, fontWeight: 500 },
    legend: { fontSize: 11, fontWeight: 400 },
  },
} as const;

export type ChartType = keyof typeof chartConfigs;
export type ChartColor = typeof chartColors[number];

export const series: { key: keyof typeof chartPalette; value: number; label: string }[] = [
  { key: 'blue', value: 420, label: 'Category A' },
  { key: 'emerald', value: 310, label: 'Category B' },
  { key: 'amber', value: 280, label: 'Category C' },
  { key: 'rose', value: 190, label: 'Category D' },
];
