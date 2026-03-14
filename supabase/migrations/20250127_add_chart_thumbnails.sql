-- Add thumbnail support to chart_history table
-- Migration: 20250127_add_chart_thumbnails.sql

-- Add thumbnail_url column
ALTER TABLE public.chart_history 
ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add updated_at column for tracking modifications
ALTER TABLE public.chart_history 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create index for thumbnail lookups
CREATE INDEX IF NOT EXISTS idx_chart_history_thumbnail_url 
ON public.chart_history(thumbnail_url) 
WHERE thumbnail_url IS NOT NULL;

-- Create index for updated_at lookups
CREATE INDEX IF NOT EXISTS idx_chart_history_updated_at 
ON public.chart_history(updated_at);

-- Add comment for documentation
COMMENT ON COLUMN public.chart_history.thumbnail_url IS 'Storage path to chart thumbnail image';
COMMENT ON COLUMN public.chart_history.updated_at IS 'Timestamp of last update to chart record';

-- Update existing records to set updated_at to created_at if not set
UPDATE public.chart_history 
SET updated_at = created_at 
WHERE updated_at IS NULL;
