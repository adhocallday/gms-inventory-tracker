'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FileDropzone } from '@/components/upload/FileDropzone';
import { useShows } from '@/hooks/useShows';
import { useTours } from '@/hooks/useTours';

type DocType = 'po' | 'packing-list' | 'sales-report' | 'settlement';

const DOC_TYPES: { id: DocType; label: string; description: string }[] = [
  {
    id: 'po',
    label: 'Purchase Order',
    description:
      'Capture order details, vendor, and line items ready for posting to purchase_orders.'
  },
  {
    id: 'packing-list',
    label: 'Packing List',
    description:
      'Match receipts to existing POs and verify quantities received at the warehouse.'
  },
  {
    id: 'sales-report',
    label: 'Sales Report',
    description:
      'Ingest AtVenu show reports (quantities, pricing, comps) for review before posting.'
  },
  {
    id: 'settlement',
    label: 'Settlement',
    description:
      'Review settlement data (gross, fees, comps) before it lands in the show ledger.'
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
  const [validation, setValidation] = useState<any>(null);
  const [matchingSteps, setMatchingSteps] = useState<string[]>([]);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  const [detectedType, setDetectedType] = useState<DocType | null>(null);
  const [detectedClassification, setDetectedClassification] = useState<ClassificationResult | null>(null);

  const { tours } = useTours();
  const { shows } = useShows(tourId || undefined);

  const docInfo = useMemo(() => DOC_TYPES.find((entry) => entry.id === docType), [docType]);
  const docId = searchParams.docId;

  const filteredShowOptions = useMemo(() => {
    if (!requiresShow[docType]) return [];
    return shows;
  }, [docType, shows]);

  const handleParseComplete = (data: any, parsedDocumentId?: string | null, validationPayload?: any) => {
    setParsedId(parsedDocumentId ?? null);
    setMatchingSteps(validationPayload?.matching ?? []);
    setValidation(validationPayload ?? null);
  };

  return (
    <div className="g-container py-12 space-y-10">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--g-text-muted)]">
          Document center
        </p>
        <h1 className="text-3xl font-semibold g-title">Upload Document</h1>
        <p className="text-sm text-[var(--g-text-dim)] max-w-3xl">
          Drop a single PDF and the AI parser will identify if it is a Purchase Order,
          Packing List, Sales Report, or Settlement. You can edit the prefills,
          validate the content, and approve to post into the database without
          ever storing the PDF.
        </p>

        {/* Auto-Detect Toggle */}
        <div className="p-4 border border-white/10 rounded-lg bg-[var(--g-surface)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--g-text)]">
                AI Auto-Detect
              </h3>
              <p className="text-xs text-[var(--g-text-muted)] mt-1">
                Automatically detect document type from PDF content
              </p>
            </div>
            <button
              onClick={() => {
                setAutoDetectEnabled(!autoDetectEnabled);
                setDetectedType(null);
                setDetectedClassification(null);
              }}
              className={`px-4 py-2 rounded-lg transition font-semibold text-sm ${
                autoDetectEnabled
                  ? 'bg-[var(--g-accent)] text-white'
                  : 'bg-white/10 text-[var(--g-text-dim)]'
              }`}
            >
              {autoDetectEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        {/* Manual Type Selection (only when auto-detect is off) */}
        {!autoDetectEnabled && (
          <div>
            <h3 className="text-xs uppercase tracking-[0.3em] text-[var(--g-text-muted)] mb-3">
              Select Document Type
            </h3>
            <div className="flex flex-wrap gap-3">
              {DOC_TYPES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => {
                    setDocType(entry.id);
                    if (!requiresShow[entry.id]) {
                      setShowId('');
                    }
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                    docType === entry.id
                      ? 'border-[var(--g-accent)] bg-[rgba(225,6,20,0.12)] text-[var(--g-text)]'
                      : 'border-white/10 text-[var(--g-text-dim)] hover:border-white/30'
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            {docInfo && (
              <p className="text-xs text-[var(--g-text-muted)] mt-2">{docInfo.description}</p>
            )}
          </div>
        )}

        {/* Detected Type Badge (when auto-detect is on and type is detected) */}
        {autoDetectEnabled && detectedType && detectedClassification && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-sm">✓</span>
              <div className="flex-1">
                <p className="text-sm text-green-400 font-semibold">
                  Detected: {detectedClassification.typeName}
                </p>
                <p className="text-xs text-green-400/80 mt-0.5">
                  Confidence: {detectedClassification.confidence} · {detectedClassification.reasoning}
                </p>
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="g-card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-[var(--g-text-muted)] block mb-2">Tour</label>
            <select
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
              <label className="text-xs text-[var(--g-text-muted)] block mb-2">Show</label>
              <select
                className="g-input w-full"
                value={showId}
                onChange={(event) => setShowId(event.target.value)}
              >
                <option value="">Choose a show</option>
                {filteredShowOptions.map((show) => (
                  <option key={show.id} value={show.id}>
                    {new Date(show.show_date).toLocaleDateString('en-US')} · {show.venue_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

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
              console.log('Auto-selected tour:', tourShowMatch.tourName);
            }
            if (tourShowMatch?.showId) {
              setShowId(tourShowMatch.showId);
              console.log('Auto-selected show:', tourShowMatch.venueName, 'on', tourShowMatch.showDate);
            }

            console.log('Detected document type:', classification);
            console.log('Tour/Show match:', tourShowMatch);
          }}
          onParseComplete={handleParseComplete}
          autoRedirect={false}
        />

        <div className="space-y-3">
          <div className="text-xs uppercase tracking-[0.3em] text-[var(--g-text-muted)]">
            Draft status
          </div>
          {parsedId ? (
            <div className="border border-white/10 rounded-md p-4 bg-[var(--g-surface-2)] space-y-2">
              <p className="text-sm text-[var(--g-text)] font-semibold">
                Draft created · ID {parsedId}
              </p>
              <div className="text-xs text-[var(--g-text-muted)] space-y-1">
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
                    <p className="text-[var(--g-text-muted)]">Inference:</p>
                    <ul className="list-disc list-inside text-[var(--g-text-muted)]">
                      {matchingSteps.map((entry, index) => (
                        <li key={index}>{entry}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <Link
                href={`/dashboard/parsed-documents/${parsedId}`}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--g-accent)]"
              >
                Review draft →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-[var(--g-text-muted)]">
              No document parsed yet. Upload a PDF to start a new draft.
            </p>
          )}
          {docId && (
            <p className="text-xs text-[var(--g-text-muted)]">
              Resuming draft{' '}
              <Link href={`/dashboard/parsed-documents/${docId}`} className="text-[var(--g-accent)]">
                #{docId}
              </Link>
              .
            </p>
          )}
          <p className="text-xs text-[var(--g-text-muted)]">
            Need to continue reviewing other drafts?{' '}
            <Link href="/dashboard/parsed-documents" className="text-[var(--g-accent)]">
              See the list
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
