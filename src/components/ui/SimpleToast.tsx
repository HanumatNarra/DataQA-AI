'use client';

import React from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

interface SimpleToastProps {
  toast: {
    id: string;
    type: 'success' | 'error' | 'info';
    title: string;
    message?: string;
  };
  onClose: (id: string) => void;
}

export function SimpleToast({ toast, onClose }: SimpleToastProps) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
    }
  };

  return (
    <div
      className={`
        max-w-sm w-full bg-white dark:bg-gray-800 border rounded-lg shadow-lg
        transform transition-all duration-300 ease-out
        translate-x-0 opacity-100
        ${getBackgroundColor()}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {toast.title}
            </p>
            {toast.message && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {toast.message}
              </p>
            )}
          </div>
          
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={() => onClose(toast.id)}
              className="inline-flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                focus:outline-none focus:text-gray-600 dark:focus:text-gray-300
                transition-colors duration-150"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SimpleToastContainer({ toasts, onClose }: { toasts: any[]; onClose: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <SimpleToast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

