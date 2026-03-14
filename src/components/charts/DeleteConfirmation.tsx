'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  chartName?: string;
  title?: string;
  message?: string;
  confirmText?: string;
  loading?: boolean;
}

export default function DeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  chartName,
  title,
  message,
  confirmText,
  loading,
}: DeleteConfirmationProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 id="delete-title" className="text-lg font-semibold text-slate-900">
              {title ?? 'Delete chart?'}
            </h2>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-600 mb-4">
            {message ?? (<>{"This will remove the chart "}<strong>{`"${chartName}"`}</strong>{" and its thumbnail. You can undo for the next 10 seconds."}</>)}
          </p>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2
                text-sm font-medium text-white
                bg-red-600 border border-red-600 rounded-lg
                hover:bg-red-700 hover:border-red-700
                focus:outline-none focus:ring-2 focus:ring-red-500/20
                transition-colors duration-150
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmText ?? 'Delete'}
            </button>
            
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2
                text-sm font-medium text-slate-700
                bg-white border border-slate-300 rounded-lg
                hover:bg-slate-50 hover:border-slate-400
                focus:outline-none focus:ring-2 focus:ring-blue-500/20
                transition-colors duration-150"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
