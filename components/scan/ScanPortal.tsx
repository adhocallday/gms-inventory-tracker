'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, FileText, ImagePlus, ScanLine, ScanText } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { MOBILE_NAV_HEIGHT } from '@/components/layout/MobileNav';
import { InlineDraftReview } from '@/components/upload/InlineDraftReview';
import { Button } from '@/components/ui/Button';
import { useShows } from '@/hooks/useShows';
import { useTours } from '@/hooks/useTours';
import { formatDate } from '@/lib/format';
import { readJsonResponse } from '@/lib/http/read-json';
import { cn } from '@/lib/utils';
import { createPage, preparePagesForUpload, releasePages, type PageImage } from './image-process';
import { PageTray } from './PageTray';
import { ScannerView } from './ScannerView';

export const MAX_PAGES = 10;

type DocType = 'po' | 'packing-list' | 'sales-report' | 'settlement';
type Mode = 'scan' | 'camera' | 'photos';
type Phase = 'capture' | 'detecting' | 'reading' | 'review';

const DOC_TYPES: { id: DocType; label: string }[] = [
  { id: 'packing-list', label: 'Packing list' },
  { id: 'settlement', label: 'Settlement' },
  { id: 'sales-report', label: 'Sales report' },
  { id: 'po', label: 'Purchase order' },
];
const isDocType = (v: unknown): v is DocType => DOC_TYPES.some((t) => t.id === v);
const requiresShow = (t: DocType | null) => t === 'sales-report' || t === 'settlement';

const MODES: { id: Mode; label: string; icon: typeof Camera }[] = [
  { id: 'scan', label: 'Scan', icon: ScanLine },
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'photos', label: 'Photos', icon: ImagePlus },
];

interface Classification {
  detectedType: DocType;
  typeName: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface DraftResult {
  docType: DocType;
  parsedDocumentId: string;
  normalized: any;
  validation: { missing_fields: string[]; warnings: string[] };
  matching: string[];
}

interface ScanPortalProps {
  searchParams: { docType?: string; tourId?: string; showId?: string };
}

/**
 * Mobile-first document scanner: capture pages with the live camera, the
 * camera app or the photo library, then read them into a draft. Nothing is
 * posted until the draft is reviewed and approved.
 */
export function ScanPortal({ searchParams }: ScanPortalProps) {
  const [mode, setMode] = useState<Mode>('camera');
  const [pages, setPagesState] = useState<PageImage[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docType, setDocType] = useState<DocType | ''>(isDocType(searchParams.docType) ? searchParams.docType : '');
  const [tourId, setTourId] = useState(searchParams.tourId ?? '');
  const [showId, setShowId] = useState(searchParams.showId ?? '');
  const [phase, setPhase] = useState<Phase>('capture');
  const [detected, setDetected] = useState<Classification | null>(null);
  const [result, setResult] = useState<DraftResult | null>(null);

  const { tours } = useTours();
  const { shows } = useShows(tourId || undefined);

  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  // Kept current between renders so back-to-back captures are not lost.
  const pagesRef = useRef(pages);
  const setPages = useCallback((next: PageImage[]) => {
    pagesRef.current = next;
    setPagesState(next);
  }, []);

  // Phones start on the camera; desktops on the photo library.
  useEffect(() => {
    if (!window.matchMedia('(pointer: coarse)').matches) setMode('photos');
  }, []);

  // Free the object URLs when leaving the page.
  useEffect(() => () => releasePages(pagesRef.current), []);

  const addFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setError(null);
      const images = files.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
      if (images.length < files.length) {
        setError('Only photos can be scanned here. For a PDF, use Upload document.');
        if (!images.length) return;
      }
      const room = MAX_PAGES - pagesRef.current.length;
      if (room <= 0) {
        setError(`Up to ${MAX_PAGES} pages per document.`);
        return;
      }
      setAdding(true);
      try {
        const created = await Promise.all(images.slice(0, room).map((f) => createPage(f)));
        setPages([...pagesRef.current, ...created]);
        if (images.length > room) setError(`Only the first ${MAX_PAGES} pages were added.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'That image could not be read.');
      } finally {
        setAdding(false);
      }
    },
    [setPages]
  );

  const removePage = (page: PageImage) => {
    releasePages([page]);
    setPages(pagesRef.current.filter((p) => p.id !== page.id));
  };

  const reset = () => {
    releasePages(pagesRef.current);
    setPages([]);
    setPhase('capture');
    setResult(null);
    setDetected(null);
    setError(null);
  };

  const readDocument = async () => {
    setError(null);
    let blobs: Blob[];
    try {
      blobs = await preparePagesForUpload(pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The pages could not be prepared.');
      return;
    }
    const body = (fields: Record<string, string>) => {
      const form = new FormData();
      blobs.forEach((b, i) => form.append('pages[]', new File([b], `page-${i + 1}.jpg`, { type: 'image/jpeg' })));
      for (const [k, v] of Object.entries(fields)) if (v) form.append(k, v);
      return form;
    };

    let type: DocType | null = docType || null;
    let tour = tourId;
    let show = showId;
    try {
      if (!type) {
        setPhase('detecting');
        const detection = await readJsonResponse(
          await fetch('/api/detect-doc-type', { method: 'POST', body: body({}) })
        );
        type = detection.classification.detectedType as DocType;
        setDetected(detection.classification);
        const match = detection.tourShowMatch;
        if (!tour && match?.tourId) tour = match.tourId;
        if (!show && match?.showId && match?.tourId === tour) show = match.showId;
        setTourId(tour);
      }
      if (!requiresShow(type)) show = '';
      setShowId(show);

      setPhase('reading');
      const parsed = await readJsonResponse(
        await fetch(`/api/parse/${type}`, { method: 'POST', body: body({ tourId: tour, showId: show }) })
      );
      setResult({
        docType: type,
        parsedDocumentId: parsed.parsedDocumentId,
        normalized: parsed.normalized_json,
        validation: parsed.validation ?? { missing_fields: [], warnings: [] },
        matching: parsed.matching ?? [],
      });
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The document could not be read.');
      setPhase('capture');
    }
  };

  const busy = phase === 'detecting' || phase === 'reading';
  const effectiveType: DocType | null = docType || detected?.detectedType || null;

  if (phase === 'review' && result) {
    return (
      <div className="g-container py-4 md:py-6 space-y-4">
        <PageHeader title="Check the draft" subtitle="Claude read the pages into a draft. Nothing is posted until you approve it." />
        {detected && (
          <p role="status" className="flex items-start gap-2 rounded-lg border border-success-border bg-success-bg p-3 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span>
              <span className="font-semibold text-success">Detected: {detected.typeName}</span>
              <span className="text-[var(--color-text-secondary)]"> · confidence {detected.confidence}</span>
            </span>
          </p>
        )}
        <InlineDraftReview
          parsedDocumentId={result.parsedDocumentId}
          docType={result.docType}
          normalizedJson={result.normalized}
          validation={result.validation}
          matching={result.matching}
          onClose={reset}
        />
        <Button variant="secondary" className="w-full md:w-auto" onClick={reset}>
          <ScanLine className="h-4 w-4" aria-hidden="true" />
          Scan another document
        </Button>
      </div>
    );
  }

  return (
    <div className="g-container py-4 md:py-6 space-y-5">
      <PageHeader
        title="Scan a document"
        subtitle="Photograph a packing list, settlement, sales report or purchase order, one photo per page. Claude reads the pages into a draft for you to check."
      />

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        data-testid="scan-camera-input"
        onChange={(e) => {
          void addFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
      <input
        ref={libraryInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        data-testid="scan-photos-input"
        onChange={(e) => {
          void addFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />

      <section className="space-y-3" aria-label="Add pages">
        <div
          role="tablist"
          aria-label="How to add pages"
          className="grid grid-cols-3 gap-1 rounded-lg border border-[var(--color-bg-border)] bg-[var(--color-bg-elevated)] p-1"
        >
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={cn(
                'flex h-11 items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-red-primary)]',
                mode === id
                  ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-sm ring-1 ring-[var(--color-bg-border)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <ModeCard
          mode={mode}
          hasPages={pages.length > 0}
          disabled={busy || pages.length >= MAX_PAGES}
          onScan={() => setScannerOpen(true)}
          onCamera={() => cameraInput.current?.click()}
          onPhotos={() => libraryInput.current?.click()}
        />
        {adding && <p className="text-sm text-[var(--color-text-secondary)]">Preparing pages…</p>}
      </section>

      {pages.length > 0 && (
        <section className="space-y-3" aria-labelledby="scan-pages-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="scan-pages-heading" className="text-sm font-semibold text-[var(--color-text-primary)]">
              {pages.length} {pages.length === 1 ? 'page' : 'pages'}
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">Read in this order. Up to {MAX_PAGES}.</p>
          </div>
          <PageTray pages={pages} onChange={setPages} onRemove={removePage} />
        </section>
      )}

      <section className="g-card p-4 space-y-4" aria-label="Document details">
        <div>
          <label htmlFor="scan-doc-type" className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
            Document type
          </label>
          <select
            id="scan-doc-type"
            className="g-input w-full"
            value={docType}
            disabled={busy}
            onChange={(e) => {
              setDocType(e.target.value as DocType | '');
              setDetected(null);
            }}
          >
            <option value="">Detect automatically</option>
            {DOC_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="scan-tour" className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
              Tour
            </label>
            <select
              id="scan-tour"
              className="g-input w-full"
              value={tourId}
              disabled={busy}
              onChange={(e) => {
                setTourId(e.target.value);
                setShowId('');
              }}
            >
              <option value="">{docType ? 'Choose a tour' : 'Match from the document'}</option>
              {tours.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {(effectiveType === null || requiresShow(effectiveType)) && (
            <div>
              <label htmlFor="scan-show" className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                Show <span className="font-normal text-[var(--color-text-secondary)]">(sales reports, settlements)</span>
              </label>
              <select
                id="scan-show"
                className="g-input w-full"
                value={showId}
                disabled={busy || !tourId}
                onChange={(e) => setShowId(e.target.value)}
              >
                <option value="">{tourId ? 'Match from the document' : 'Choose a tour first'}</option>
                {shows.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatDate(s.show_date)} · {s.venue_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-lg border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div
        className="sticky z-10 -mx-4 border-t border-[var(--color-bg-border)] bg-[var(--color-bg-base)]/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
        style={{ bottom: `calc(${MOBILE_NAV_HEIGHT}px + env(safe-area-inset-bottom))` }}
      >
        <Button size="lg" className="w-full md:w-auto" onClick={readDocument} disabled={!pages.length || adding} isLoading={busy}>
          {!busy && <ScanText className="h-5 w-5" aria-hidden="true" />}
          {phase === 'detecting'
            ? 'Detecting the document type…'
            : phase === 'reading'
              ? `Reading ${pages.length} ${pages.length === 1 ? 'page' : 'pages'}…`
              : 'Read document'}
        </Button>
      </div>

      <p className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Have the PDF?{' '}
          <Link href="/upload" className="font-medium text-[var(--color-red-text)] hover:underline">
            Upload it instead
          </Link>
          .
        </span>
      </p>

      {scannerOpen && (
        <ScannerView
          pageCount={pages.length}
          maxPages={MAX_PAGES}
          onCapture={(page) => setPages([...pagesRef.current, page])}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </div>
  );
}

function ModeCard({
  mode,
  hasPages,
  disabled,
  onScan,
  onCamera,
  onPhotos,
}: {
  mode: Mode;
  hasPages: boolean;
  disabled: boolean;
  onScan: () => void;
  onCamera: () => void;
  onPhotos: () => void;
}) {
  const content = {
    scan: {
      icon: ScanLine,
      title: hasPages ? 'Scan more pages' : 'Start scanning',
      body: 'Live camera with a page frame and black-and-white enhancement. Capture each page in order, then tap Done. Needs HTTPS.',
      onClick: onScan,
    },
    camera: {
      icon: Camera,
      title: hasPages ? 'Take another photo' : 'Take a photo',
      body: 'Opens your camera app. One photo per page.',
      onClick: onCamera,
    },
    photos: {
      icon: ImagePlus,
      title: hasPages ? 'Add more photos' : 'Choose photos',
      body: 'Photos or screenshots already on this device, several at once.',
      onClick: onPhotos,
    },
  }[mode];
  const Icon = content.icon;

  return (
    <button
      type="button"
      onClick={content.onClick}
      disabled={disabled}
      className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] px-6 py-8 text-center transition-colors hover:border-[var(--color-red-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-red-primary)] disabled:opacity-60"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-red-primary)] text-white">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-base font-semibold text-[var(--color-text-primary)]">{content.title}</span>
      <span className="max-w-md text-sm text-[var(--color-text-secondary)]">{content.body}</span>
    </button>
  );
}
