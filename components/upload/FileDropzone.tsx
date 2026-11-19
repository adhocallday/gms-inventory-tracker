'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from '@/components/layout/NavigationProgress';
import { buildUploadBody, readJsonResponse, stageLargeUpload } from '@/lib/upload/upload-client';
import { Check, Loader2, Upload } from 'lucide-react';

type DocType = 'po' | 'packing-list' | 'sales-report' | 'settlement';

interface ClassificationResult {
  detectedType: DocType;
  typeName: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  indicators: string[];
}

interface TourShowMatch {
  tourId: string | null;
  tourName: string | null;
  showId: string | null;
  showDate: string | null;
  venueName: string | null;
  matchReasoning: string[];
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
  onTypeDetected?: (type: DocType, classification: ClassificationResult, tourShowMatch?: TourShowMatch) => void;
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
  const { navigate, isPending: opening } = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [detectedType, setDetectedType] = useState<DocType | null>(null);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [tourShowMatch, setTourShowMatch] = useState<TourShowMatch | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  // Large files are staged in storage once, then reused for detect + parse
  const stagedUpload = useRef<{ file: File; path: string | null } | null>(null);

  const getStagedPath = useCallback(async (file: File) => {
    if (stagedUpload.current?.file === file) return stagedUpload.current.path;
    const path = await stageLargeUpload(file);
    stagedUpload.current = { file, path };
    return path;
  }, []);

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
      const stagedPath = await getStagedPath(file);
      const response = await fetch('/api/detect-doc-type', {
        method: 'POST',
        ...buildUploadBody(file, stagedPath)
      });
      const result = await readJsonResponse(response);
      setDetectedType(result.classification.detectedType);
      setClassification(result.classification);
      setTourShowMatch(result.tourShowMatch || null);

      // Call callback if provided
      if (onTypeDetected) {
        onTypeDetected(
          result.classification.detectedType,
          result.classification,
          result.tourShowMatch
        );
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
  }, [onTypeDetected, getStagedPath]);

  // Function to parse document
  const parseDocument = useCallback(async (file: File, type: DocType) => {
    setUploading(true);
    setParsing(true);
    setError(null);

    try {
      const stagedPath = await getStagedPath(file);
      const response = await fetch(`/api/parse/${type}`, {
        method: 'POST',
        ...buildUploadBody(file, stagedPath, { tourId, showId })
      });
      const result = await readJsonResponse(response);
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
          navigate(`/dashboard/parsed-documents/${result.parsedDocumentId}`);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Parse error:', err);
    } finally {
      setUploading(false);
      setParsing(false);
    }
  }, [tourId, showId, onParseComplete, autoRedirect, navigate, getStagedPath]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setCurrentFile(file);
    setError(null);
    setParsedData(null);
    setClassification(null);
    setTourShowMatch(null);
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
      case 'po': return 'purchase order';
      case 'packing-list': return 'packing list';
      case 'sales-report': return 'sales report';
      case 'settlement': return 'settlement';
      default: return 'document';
    }
  };
  
  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 md:p-10 text-center cursor-pointer
          transition-colors duration-150
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]
          ${isDragActive ? 'border-[var(--color-red-primary)] bg-[var(--color-red-muted)]' : 'border-[var(--color-bg-border-strong)] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'}
          ${uploading || parsing ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {detecting && (
          <div className="space-y-2" role="status">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-red-primary)] mx-auto"></div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Detecting the document type…</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Claude is reading the first pages.</p>
          </div>
        )}

        {uploading && (
          <div className="space-y-2" role="status">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-red-primary)] mx-auto"></div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Uploading the PDF…</p>
          </div>
        )}

        {parsing && (
          <div className="space-y-2" role="status">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-red-primary)] mx-auto"></div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Claude is reading the document…</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Usually 10 to 30 seconds.</p>
          </div>
        )}

        {!uploading && !parsing && !detecting && !classification && (
          <div className="space-y-2">
            <Upload className="mx-auto h-12 w-12 text-[var(--color-text-muted)]" aria-hidden="true" />
            {isDragActive ? (
              <p className="text-sm text-[var(--color-text-secondary)]">Drop the PDF here</p>
            ) : (
              <>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Drop a {getFileTypeLabel()} PDF here, or click to choose a file
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">PDF only, one file at a time</p>
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
            <div className="border border-[var(--color-bg-border)] rounded-lg overflow-hidden bg-[var(--color-bg-elevated)]">
              <iframe
                src={pdfPreview}
                className="w-full h-48 md:h-64 lg:h-96"
                title="PDF Preview"
              />
            </div>
          )}

          {/* Detection Results */}
          <div className="p-4 border border-[var(--color-bg-border)] rounded-lg bg-[var(--color-bg-surface)]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Detected: {classification.typeName}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-md border text-xs font-medium ${
                classification.confidence === 'high' ? 'bg-success-bg text-success border-success-border' :
                classification.confidence === 'medium' ? 'bg-warn-bg text-warn border-warn-border' :
                'bg-danger-bg text-danger border-danger-border'
              }`}>
                {classification.confidence} confidence
              </span>
            </div>

            <p className="text-sm text-[var(--color-text-secondary)] mb-2">
              {classification.reasoning}
            </p>

            <div className="text-sm text-[var(--color-text-secondary)] mb-4">
              <strong className="font-medium text-[var(--color-text-primary)]">What it found:</strong>
              <ul className="list-disc list-inside mt-1">
                {classification.indicators.map((indicator, i) => (
                  <li key={i}>{indicator}</li>
                ))}
              </ul>
            </div>

            {/* Tour/Show Match Information */}
            {tourShowMatch && (tourShowMatch.tourId || tourShowMatch.showId) && (
              <div className="mb-4 p-3 bg-info-bg border border-info-border rounded-lg text-sm">
                <p className="font-semibold text-info mb-1">Matched to</p>
                {tourShowMatch.tourName && (
                  <p className="text-[var(--color-text-primary)]">
                    <strong>Tour:</strong> {tourShowMatch.tourName}
                  </p>
                )}
                {tourShowMatch.showDate && tourShowMatch.venueName && (
                  <p className="text-[var(--color-text-primary)]">
                    <strong>Show:</strong> {tourShowMatch.showDate} at {tourShowMatch.venueName}
                  </p>
                )}
                {tourShowMatch.matchReasoning.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-info cursor-pointer">Why this match</summary>
                    <ul className="list-disc list-inside mt-1 text-[var(--color-text-secondary)]">
                      {tourShowMatch.matchReasoning.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
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
                type="button"
                className="flex-1 px-4 py-2.5 bg-[var(--color-red-primary)] text-white rounded-md hover:bg-[var(--color-red-hover)] active:bg-[var(--color-red-active)] transition-colors font-semibold text-sm"
              >
                Read this document
              </button>
              <button
                onClick={() => {
                  // Clean up preview URL when canceling
                  if (pdfPreview) {
                    URL.revokeObjectURL(pdfPreview);
                  }
                  setClassification(null);
                  setTourShowMatch(null);
                  setPdfPreview(null);
                  setDetectedType(null);
                  setCurrentFile(null);
                }}
                type="button"
                className="px-4 py-2.5 border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] rounded-md hover:bg-[var(--color-bg-elevated)] transition-colors text-[var(--color-text-primary)] text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 border border-danger-border rounded-lg bg-danger-bg" role="alert">
          <p className="text-sm text-danger">
            <strong>Could not read this PDF.</strong> {error}
          </p>
        </div>
      )}

      {parsedData && (
        <div className="mt-4 p-3 md:p-4 border border-[var(--color-bg-border)] rounded-lg bg-[var(--color-bg-surface)]">
          <p className="text-sm text-[var(--color-text-primary)] font-semibold mb-2">
            <Check className="inline-block h-4 w-4 align-[-0.125em] mr-1 text-success" aria-hidden="true" /> Document read
          </p>
          {autoRedirect && (
            <p className="mb-2 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {opening ? 'Opening the draft…' : 'Opening the draft for review…'}
            </p>
          )}
          <pre className="text-xs bg-[var(--color-bg-elevated)] p-2 md:p-3 rounded border border-[var(--color-bg-border)] overflow-auto max-h-48 md:max-h-64 lg:max-h-96 text-[var(--color-text-secondary)]">
            {JSON.stringify(parsedData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
