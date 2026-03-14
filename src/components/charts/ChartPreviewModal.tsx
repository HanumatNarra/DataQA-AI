'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { X, Download, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { ChartGalleryItem } from '@/lib/chartTypes';

interface ChartPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  chart: ChartGalleryItem | null;
  charts: ChartGalleryItem[];
  onDownload: (chart: ChartGalleryItem) => void;
  onOpenFullView: (chart: ChartGalleryItem) => void;
}

export default function ChartPreviewModal({
  isOpen,
  onClose,
  chart,
  charts,
  onDownload,
  onOpenFullView
}: ChartPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [preloadedImages, setPreloadedImages] = useState<Set<number>>(new Set());
  const modalRef = useRef<HTMLDivElement>(null);
  const previousButtonRef = useRef<HTMLButtonElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  // Define navigation functions first
  const navigateToPrevious = useCallback(() => {
    if (charts && charts.length > 0 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex, charts]);

  const navigateToNext = useCallback(() => {
    if (charts && charts.length > 0 && currentIndex < charts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, charts]);

  // Find current chart index
  useEffect(() => {
    if (chart && isOpen && charts && charts.length > 0) {
      const index = charts.findIndex(c => c.id === chart.id);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [chart, charts, isOpen]);

  // Preload adjacent images
  useEffect(() => {
    if (!isOpen || !charts || charts.length === 0) return;

    const preloadIndexes = [
      currentIndex - 1,
      currentIndex + 1
    ].filter(i => i >= 0 && i < charts.length);

    preloadIndexes.forEach(index => {
      if (!preloadedImages.has(index) && charts[index] && charts[index].thumbnailUrl) {
        const img = new window.Image();
        img.src = charts[index].thumbnailUrl!;
        setPreloadedImages(prev => new Set([...prev, index]));
      }
    });
  }, [currentIndex, charts, isOpen, preloadedImages]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigateToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateToNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, navigateToPrevious, navigateToNext]);

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Early return if not open or no chart
  if (!isOpen || !chart || !charts || charts.length === 0) {
    return null;
  }

  const currentChart = charts[currentIndex];
  const canNavigatePrevious = currentIndex > 0;
  const canNavigateNext = currentIndex < charts.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl mx-4 bg-white rounded-xl shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex-1 min-w-0">
            <h2 id="modal-title" className="text-xl font-semibold text-slate-900 truncate">
              {currentChart.name}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-slate-500">
                {new Date(currentChart.createdAt).toLocaleString()}
              </span>
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {currentChart.chartType}
              </span>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation buttons */}
        {charts.length > 1 && (
          <>
            <button
              ref={previousButtonRef}
              onClick={navigateToPrevious}
              disabled={!canNavigatePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10
                w-10 h-10 flex items-center justify-center
                bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full
                hover:bg-white hover:border-slate-300
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-blue-500/20
                transition-all duration-150"
              aria-label="Previous chart"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            
            <button
              ref={nextButtonRef}
              onClick={navigateToNext}
              disabled={!canNavigateNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10
                w-10 h-10 flex items-center justify-center
                bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full
                hover:bg-white hover:border-slate-300
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-blue-500/20
                transition-all duration-150"
              aria-label="Next chart"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </>
        )}

        {/* Image content */}
        <div className="relative aspect-[16/10] bg-slate-50">
          {currentChart.thumbnailUrl ? (
            <Image
              src={currentChart.thumbnailUrl}
              alt={`${currentChart.name} chart preview`}
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 80vw"
              priority
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <div className="text-slate-500">No preview available</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200">
          <div className="text-sm text-slate-500">
            {charts.length > 1 && (
              <span>
                {currentIndex + 1} of {charts.length}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => onDownload(currentChart)}
              className="inline-flex items-center gap-2 px-4 py-2
                text-sm font-medium text-slate-700
                bg-white border border-slate-300 rounded-lg
                hover:bg-slate-50 hover:border-slate-400
                focus:outline-none focus:ring-2 focus:ring-blue-500/20
                transition-colors duration-150"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            
            <button
              onClick={() => onOpenFullView(currentChart)}
              className="inline-flex items-center gap-2 px-4 py-2
                text-sm font-medium text-white
                bg-blue-600 border border-blue-600 rounded-lg
                hover:bg-blue-700 hover:border-blue-700
                focus:outline-none focus:ring-2 focus:ring-blue-500/20
                transition-colors duration-150"
            >
              <ExternalLink className="w-4 h-4" />
              Open full view
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
