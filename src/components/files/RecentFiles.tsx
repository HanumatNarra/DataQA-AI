'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileCard } from './FileCard';
import { FilePreviewModal } from './FilePreviewModal';
import { Eye, Plus } from 'lucide-react';
import { useFilePreview } from '@/hooks/useFilePreview';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useToast } from '@/hooks/useToast';
import { SimpleToastContainer } from '@/components/ui/SimpleToast';

interface RecentFilesProps {
  onAnalyze: (fileName: string) => void;
}

export function RecentFiles({ onAnalyze }: RecentFilesProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { previewState, openPreview, closePreview, openMostRecentFile } = useFilePreview();
  const { addToast } = useToast();
  const supabase = createClientComponentClient();

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      const { data, error } = await supabase
        .from('user_files')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      setFiles(data || []);
    } catch (err) {
      console.error('Error loading files:', err);
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleDownload = useCallback(async (fileId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: fileData, error: fileError } = await supabase
        .from('user_files')
        .select('file_path, filename')
        .eq('id', fileId)
        .eq('user_id', user.id)
        .single();

      if (fileError || !fileData) {
        throw new Error('File not found');
      }

      // Get signed URL for download
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from('user-files')
        .createSignedUrl(fileData.file_path, 60);

      if (urlError || !signedUrl) {
        throw new Error('Failed to generate download URL');
      }

      // Trigger download
      const link = document.createElement('a');
      link.href = signedUrl.signedUrl;
      link.download = fileData.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast({
        type: 'success',
        title: 'Download started',
        message: 'File download has started.',
        duration: 3000
      });
    } catch (err) {
      console.error('Download error:', err);
      addToast({
        type: 'error',
        title: 'Download failed',
        message: err instanceof Error ? err.message : 'Failed to download file',
        duration: 5000
      });
    }
  }, [supabase]);

  const handleDelete = useCallback(async (fileId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get file info
      const { data: fileData, error: fileError } = await supabase
        .from('user_files')
        .select('file_path')
        .eq('id', fileId)
        .eq('user_id', user.id)
        .single();

      if (fileError || !fileData) {
        throw new Error('File not found');
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove([fileData.file_path]);

      if (storageError) {
        throw new Error('Failed to delete file from storage');
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('user_files')
        .delete()
        .eq('id', fileId)
        .eq('user_id', user.id);

      if (dbError) {
        throw new Error('Failed to delete file record');
      }

      // Update local state
      setFiles(prev => prev.filter(file => file.id !== fileId));
    } catch (err) {
      console.error('Delete error:', err);
      throw err; // Re-throw to be handled by FileCard
    }
  }, [supabase]);

  const handleQuickPreview = useCallback(() => {
    openMostRecentFile(files);
  }, [files, openMostRecentFile]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Files</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Files</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button 
            onClick={loadFiles}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
              <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Files</h2>
          {files.length > 0 && (
            <button
              onClick={handleQuickPreview}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 flex items-center space-x-2 text-sm"
            >
              <Eye className="h-4 w-4" />
              <span>Quick Preview</span>
            </button>
          )}
        </div>

      {files.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No files yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Upload your first file to get started with data analysis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onDownload={handleDownload}
              onDelete={handleDelete}
              onAnalyze={onAnalyze}
            />
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewState.isOpen && previewState.file && (
        <FilePreviewModal
          isOpen={previewState.isOpen}
          onClose={closePreview}
          file={previewState.file}
          onDownload={handleDownload}
          onAnalyze={onAnalyze}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
