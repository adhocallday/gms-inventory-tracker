'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FileDropzone } from '@/components/upload/FileDropzone';
import { InlineDraftReview } from '@/components/upload/InlineDraftReview';
import { useShows } from '@/hooks/useShows';
import { useTours } from '@/hooks/useTours';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Check } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type DocType = 'po' | 'packing-list' | 'sales-report' | 'settlement';

const DOC_TYPES: { id: DocType; label: string; description: string }[] = [
  {
    id: 'po',
    label: 'Purchase order',
    description: 'Vendor, order date and line items. Posting creates the purchase order.'
  },
  {
    id: 'packing-list',
    label: 'Packing list',
    description: 'Quantities received at the warehouse, matched to an existing purchase order.'
  },
  {
    id: 'sales-report',
    label: 'Sales report',
    description: 'An AtVenu show report: units, prices and comps for one show.'
  },
  {
    id: 'settlement',
    label: 'Settlement',
    description: 'The venue settlement for one show: gross, tax, fees and net.'
  }
];

const requiresShow: Record<DocType, boolean> = {
  po: false,
  'packing-list': false,
  'sales-report': true,
  settlement: true
};

type UploadPortalProps = {
  searchParams: {
    docType?: string;
    tourId?: string;
    showId?: string;
    docId?: string;
  };
};

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

export default function UploadPortal({ searchParams }: UploadPortalProps) {
  const initialDocType = (searchParams.docType as DocType) ?? 'po';
  const [docType, setDocType] = useState<DocType>(initialDocType);
  const [tourId, setTourId] = useState(searchParams.tourId ?? '');
  const [showId, setShowId] = useState(searchParams.showId ?? '');
  const [parsedId, setParsedId] = useState<string | null>(null);
  const [normalizedJson, setNormalizedJson] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);
  const [matchingSteps, setMatchingSteps] = useState<string[]>([]);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  const [detectedType, setDetectedType] = useState<DocType | null>(null);
  const [detectedClassification, setDetectedClassification] = useState<ClassificationResult | null>(null);
  const [showInlineReview, setShowInlineReview] = useState(false);

  const { tours } = useTours();
  const { shows } = useShows(tourId || undefined);

  const docInfo = useMemo(() => DOC_TYPES.find((entry) => entry.id === docType), [docType]);
  const docId = searchParams.docId;

  const filteredShowOptions = useMemo(() => {
    if (!requiresShow[docType]) return [];
    return shows;
  }, [docType, shows]);

  const handleParseComplete = (data: any, parsedDocumentId?: string | null, validationPayload?: any, matching?: string[]) => {
    setParsedId(parsedDocumentId ?? null);
    setNormalizedJson(data);
    setMatchingSteps(matching ?? []);
    setValidation(validationPayload ?? null);
    setShowInlineReview(true);
  };

  const handleResetUpload = () => {
    setParsedId(null);
    setNormalizedJson(null);
    setValidation(null);
    setMatchingSteps([]);
    setShowInlineReview(false);
    setDetectedType(null);
    setDetectedClassification(null);
  };

  return (
    <div className="g-container py-6 space-y-6">
      <PageHeader
        title="Upload a document"
        subtitle="One PDF at a time: a purchase order, packing list, sales report or settlement. Claude reads it into a draft, and nothing is posted until you review and approve the draft."
      />

      {/* Document type: detected by Claude, or chosen by hand */}
      <div data-tour="upload-detect" className="rounded-lg border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 id="detect-label" className="text-sm font-semibold text-[var(--color-text-primary)]">
              Detect the document type
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              {autoDetectEnabled
                ? 'Claude reads the PDF and picks the type. Turn off to choose it yourself.'
                : 'Choose the type below.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoDetectEnabled}
            aria-labelledby="detect-label"
            onClick={() => {
              setAutoDetectEnabled(!autoDetectEnabled);
              setDetectedType(null);
              setDetectedClassification(null);
            }}
            className={cn(
              'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border transition-colors',
              autoDetectEnabled
                ? 'border-[var(--color-red-primary)] bg-[var(--color-red-primary)]'
                : 'border-[var(--color-bg-border)] bg-[var(--color-bg-elevated)]'
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                autoDetectEnabled ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        {!autoDetectEnabled && (
          <div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Document type">
              {DOC_TYPES.map((entry) => (
                <Button
                  key={entry.id}
                  size="sm"
                  aria-pressed={docType === entry.id}
                  onClick={() => {
                    setDocType(entry.id);
                    if (!requiresShow[entry.id]) {
                      setShowId('');
                    }
                  }}
                  variant={docType === entry.id ? 'primary' : 'secondary'}
                >
                  {entry.label}
                </Button>
              ))}
            </div>
            {docInfo && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-2">{docInfo.description}</p>
            )}
          </div>
        )}
      </div>

      {/* Detected Type Badge (when auto-detect is on and type is detected) */}
      {autoDetectEnabled && detectedType && detectedClassification && (
        <div className="p-3 bg-success-bg border border-success-border rounded-lg" role="status">
          <div className="flex items-start gap-2">
            <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm text-success font-semibold">
                Detected: {detectedClassification.typeName}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                Confidence {detectedClassification.confidence}. {detectedClassification.reasoning}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="g-card p-4 md:p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="upload-tour" className="text-sm font-medium text-[var(--color-text-primary)] block mb-1.5">Tour</label>
            <select
              id="upload-tour"
              className="g-input w-full"
              value={tourId}
              onChange={(event) => {
                setTourId(event.target.value);
                setShowId('');
              }}
            >
              <option value="">Choose a tour</option>
              {tours.map((tour) => (
                <option key={tour.id} value={tour.id}>
                  {tour.name}
                </option>
              ))}
            </select>
          </div>
          {requiresShow[docType] && (
            <div>
              <label htmlFor="upload-show" className="text-sm font-medium text-[var(--color-text-primary)] block mb-1.5">Show</label>
              <select
                id="upload-show"
                className="g-input w-full"
                value={showId}
                onChange={(event) => setShowId(event.target.value)}
              >
                <option value="">Choose a show</option>
                {filteredShowOptions.map((show) => (
                  <option key={show.id} value={show.id}>
                    {formatDate(show.show_date)} · {show.venue_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!showInlineReview && (
          <div data-tour="upload-dropzone">
          <FileDropzone
            tourId={tourId || undefined}
            showId={showId || undefined}
            fileType={autoDetectEnabled ? undefined : docType}
            autoDetect={autoDetectEnabled}
            onTypeDetected={(type, classification, tourShowMatch) => {
              setDetectedType(type);
              setDetectedClassification(classification);
              setDocType(type); // Set the doc type for show requirement checking

              // Auto-select tour and show if matched
              if (tourShowMatch?.tourId) {
                setTourId(tourShowMatch.tourId);
              }
              if (tourShowMatch?.showId) {
                setShowId(tourShowMatch.showId);
              }
            }}
            onParseComplete={handleParseComplete}
            autoRedirect={false}
          />
          </div>
        )}

        {/* Inline Draft Review - shown after parsing */}
        {showInlineReview && parsedId && normalizedJson && (
          <InlineDraftReview
            parsedDocumentId={parsedId}
            docType={docType}
            normalizedJson={normalizedJson}
            validation={validation ?? { missing_fields: [], warnings: [] }}
            matching={matchingSteps}
            onClose={handleResetUpload}
            onPosted={handleResetUpload}
          />
        )}

        <p data-tour="upload-channels" className="text-sm text-[var(--color-text-secondary)]">
          <span className="font-semibold text-[var(--color-text-primary)]">Ways in:</span> upload here (live). An
          email-in address and iPad scan at receiving are planned and will feed this same intake.
        </p>

        <div className="space-y-3" data-tour="upload-status">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Draft</h2>
          {parsedId ? (
            <div className="border border-[var(--color-bg-border)] rounded-md p-4 bg-[var(--color-bg-elevated)] space-y-2">
              <p className="text-sm text-[var(--color-text-primary)] font-semibold">
                Draft created
              </p>
              <div className="text-sm text-[var(--color-text-secondary)] space-y-1">
                {validation?.missing_fields?.length ? (
                  <p>Missing fields: {validation.missing_fields.join(', ')}</p>
                ) : (
                  <p>All required fields present.</p>
                )}
                {validation?.warnings?.length ? (
                  <p>Warnings: {validation.warnings.join('; ')}</p>
                ) : (
                  <p>No parsing warnings.</p>
                )}
                {matchingSteps.length > 0 && (
                  <div>
                    <p>How the tour and show were matched:</p>
                    <ul className="list-disc list-inside">
                      {matchingSteps.map((entry, index) => (
                        <li key={index}>{entry}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <Link
                href={`/dashboard/parsed-documents/${parsedId}`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-red-text)] hover:underline"
              >
                Review draft <ArrowRight className="inline-block h-4 w-4 align-[-0.125em] ml-1" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-secondary)]">
              No PDF parsed in this session yet. The draft appears here after upload.
            </p>
          )}
          {docId && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              <Link href={`/dashboard/parsed-documents/${docId}`} className="font-semibold text-[var(--color-red-text)] hover:underline">
                Continue reviewing the draft you opened
              </Link>
            </p>
          )}
          <p className="text-sm text-[var(--color-text-secondary)]">
            Earlier drafts are in{' '}
            <Link href="/dashboard/parsed-documents" className="font-medium text-[var(--color-red-text)] hover:underline">
              Documents
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
