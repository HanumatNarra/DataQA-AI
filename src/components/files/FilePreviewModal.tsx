'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, MessageSquare, Trash2, Search, FileText, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Loader2 } from 'lucide-react';

interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  nulls: number;
  unique?: number;
  min?: number;
  max?: number;
  mean?: number;
  sample?: any[];
}

interface ParseResult {
  columns: ColumnInfo[];
  rows: any[];
  stats: {
    rowCountEstimate?: number;
    size: number;
    warnings?: string[];
  };
}

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Accept flexible shapes and normalize at runtime
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
  onAnalyze: (fileName: string) => void;
  onDelete: (fileId: string) => void;
}

export function FilePreviewModal({
  isOpen,
  onClose,
  file,
  onDownload,
  onAnalyze,
  onDelete
}: FilePreviewModalProps) {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRows, setFilteredRows] = useState<any[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);

  const fromPath = (p?: string) => (p ? String(p).split('/').pop() || '' : '');
  const displayName = file?.name || file?.filename || fromPath(file?.file_path) || fromPath(file?.storage_path) || 'file';
  const displaySize = file?.size ?? file?.file_size ?? 0;
  const displayDate = file?.uploaded_at ?? file?.created_at ?? '';

  // Initialize worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      workerRef.current = new Worker(new URL('../../workers/fileParser.worker.ts', import.meta.url));
      
      workerRef.current.onmessage = (e) => {
        const { type, fileId, result, error } = e.data;
        
        if (type === 'parseComplete' && fileId === file.id) {
          setParseResult(result);
          setLoading(false);
          setError(null);
        } else if (type === 'parseError' && fileId === file.id) {
          setError(error);
          setLoading(false);
        }
      };
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [file.id]);

  // Load file content and parse
  useEffect(() => {
    if (isOpen && file) {
      loadAndParseFile();
    }
  }, [isOpen, file]);

  // Filter rows based on search term
  useEffect(() => {
    if (parseResult && searchTerm) {
      const filtered = parseResult.rows.filter(row =>
        row.some((cell: any) =>
          String(cell).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredRows(filtered);
    } else {
      setFilteredRows(parseResult?.rows || []);
    }
  }, [parseResult, searchTerm]);

  const loadAndParseFile = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch file content
      const response = await fetch(`/api/uploads/${file.id}/content`);
      if (!response.ok) {
        throw new Error('Failed to fetch file content');
      }
      
      const content = await response.text();
      
      // Check file size (10MB limit)
      if (content.length > 10 * 1024 * 1024) {
        setError('File too large for preview (max 10MB). Please download or use in Charts.');
        setLoading(false);
        return;
      }
      
      // Send to worker for parsing
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'parse',
          fileId: file.id,
          fileContent: content,
          fileName: displayName,
          fileType: file.file_type || 'text/csv'
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
      setLoading(false);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

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
    return isNaN(date.getTime()) ? '—' : date.toLocaleString();
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'number': return 'bg-blue-100 text-blue-800';
      case 'boolean': return 'bg-green-100 text-green-800';
      case 'date': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-7xl h-[90vh] mx-4 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-500" />
            <div>
              <h2 id="modal-title" className="text-xl font-semibold text-gray-900 dark:text-white">
                {displayName}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{formatFileSize(displaySize)}</span>
                <span>•</span>
                <span>Uploaded {formatDate(displayDate)}</span>
                <Badge className={getTypeColor('string')}>
                  {String(displayName).split('.').pop()?.toUpperCase() || 'FILE'}
                </Badge>
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Parsing file...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Preview Error
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                <div className="flex space-x-3 justify-center">
                  <button 
                    onClick={loadAndParseFile} 
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Try Again
                  </button>
                  <button 
                    onClick={() => onDownload(file.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}

          {parseResult && !loading && !error && (
            <div className="h-full flex flex-col">
              {/* Warnings */}
              {parseResult.stats.warnings && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                    <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                      {parseResult.stats.warnings.join(', ')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex-1 flex overflow-hidden">
                {/* Schema Panel */}
                <div className="w-80 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Schema</h3>
                  <div className="space-y-3">
                    {parseResult.columns.map((column, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900 dark:text-white text-sm">
                            {column.name}
                          </span>
                          <Badge className={`text-xs ${getTypeColor(column.type)}`}>
                            {column.type}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          <div>Nulls: {column.nulls}</div>
                          <div>Unique: {column.unique}</div>
                          {column.type === 'number' && (
                            <>
                              {column.min !== undefined && <div>Min: {column.min}</div>}
                              {column.max !== undefined && <div>Max: {column.max}</div>}
                              {column.mean !== undefined && <div>Mean: {column.mean.toFixed(2)}</div>}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Data Table */}
                <div className="flex-1 flex flex-col">
                  {/* Search */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search data..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Table */}
                  <div className="flex-1 overflow-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            #
                          </th>
                          {parseResult.columns.map((column, index) => (
                            <th 
                              key={index}
                              className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                              scope="col"
                            >
                              {column.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredRows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                              {rowIndex + 1}
                            </td>
                            {row.map((cell: any, cellIndex: number) => (
                              <td key={cellIndex} className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                {cell === null || cell === undefined || cell === '' ? (
                                  <span className="text-gray-400 italic">null</span>
                                ) : (
                                  String(cell)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {parseResult && (
              <>
                Showing {filteredRows.length} of {parseResult.rows.length} rows
                {parseResult.stats.rowCountEstimate && parseResult.stats.rowCountEstimate > parseResult.rows.length && (
                  <span> (of {parseResult.stats.rowCountEstimate} total)</span>
                )}
              </>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => onDownload(file.id)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </button>
            
            <button
              onClick={() => {
                onAnalyze(displayName);
                onClose();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 flex items-center"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Analyze in Chat
            </button>
            
            <button
              onClick={() => {
                onDelete(file.id);
                onClose();
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
            
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.getElementById('modal-portal')!
  );
}
