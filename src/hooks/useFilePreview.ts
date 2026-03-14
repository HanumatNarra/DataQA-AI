'use client';

import { useState, useCallback } from 'react';

interface FilePreviewState {
  isOpen: boolean;
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
  } | null;
}

export function useFilePreview() {
  const [previewState, setPreviewState] = useState<FilePreviewState>({
    isOpen: false,
    file: null
  });

  const openPreview = useCallback((file: FilePreviewState['file']) => {
    setPreviewState({
      isOpen: true,
      file
    });
  }, []);

  const closePreview = useCallback(() => {
    setPreviewState({
      isOpen: false,
      file: null
    });
  }, []);

  const openMostRecentFile = useCallback((files: any[]) => {
    if (files.length > 0) {
      const getDate = (f: any) => new Date(f?.uploaded_at || f?.created_at || 0).getTime();
      const mostRecent = files.sort((a, b) => getDate(b) - getDate(a))[0];
      openPreview(mostRecent);
    }
  }, [openPreview]);

  return {
    previewState,
    openPreview,
    closePreview,
    openMostRecentFile
  };
}

