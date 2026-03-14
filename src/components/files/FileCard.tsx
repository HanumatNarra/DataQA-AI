'use client';

import React, { useState, useCallback } from 'react';
import { FileText, Calendar, HardDrive } from 'lucide-react';
import { FileActionBar } from './FileActionBar';
import { FilePreviewModal } from './FilePreviewModal';
import DeleteConfirmation from '@/components/charts/DeleteConfirmation';
import { useToast } from '@/hooks/useToast';
import { SimpleToastContainer } from '@/components/ui/SimpleToast';

interface FileCardProps {
  // Allow flexible shapes from the database. Normalize at render time safely.
  file: {
    id: string;
    name?: string;
    filename?: string;
    file_path?: string;
    storage_path?: string;
    size?: number;
    file_size?: number;
    uploaded_at?: string;
    created_at?: string;
    file_type?: string;
  };
  onDownload: (fileId: string) => void;
  onDelete: (fileId: string) => Promise<void>;
  onAnalyze: (fileName: string) => void;
}

export function FileCard({ file, onDownload, onDelete, onAnalyze }: FileCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined || bytes === null) return '—';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
  };

  const deriveFileName = (f: FileCardProps['file']): string => {
    const fromPath = (p?: string) => (p ? String(p).split('/').pop() || '' : '');
    const name = f?.name || f?.filename || fromPath(f?.file_path) || fromPath(f?.storage_path) || 'file';
    return String(name);
  };

  const getFileIcon = (fileName?: string) => {
    const base = fileName || '';
    const extension = base.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'csv':
        return '📊';
      case 'xlsx':
      case 'xls':
        return '📈';
      case 'json':
        return '📋';
      default:
        return '📄';
    }
  };

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await onDelete(file.id);
      addToast({
        type: 'success',
        title: 'File deleted',
        message: 'File has been successfully deleted.',
        duration: 3000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Delete failed',
        message: 'Failed to delete file. Please try again.',
        duration: 5000
      });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [file.id, onDelete]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showPreview && !showDeleteConfirm) {
      setShowPreview(true);
    } else if (e.key === 'Escape' && showPreview) {
      setShowPreview(false);
    }
  }, [showPreview, showDeleteConfirm]);

  const displayName = deriveFileName(file);
  const displaySize = file.size ?? file.file_size;
  const displayDate = file.uploaded_at ?? file.created_at;

  return (
    <>
      <div
        className="group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={() => setShowPreview(true)}
        role="button"
        aria-label={`Preview ${displayName}`}
      >
        {/* File Icon */}
        <div className="flex items-center justify-center w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-3">
          <span className="text-2xl">{getFileIcon(displayName)}</span>
        </div>

        {/* File Info */}
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate" title={displayName}>
            {displayName}
          </h3>
          
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-3">
            <div className="flex items-center">
              <HardDrive className="h-3 w-3 mr-1" />
              {formatFileSize(displaySize)}
            </div>
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {formatDate(displayDate)}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <FileActionBar
          onPreview={() => setShowPreview(true)}
          onDownload={() => onDownload(file.id)}
          onDelete={() => setShowDeleteConfirm(true)}
          disabled={deleting}
        />
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <FilePreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          file={file}
          onDownload={onDownload}
          onAnalyze={() => onAnalyze(displayName)}
          onDelete={handleDelete}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <DeleteConfirmation
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Delete File"
          message={`Are you sure you want to delete "${displayName}"? This action cannot be undone.`}
          confirmText="Delete"
          loading={deleting}
        />
      )}

      {/* Toast Container */}
      <SimpleToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}
