'use client';

import React from 'react';
import { Eye, Download, Trash2 } from 'lucide-react';

interface FileActionBarProps {
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

export function FileActionBar({ onPreview, onDownload, onDelete, disabled = false }: FileActionBarProps) {
  return (
    <div className="absolute bottom-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <button
        onClick={onPreview}
        disabled={disabled}
        className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Preview file"
        title="Preview file"
      >
        <Eye className="h-4 w-4" />
      </button>
      
      <button
        onClick={onDownload}
        disabled={disabled}
        className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Download file"
        title="Download file"
      >
        <Download className="h-4 w-4" />
      </button>
      
      <button
        onClick={onDelete}
        disabled={disabled}
        className="h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-sm rounded-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-red-600 hover:text-red-700"
        aria-label="Delete file"
        title="Delete file"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
