'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/lib/supabase/client';

interface FileDropzoneProps {
  tourId?: string;
  fileType: 'po' | 'packing-list' | 'sales-report' | 'settlement';
  onParseComplete?: (data: any, parsedDocumentId?: string | null) => void;
}

export function FileDropzone({ tourId, fileType, onParseComplete }: FileDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    setError(null);
    setParsedData(null);
    
    try {
      setUploading(true);
      
      // Upload to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${fileType}/${tourId || 'unknown'}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      setUploading(false);
      setParsing(true);
      
      // Trigger AI parsing
      const response = await fetch('/api/parse-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: uploadData.path,
          fileType,
          tourId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Parsing failed');
      }
      
      const result = await response.json();
      setParsedData(result.data);
      
      if (onParseComplete) {
        onParseComplete(result.data, result.parsedDocumentId);
      }
      
    } catch (err: any) {
      setError(err.message);
      console.error('Upload/Parse error:', err);
    } finally {
      setUploading(false);
      setParsing(false);
    }
  }, [fileType, tourId, onParseComplete]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });
  
  const getFileTypeLabel = () => {
    switch (fileType) {
      case 'po': return 'Purchase Order';
      case 'packing-list': return 'Packing List';
      case 'sales-report': return 'Sales Report';
      case 'settlement': return 'Settlement Report';
      default: return 'Document';
    }
  };
  
  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-[var(--g-accent)] bg-[rgba(225,6,20,0.08)]' : 'border-white/15 hover:border-white/30'}
          ${uploading || parsing ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {uploading && (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--g-accent)] mx-auto"></div>
            <p className="text-sm text-[var(--g-text-dim)]">Uploading file...</p>
          </div>
        )}
        
        {parsing && (
          <div className="space-y-2">
            <div className="animate-pulse">
              <div className="h-12 w-12 mx-auto mb-2">
                <svg className="text-[var(--g-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-sm text-[var(--g-text-dim)]">AI is parsing your document...</p>
              <p className="text-xs text-[var(--g-text-muted)] mt-1">This may take 10-30 seconds</p>
            </div>
          </div>
        )}
        
        {!uploading && !parsing && (
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-[var(--g-text-muted)]"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {isDragActive ? (
              <p className="text-sm text-[var(--g-text-dim)]">Drop the PDF here</p>
            ) : (
              <>
                <p className="text-sm text-[var(--g-text-dim)]">
                  Drag & drop {getFileTypeLabel()} PDF here, or click to select
                </p>
                <p className="text-xs text-[var(--g-text-muted)]">PDF files only</p>
              </>
            )}
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-4 p-4 border border-[rgba(225,6,20,0.35)] rounded-lg bg-[rgba(225,6,20,0.08)]">
          <p className="text-sm text-[var(--g-accent)]">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}
      
      {parsedData && (
        <div className="mt-4 p-4 border border-white/10 rounded-lg bg-[var(--g-surface)]">
          <p className="text-sm text-[var(--g-text)] font-semibold mb-2">
            ✓ Document parsed successfully!
          </p>
          <pre className="text-xs bg-black/40 p-3 rounded border border-white/10 overflow-auto max-h-96 text-[var(--g-text-dim)]">
            {JSON.stringify(parsedData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
