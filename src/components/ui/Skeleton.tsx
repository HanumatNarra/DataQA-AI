'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function Skeleton({ className = '', children }: SkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {children || (
        <div className="bg-slate-200 rounded h-full w-full" />
      )}
    </div>
  );
}

// Specific skeleton components
export function ChartCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Thumbnail skeleton */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-t-xl">
        <Skeleton className="h-full w-full" />
        
        {/* Type badge skeleton */}
        <div className="absolute top-3 left-3">
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="p-4">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      
      {/* Action bar skeleton */}
      <div className="absolute bottom-3 right-3">
        <div className="flex gap-1">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
