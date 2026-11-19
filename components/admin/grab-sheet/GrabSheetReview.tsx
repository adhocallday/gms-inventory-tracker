'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Check, FileUp, FolderOpen, Download, Pencil, SkipForward, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { StatCard, STAT_GRID } from '@/components/dashboard/StatCard';
import { supabase } from '@/lib/supabase/client';
import { readJsonResponse } from '@/lib/http/read-json';
import { photoToPage, renderPdfPages, type ClientPage } from '@/lib/grab-sheet/client-pages';
import {
  flagDuplicateSkus,
  isAutoApprovable,
  MATCH_LABELS,
  matchTile,
  normaliseSku,
  type CatalogProduct,
} from '@/lib/grab-sheet/sku-match';
import type { ApiCallUsage, GrabSheetPageResult, GrabSheetRunResult, GrabSheetTile, MatchStatus } from '@/lib/grab-sheet/types';
import type { ApproveItem, ApproveResult } from '@/lib/grab-sheet/approve';

type Decision = 'pending' | 'saving' | 'saved' | 'skipped' | 'failed';
interface ReviewTile extends GrabSheetTile {
  decision: Decision;
  error?: string;
  /** Set when the reviewer typed a SKU. */
  editedSku?: string;
}

interface TourOption {
  id: string;
  name: string;
}

const MATCH_VARIANT: Record<MatchStatus, 'success' | 'info' | 'warning' | 'danger'> = {
  matched: 'success',
  new: 'info',
  conflict: 'warning',
  unreadable: 'danger',
};

const FILTERS = ['all', 'needs-review', 'matched', 'new', 'conflict', 'unreadable', 'done'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  'needs-review': 'Needs review',
  matched: 'Matched',
  new: 'New products',
  conflict: 'Conflicts',
  unreadable: 'Unreadable',
  done: 'Done',
};

const usd = (n: number) => `$${n.toFixed(n < 1 ? 3 : 2)}`;
const DIRECT_LIMIT = 4 * 1024 * 1024;

function withDecisions(pages: GrabSheetPageResult[]): ReviewTile[] {
  return flagDuplicateSkus(pages.flatMap((p) => p.tiles)).map((t) => ({ ...t, decision: 'pending' as Decision }));
}

export function GrabSheetReview({ initialTourId }: { initialTourId?: string }) {
  const [tours, setTours] = useState<TourOption[]>([]);
  const [tourId, setTourId] = useState(initialTourId ?? '');
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [sheets, setSheets] = useState('');
  const [sourceFile, setSourceFile] = useState('');
  const [pages, setPages] = useState<GrabSheetPageResult[]>([]);
  const [tiles, setTiles] = useState<ReviewTile[]>([]);
  const [usage, setUsage] = useState<ApiCallUsage[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [loadedFromFile, setLoadedFromFile] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const jsonInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/tours')
      .then((r) => r.json())
      .then((d) => setTours((d.data ?? []).map((t: TourOption) => ({ id: t.id, name: t.name }))))
      .catch(() => setTours([]));
    fetch('/api/admin/grab-sheet/catalog')
      .then((r) => r.json())
      .then((d) => setCatalog(d.products ?? []))
      .catch(() => setCatalog([]));
  }, []);

  const reset = () => {
    setPages([]);
    setTiles([]);
    setUsage([]);
    setError(null);
    setLoadedFromFile(false);
  };

  // ── Reading a file ───────────────────────────────────────────────────────
  const pagesFromXlsx = async (file: File): Promise<ClientPage[]> => {
    let res: Response;
    if (file.size > DIRECT_LIMIT) {
      const sign = await fetch('/api/admin/grab-sheet/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, size: file.size }),
      });
      const { path, token } = await readJsonResponse<{ path: string; token: string }>(sign);
      const up = await supabase.storage.from('documents').uploadToSignedUrl(path, token, file, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      if (up.error) throw new Error(`Upload failed: ${up.error.message}`);
      res = await fetch('/api/admin/grab-sheet/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: path, fileName: file.name, sheets }),
      });
    } else {
      const form = new FormData();
      form.append('file', file);
      if (sheets.trim()) form.append('sheets', sheets);
      res = await fetch('/api/admin/grab-sheet/pages', { method: 'POST', body: form });
    }
    const data = await readJsonResponse<{ pages: ClientPage[] }>(res);
    return data.pages;
  };

  const run = async (files: File[]) => {
    reset();
    if (!files.length) return;
    const first = files[0];
    setSourceFile(first.name);
    try {
      setProgress('Preparing pages…');
      let prepared: ClientPage[];
      if (/\.xlsx$/i.test(first.name)) prepared = await pagesFromXlsx(first);
      else if (first.type === 'application/pdf' || /\.pdf$/i.test(first.name)) prepared = await renderPdfPages(first);
      else prepared = await Promise.all(files.filter((f) => f.type.startsWith('image/')).map((f, i) => photoToPage(f, i + 1)));
      if (!prepared.length) throw new Error('No pages found in that file');

      const done: GrabSheetPageResult[] = [];
      const calls: ApiCallUsage[] = [];
      for (const [i, page] of prepared.entries()) {
        setProgress(`Reading page ${i + 1} of ${prepared.length} (${page.label})…`);
        const res = await fetch('/api/admin/grab-sheet/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: page.dataUrl, sourceFile: first.name, sourcePage: page.sourcePage, label: page.label }),
        });
        const data = await readJsonResponse<{ page: GrabSheetPageResult; usage: ApiCallUsage[] }>(res);
        done.push(data.page);
        calls.push(...data.usage);
        setPages([...done]);
        setTiles(withDecisions(done));
        setUsage([...calls]);
      }
      setProgress(null);
    } catch (e) {
      setProgress(null);
      setError((e as Error).message);
    }
  };

  const loadSaved = async (file: File) => {
    reset();
    try {
      const data = JSON.parse(await file.text()) as GrabSheetRunResult;
      if (data.version !== 1 || !Array.isArray(data.pages)) throw new Error('Not a saved grab-sheet result');
      setSourceFile(data.sourceFile);
      setPages(data.pages);
      setTiles(withDecisions(data.pages));
      setUsage(data.usage ?? []);
      setLoadedFromFile(true);
    } catch (e) {
      setError(`Could not load ${file.name}: ${(e as Error).message}`);
    }
  };

  const saveResult = () => {
    const result: GrabSheetRunResult = { version: 1, createdAt: new Date().toISOString(), sourceFile, pages, usage };
    const blob = new Blob([JSON.stringify(result)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${sourceFile.replace(/\.[^.]+$/, '') || 'grab-sheet'}-review.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Review actions ───────────────────────────────────────────────────────
  const update = (id: string, patch: Partial<ReviewTile>) =>
    setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const changeSku = (tile: ReviewTile, input: string) => {
    const sku = normaliseSku(input);
    const match = matchTile({ sku, rawSku: input }, catalog);
    update(tile.id, {
      editedSku: input,
      sku,
      match,
      verification: {
        ...tile.verification,
        status: 'needs_review',
        reason: sku ? `SKU set by reviewer (read ${tile.rawSku || 'nothing'})` : 'Not a valid SKU',
      },
    });
  };

  const toItem = (t: ReviewTile): ApproveItem => ({
    tileId: t.id,
    sku: t.sku!,
    productId: t.match.productId,
    cropDataUrl: t.cropDataUrl,
    imageBox: t.imageBox,
    captionBox: t.captionBox,
    sourceFile: t.sourceFile,
    sourcePage: t.sourcePage,
    skuRead: t.verification.skuRead,
    confidence: t.confidence,
    newProduct: t.match.status === 'new' ? { name: t.name, sizes: t.sizes, price: t.price } : null,
  });

  const approve = useCallback(
    async (list: ReviewTile[]) => {
      const ready = list.filter((t) => t.sku && t.decision !== 'saved');
      if (!ready.length) return;
      setTiles((prev) => prev.map((t) => (ready.some((r) => r.id === t.id) ? { ...t, decision: 'saving', error: undefined } : t)));
      try {
        const res = await fetch('/api/admin/grab-sheet/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tourId: tourId || null, items: ready.map(toItem) }),
        });
        const { results } = await readJsonResponse<{ results: ApproveResult[] }>(res);
        setTiles((prev) =>
          prev.map((t) => {
            const r = results.find((x) => x.tileId === t.id);
            return r ? { ...t, decision: r.ok ? 'saved' : 'failed', error: r.error } : t;
          })
        );
      } catch (e) {
        const message = (e as Error).message;
        setTiles((prev) => prev.map((t) => (ready.some((r) => r.id === t.id) ? { ...t, decision: 'failed', error: message } : t)));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tourId]
  );

  // ── Derived numbers ──────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { verified: 0, review: 0, matched: 0, new: 0, conflict: 0, unreadable: 0, saved: 0, autoApprovable: 0 };
    for (const t of tiles) {
      if (t.verification.status === 'verified') c.verified += 1;
      else c.review += 1;
      c[t.match.status] += 1;
      if (t.decision === 'saved') c.saved += 1;
      if (t.decision === 'pending' && isAutoApprovable(t)) c.autoApprovable += 1;
    }
    return c;
  }, [tiles]);
  const totalCost = usage.reduce((s, u) => s + u.costUsd, 0);

  const visible = tiles.filter((t) => {
    switch (filter) {
      case 'all':
        return true;
      case 'needs-review':
        return t.verification.status === 'needs_review' && t.decision === 'pending';
      case 'done':
        return t.decision === 'saved' || t.decision === 'skipped';
      default:
        return t.match.status === filter;
    }
  });

  const pageRows = pages.map((p) => {
    const ts = tiles.filter((t) => t.pageKey === p.pageKey);
    return {
      page: p.sourcePage,
      label: p.label,
      tiles: ts.length,
      verified: ts.filter((t) => t.verification.status === 'verified').length,
      review: ts.filter((t) => t.verification.status !== 'verified').length,
      cost: usage.filter((u) => u.label.startsWith(p.label)).reduce((s, u) => s + u.costUsd, 0),
    };
  });
  type PageRow = (typeof pageRows)[number];
  const pageColumns: ColumnDef<PageRow, unknown>[] = [
    { accessorKey: 'page', header: 'Page' },
    { accessorKey: 'label', header: 'Sheet / file' },
    { accessorKey: 'tiles', header: 'Products found' },
    { accessorKey: 'verified', header: 'Verified' },
    { accessorKey: 'review', header: 'Needs review' },
    { accessorKey: 'cost', header: 'AI cost', cell: ({ getValue }) => usd(getValue() as number) },
  ];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <section className="g-card p-5 space-y-4" data-tour="grab-sheet-import">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm">
            <span className="font-medium text-[var(--color-text-primary)]">Tour for new products</span>
            <select
              value={tourId}
              onChange={(e) => setTourId(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
            >
              <option value="">Choose a tour</option>
              {tours.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--color-text-primary)]">Sheets (Excel only, optional)</span>
            <input
              value={sheets}
              onChange={(e) => setSheets(e.target.value)}
              placeholder="e.g. GRAB, GRAB 2"
              className="mt-1 w-full rounded-md border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]"
            />
          </label>
          <div className="flex items-end gap-2">
            <Button onClick={() => fileInput.current?.click()} disabled={!!progress}>
              <FileUp className="h-4 w-4" aria-hidden="true" /> Read grab sheet
            </Button>
            <Button variant="secondary" onClick={() => jsonInput.current?.click()} disabled={!!progress}>
              <FolderOpen className="h-4 w-4" aria-hidden="true" /> Load saved result
            </Button>
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".xlsx,.pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          aria-label="Grab sheet file"
          onChange={(e) => {
            void run(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
        <input
          ref={jsonInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Saved result file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void loadSaved(f);
            e.target.value = '';
          }}
        />
        <p className="text-sm text-[var(--color-text-secondary)]">
          Excel workbook, PDF, or photos of the sheet. Each page is read by AI, every product picture is cut out and its SKU
          is read a second time from the cut-out. Nothing is saved until you approve it.
        </p>
        {progress && <p className="text-sm font-medium text-[var(--color-text-primary)]" role="status">{progress}</p>}
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </section>

      {tiles.length > 0 && (
        <>
          <div className={STAT_GRID}>
            <StatCard label="Products found" value={tiles.length} sub={`${pages.length} page${pages.length === 1 ? '' : 's'}`} />
            <StatCard label="SKU verified" value={counts.verified} sub="Both reads agree" />
            <StatCard label="Needs review" value={counts.review} valueTone={counts.review ? 'warn' : 'default'} />
            <StatCard label="Matched" value={counts.matched} sub={`${counts.conflict} with a different image`} />
            <StatCard label="New products" value={counts.new} sub={`${counts.unreadable} unreadable`} />
            <StatCard
              label="AI cost"
              value={usd(totalCost)}
              sub={loadedFromFile ? 'From the saved run' : `${usage.length} calls`}
            />
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter products">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                    filter === f
                      ? 'border-[var(--color-text-primary)] text-[var(--color-text-primary)]'
                      : 'border-[var(--color-bg-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {FILTER_LABELS[f]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={saveResult}>
                <Download className="h-4 w-4" aria-hidden="true" /> Save result
              </Button>
              <Button
                size="sm"
                disabled={!counts.autoApprovable}
                onClick={() => void approve(tiles.filter((t) => t.decision === 'pending' && isAutoApprovable(t)))}
              >
                <Check className="h-4 w-4" aria-hidden="true" /> Approve all matched ({counts.autoApprovable})
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" data-tour="grab-sheet-review">
            {visible.map((t) => (
              <TileCard
                key={t.id}
                tile={t}
                tourChosen={!!tourId}
                onApprove={() => void approve([t])}
                onSkip={() => update(t.id, { decision: t.decision === 'skipped' ? 'pending' : 'skipped' })}
                onChangeSku={(v) => changeSku(t, v)}
              />
            ))}
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-semibold">Pages</h2>
            <DataTable columns={pageColumns} data={pageRows} compact />
          </section>
        </>
      )}
    </div>
  );
}

function TileCard({
  tile: t,
  tourChosen,
  onApprove,
  onSkip,
  onChangeSku,
}: {
  tile: ReviewTile;
  tourChosen: boolean;
  onApprove: () => void;
  onSkip: () => void;
  onChangeSku: (sku: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(t.sku ?? t.rawSku);
  const isNew = t.match.status === 'new';
  const canApprove = !!t.sku && t.decision === 'pending' && t.match.status !== 'unreadable' && (!isNew || tourChosen);

  const action = !t.sku
    ? 'Set the SKU to approve'
    : isNew
      ? tourChosen
        ? 'Approving creates this product'
        : 'Choose a tour to create this product'
      : t.match.existingImageId
        ? 'Approving replaces the current image'
        : 'Approving adds the first image';

  return (
    <article
      className={`g-card flex flex-col overflow-hidden ${t.decision === 'skipped' ? 'opacity-60' : ''}`}
      aria-label={`${t.sku ?? t.rawSku ?? 'Unreadable'} ${t.name}`}
    >
      <div className="grid grid-cols-[1fr_auto] gap-2 bg-white p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={t.cropDataUrl} alt={`Cut-out of ${t.name}`} className="h-44 w-full object-contain" />
        {t.match.existingImageId && (
          <figure className="w-20 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/product-images/${t.match.existingImageId}?w=160`}
              alt="Current image"
              className="h-20 w-20 rounded border border-[var(--color-bg-border)] object-contain"
            />
            <figcaption className="mt-1 text-[11px] text-[var(--color-text-secondary)]">Current</figcaption>
          </figure>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 border-t border-[var(--color-bg-border)] p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={MATCH_VARIANT[t.match.status]} size="sm">
            {MATCH_LABELS[t.match.status]}
          </Badge>
          <Badge variant={t.verification.status === 'verified' ? 'success' : 'warning'} size="sm">
            {t.verification.status === 'verified' ? 'SKU verified' : 'Needs review'}
          </Badge>
          {t.decision === 'saved' && <Badge variant="posted" size="sm">Saved</Badge>}
          {t.decision === 'skipped' && <Badge size="sm">Skipped</Badge>}
          {t.decision === 'failed' && <Badge variant="error" size="sm">Not saved</Badge>}
        </div>

        {editing ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onChangeSku(draft);
              setEditing(false);
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.toUpperCase())}
              aria-label="SKU"
              className="min-w-0 flex-1 rounded-md border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] px-2 py-1 font-mono text-sm"
              autoFocus
            />
            <Button size="sm" type="submit">
              Set
            </Button>
          </form>
        ) : (
          <p className="font-mono text-sm font-semibold text-[var(--color-text-primary)]">
            {t.sku ?? (t.rawSku ? `${t.rawSku} (not a valid SKU)` : 'No SKU read')}
          </p>
        )}
        <p className="text-sm text-[var(--color-text-primary)]">{t.name}</p>
        {t.match.productName && t.match.status !== 'new' && (
          <p className="text-xs text-[var(--color-text-secondary)]">In catalog as “{t.match.productName}”</p>
        )}
        {t.verification.reason && <p className="text-xs text-warn">{t.verification.reason}</p>}
        {t.match.suggestedSku && !t.editedSku && (
          <button
            type="button"
            className="self-start text-xs font-medium text-[var(--color-red-primary)] underline"
            onClick={() => onChangeSku(t.match.suggestedSku!)}
          >
            Use {t.match.suggestedSku}?
          </button>
        )}
        <p className="text-xs text-[var(--color-text-secondary)]">
          Page {t.sourcePage} · read {t.verification.skuRead ?? '—'} · confidence {Math.round(t.confidence * 100)}%
        </p>
        {t.error && <p className="text-xs text-danger">{t.error}</p>}

        <div className="mt-auto space-y-1.5 pt-1">
          <p className="text-xs text-[var(--color-text-secondary)]">{action}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={onApprove} disabled={!canApprove} isLoading={t.decision === 'saving'}>
              <Check className="h-4 w-4" aria-hidden="true" /> Approve
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing((v) => !v)} disabled={t.decision === 'saved'}>
              <Pencil className="h-4 w-4" aria-hidden="true" /> Change SKU
            </Button>
            <Button size="sm" variant="ghost" onClick={onSkip} disabled={t.decision === 'saved' || t.decision === 'saving'}>
              {t.decision === 'skipped' ? <Undo2 className="h-4 w-4" aria-hidden="true" /> : <SkipForward className="h-4 w-4" aria-hidden="true" />}
              {t.decision === 'skipped' ? 'Undo' : 'Skip'}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
