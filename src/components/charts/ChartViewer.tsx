'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ChartGalleryItem } from '@/lib/chartTypes';

interface ChartViewerProps {
  chart: ChartGalleryItem;
}

export function ChartViewer({ chart }: ChartViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImageUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use chart_image_url for full resolution display
        let imagePath = chart.chart_image_url || chart.thumbnailUrl;
        
        if (!imagePath) {
          throw new Error('No image URL available');
        }

        // If it's already a full URL, use it directly
        if (imagePath.startsWith('http')) {
          setImageUrl(imagePath);
          setLoading(false);
          return;
        }

        // Otherwise, get a signed URL
        const response = await fetch('/api/charts/signed-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ storagePath: imagePath }),
        });

        if (!response.ok) {
          throw new Error('Failed to get signed URL');
        }

        const { signedUrl } = await response.json();
        setImageUrl(signedUrl);
      } catch (err) {
        console.error('Error fetching chart image:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chart');
      } finally {
        setLoading(false);
      }
    };

    fetchImageUrl();
  }, [chart]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 font-medium">Error loading chart</p>
          <p className="text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <p className="text-gray-600">No chart image available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-6">
        <div className="relative w-full max-w-4xl mx-auto">
          <Image
            src={imageUrl}
            alt={chart.name || 'Chart'}
            width={600}
            height={400}
            className="object-contain w-full h-auto"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
            priority
          />
        </div>
      </div>
    </div>
  );
}
