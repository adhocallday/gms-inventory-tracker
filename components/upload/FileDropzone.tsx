'use client';

import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';

type DocType = 'po' | 'packing-list' | 'sales-report' | 'settlement';

interface ClassificationResult {
  detectedType: DocType;
  typeName: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  indicators: string[];
}

interface FileDropzoneProps {
  tourId?: string;
  showId?: string;
  fileType?: DocType; // Optional when autoDetect is true
  onParseComplete?: (
    data: any,
    parsedDocumentId?: string | null,
    validation?: any,
    matching?: string[]
  ) => void;
  autoRedirect?: boolean; // If true, redirects to review page after parse
  autoDetect?: boolean; // If true, uses AI to detect document type
  onTypeDetected?: (type: DocType, classification: ClassificationResult) => void;
}

export function FileDropzone({
  tourId,
  showId,
  fileType,
  onParseComplete,
  autoRedirect = true,
  autoDetect = false,
  onTypeDetected
}: FileDropzoneProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [detectedType, setDetectedType] = useState<DocType | null>(null);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (pdfPreview) {
        URL.revokeObjectURL(pdfPreview);
      }
    };
  }, [pdfPreview]);

  // Function to detect document type
  const detectDocumentType = useCallback(async (file: File) => {
    setDetecting(true);
    setError(null);

    // Create client-side preview URL for the PDF
    const previewUrl = URL.createObjectURL(file);
    setPdfPreview(previewUrl);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/detect-doc-type', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Detection failed');
      }

      const result = await response.json();
      setDetectedType(result.classification.detectedType);
      setClassification(result.classification);

      // Call callback if provided
      if (onTypeDetected) {
        onTypeDetected(result.classification.detectedType, result.classification);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Detection error:', err);
      // Clean up preview URL on error
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPdfPreview(null);
      }
    } finally {
      setDetecting(false);
    }
  }, [onTypeDetected]);

  // Function to parse document
  const parseDocument = useCallback(async (file: File, type: DocType) => {
    setUploading(true);
    setParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (tourId) formData.append('tourId', tourId);
      if (showId) formData.append('showId', showId);

      const response = await fetch(`/api/parse/${type}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Parsing failed');
      }

      const result = await response.json();
      setParsedData(result.normalized_json);

      // Call callback if provided
      if (onParseComplete) {
        onParseComplete(
          result.normalized_json,
          result.parsedDocumentId,
          result.validation,
          result.matching
        );
      }

      // Auto-redirect to review page if enabled
      if (autoRedirect && result.parsedDocumentId) {
        // Small delay to show success message
        setTimeout(() => {
          router.push(`/dashboard/parsed-documents/${result.parsedDocumentId}`);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Parse error:', err);
    } finally {
      setUploading(false);
      setParsing(false);
    }
  }, [tourId, showId, onParseComplete, autoRedirect, router]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setCurrentFile(file);
    setError(null);
    setParsedData(null);
    setClassification(null);
    setPdfPreview(null);

    // If auto-detect is enabled, detect first
    if (autoDetect) {
      await detectDocumentType(file);
      return; // Don't parse yet, wait for user confirmation
    }

    // Otherwise, parse directly with provided fileType
    if (!fileType) {
      setError('No document type specified');
      return;
    }
    await parseDocument(file, fileType);
  }, [autoDetect, fileType, detectDocumentType, parseDocument]);

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
        
        {detecting && (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--g-accent)] mx-auto"></div>
            <p className="text-sm text-[var(--g-text-dim)]">Detecting document type...</p>
            <p className="text-xs text-[var(--g-text-muted)] mt-1">Analyzing PDF with AI...</p>
          </div>
        )}

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

        {!uploading && !parsing && !detecting && !classification && (
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

      {/* Detection Results with PDF Preview */}
      {classification && !parsing && (
        <div className="mt-6 space-y-4">
          {/* PDF Preview (if available) */}
          {pdfPreview && (
            <div className="border border-white/10 rounded-lg overflow-hidden bg-black/40">
              <iframe
                src={pdfPreview}
                className="w-full h-96"
                title="PDF Preview"
              />
            </div>
          )}

          {/* Detection Results */}
          <div className="p-4 border border-white/10 rounded-lg bg-[var(--g-surface)]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-[var(--g-text)]">
                  Detected: {classification.typeName}
                </p>
                <p className="text-xs text-[var(--g-text-muted)]">
                  Confidence: {classification.confidence}
                </p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                classification.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                classification.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {classification.confidence.toUpperCase()}
              </span>
            </div>

            <p className="text-xs text-[var(--g-text-dim)] mb-2">
              {classification.reasoning}
            </p>

            <div className="text-xs text-[var(--g-text-muted)] mb-4">
              <strong>Indicators found:</strong>
              <ul className="list-disc list-inside mt-1">
                {classification.indicators.map((indicator, i) => (
                  <li key={i}>{indicator}</li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (currentFile && detectedType) {
                    // Clean up preview URL before parsing
                    if (pdfPreview) {
                      URL.revokeObjectURL(pdfPreview);
                    }
                    parseDocument(currentFile, detectedType);
                  }
                }}
                className="flex-1 px-4 py-2 bg-[var(--g-accent)] text-white rounded-lg hover:bg-[var(--g-accent-2)] transition font-semibold"
              >
                Confirm & Parse
              </button>
              <button
                onClick={() => {
                  // Clean up preview URL when canceling
                  if (pdfPreview) {
                    URL.revokeObjectURL(pdfPreview);
                  }
                  setClassification(null);
                  setPdfPreview(null);
                  setDetectedType(null);
                  setCurrentFile(null);
                }}
                className="px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition text-[var(--g-text)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
