'use client';

import React from 'react';
import { Eye, Download, Trash2 } from 'lucide-react';

interface ChartActionBarProps {
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
  disabled?: boolean;
  className?: string;
}

export default function ChartActionBar({ 
  onPreview, 
  onDownload, 
  onDelete, 
  disabled = false,
  className = '' 
}: ChartActionBarProps) {
  const buttonClasses = `
    w-9 h-9 flex items-center justify-center
    border border-slate-200 rounded-lg
    bg-white/90 backdrop-blur-sm
    hover:bg-slate-50 hover:border-slate-300
    active:bg-slate-100 active:scale-95
    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-1
    transition-all duration-150 ease-out
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/90
    group
  `;

  const iconClasses = `
    w-4 h-4 text-slate-600
    group-hover:text-slate-700
    group-active:text-slate-800
    transition-colors duration-150
  `;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={onPreview}
        disabled={disabled}
        className={buttonClasses}
        aria-label="Preview chart"
        title="Preview"
      >
        <Eye className={iconClasses} />
      </button>
      
      <button
        onClick={onDownload}
        disabled={disabled}
        className={buttonClasses}
        aria-label="Download chart"
        title="Download"
      >
        <Download className={iconClasses} />
      </button>
      
      <button
        onClick={onDelete}
        disabled={disabled}
        className={buttonClasses}
        aria-label="Delete chart"
        title="Delete"
      >
        <Trash2 className={iconClasses} />
      </button>
    </div>
  );
}
