'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ArrowLeft, ArrowRight, FileText, Search, SortAsc, X } from 'lucide-react';
import { useFuzzySearch } from '@/hooks/useFuzzySearch';
import { cn } from '@/lib/utils';

const FILTER_BUTTON = 'px-3 py-1.5 text-sm font-medium rounded-md border transition-colors';
const FILTER_ON = 'bg-[var(--color-text-primary)] text-[var(--color-bg-surface)] border-[var(--color-text-primary)]';
const FILTER_OFF =
  'bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] border-[var(--color-bg-border)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]';

export interface Tour {
  id: string;
  name: string;
  artist: string;
}

interface Show {
  id: string;
  show_date: string;
  venue_name: string;
  city?: string;
  state?: string;
}

export interface ParsedDocument {
  id: string;
  doc_type: 'po' | 'packing-list' | 'sales-report' | 'settlement';
  status: 'draft' | 'approved' | 'posted' | 'rejected' | 'error';
  source_filename?: string;
  source_hash: string;
  tour_id?: string;
  show_id?: string;
  created_at: string;
  updated_at: string;
  tours?: Tour | null;
  shows?: Show | null;
}

const DOC_TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'po', label: 'PO' },
  { value: 'packing-list', label: 'Packing list' },
  { value: 'sales-report', label: 'Sales report' },
  { value: 'settlement', label: 'Settlement' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'posted', label: 'Posted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'error', label: 'Error' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'type', label: 'By type' },
  { value: 'status', label: 'By status' },
];

const DOC_TYPE_LABELS: Record<string, string> = {
  po: 'Purchase order',
  'packing-list': 'Packing list',
  'sales-report': 'Sales report',
  settlement: 'Settlement',
};

/**
 * The documents list. The first page (no filters) and the tour list arrive
 * from the server; changing a filter or page fetches /api/parsed-documents.
 */
export function ParsedDocumentsList({
  initialDocuments,
  initialCount,
  tours,
  pageSize,
}: {
  initialDocuments: ParsedDocument[];
  initialCount: number;
  tours: Tour[];
  /** Documents per page; the server loaded the first page with this size. */
  pageSize: number;
}) {
  const [documents, setDocuments] = useState<ParsedDocument[]>(initialDocuments);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(initialCount);

  // Filter state
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tourFilter, setTourFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [offset, setOffset] = useState(0);
  const limit = pageSize;

  // Fetch documents with server-side filters. The first render already has
  // the unfiltered first page from the server, so it is not fetched again.
  const serverPage = useRef(true);
  useEffect(() => {
    if (serverPage.current) {
      serverPage.current = false;
      return;
    }
    async function fetchDocuments() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
        });

        // Apply server-side filters
        if (docTypeFilter !== 'all') params.set('doc_type', docTypeFilter);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (tourFilter !== 'all') params.set('tour_id', tourFilter);

        const res = await fetch(`/api/parsed-documents?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.data || []);
          setTotalCount(data.count || 0);
        } else {
          console.error('Failed to fetch documents');
          setDocuments([]);
        }
      } catch (err) {
        console.error('Error fetching documents:', err);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, [docTypeFilter, statusFilter, tourFilter, offset]);

  // Client-side fuzzy search
  const searchableDocuments = useMemo(() => {
    return documents.map((doc) => ({
      ...doc,
      searchText: [
        doc.source_filename,
        doc.tours?.name,
        doc.shows?.venue_name,
        doc.shows?.city,
      ]
        .filter(Boolean)
        .join(' '),
    }));
  }, [documents]);

  const fuzzyResults = useFuzzySearch(searchableDocuments, search, {
    keys: ['source_filename', 'tours.name', 'shows.venue_name', 'shows.city', 'searchText'],
    threshold: 0.4,
  });

  // Sort results
  const sortedDocuments = useMemo(() => {
    const docs = [...fuzzyResults];

    switch (sortBy) {
      case 'oldest':
        return docs.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case 'updated':
        return docs.sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      case 'type':
        return docs.sort((a, b) => a.doc_type.localeCompare(b.doc_type));
      case 'status':
        return docs.sort((a, b) => a.status.localeCompare(b.status));
      case 'newest':
      default:
        return docs.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  }, [fuzzyResults, sortBy]);

  // Check if any filter is active
  const hasActiveFilters =
    docTypeFilter !== 'all' ||
    statusFilter !== 'all' ||
    tourFilter !== 'all' ||
    search.trim() !== '';

  // Clear all filters
  const clearAllFilters = () => {
    setDocTypeFilter('all');
    setStatusFilter('all');
    setTourFilter('all');
    setSearch('');
    setOffset(0);
  };

  // Count by type for badges
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: documents.length };
    documents.forEach((doc) => {
      counts[doc.doc_type] = (counts[doc.doc_type] || 0) + 1;
    });
    return counts;
  }, [documents]);

  // Count by status for badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: documents.length };
    documents.forEach((doc) => {
      counts[doc.status] = (counts[doc.status] || 0) + 1;
    });
    return counts;
  }, [documents]);

  const totalPages = Math.ceil(totalCount / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handleNextPage = () => {
    if (offset + limit < totalCount) {
      setOffset(offset + limit);
    }
  };

  const handlePrevPage = () => {
    if (offset >= limit) {
      setOffset(offset - limit);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="g-container py-6">
      <PageHeader
        title="Documents"
        subtitle="Every PDF Claude has read. Drafts wait here until someone checks them against the source and posts them."
        actions={
          <Link href="/upload" className={buttonVariants()}>
            Upload document
          </Link>
        }
      />

      {/* Search Bar */}
      <div className="mt-6 mb-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            className="w-full pl-10 pr-10 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-bg-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-red-primary)] focus:border-transparent"
            placeholder="Search by file name, tour or venue"
            aria-label="Search documents"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs Row */}
      <div data-tour="docs-filters" className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
        {/* Document Type Tabs */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Document type">
          {DOC_TYPE_OPTIONS.map((option) => {
            const isActive = docTypeFilter === option.value;
            const count = typeCounts[option.value];
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  setDocTypeFilter(option.value);
                  setOffset(0);
                }}
                className={cn(FILTER_BUTTON, isActive ? FILTER_ON : FILTER_OFF)}
              >
                {option.label}
                {count !== undefined && option.value !== 'all' && docTypeFilter === 'all' && (
                  <span className="ml-2 text-xs tabular-nums opacity-80">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <SortAsc className="w-4 h-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
            <select
              aria-label="Sort documents"
              className="g-input py-1.5"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-sm font-medium text-[var(--color-red-text)] hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Status Tabs Row */}
      <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Status">
        {STATUS_OPTIONS.map((option) => {
          const isActive = statusFilter === option.value;
          const count = statusCounts[option.value];
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => {
                setStatusFilter(option.value);
                setOffset(0);
              }}
              className={cn(FILTER_BUTTON, isActive ? FILTER_ON : FILTER_OFF)}
            >
              {option.label}
              {count !== undefined && option.value !== 'all' && statusFilter === 'all' && (
                <span className="ml-2 text-xs tabular-nums opacity-80">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tour Filter (keep as dropdown since there could be many) */}
      {tours.length > 0 && (
        <div className="mb-6">
          <select
            aria-label="Tour"
            className="g-input"
            value={tourFilter}
            onChange={(e) => {
              setTourFilter(e.target.value);
              setOffset(0);
            }}
          >
            <option value="all">All tours</option>
            {tours.map((tour) => (
              <option key={tour.id} value={tour.id}>
                {tour.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Results Count */}
      <div className="mb-4 text-sm text-[var(--color-text-secondary)]">
        {loading ? (
          'Loading documents…'
        ) : (
          <>
            Found {sortedDocuments.length} document{sortedDocuments.length !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
            {docTypeFilter !== 'all' && ` of type ${DOC_TYPE_LABELS[docTypeFilter] || docTypeFilter}`}
            {statusFilter !== 'all' && ` with status ${statusFilter}`}
            {tourFilter !== 'all' && (
              <> for tour {tours.find((t) => t.id === tourFilter)?.name || tourFilter}</>
            )}
          </>
        )}
      </div>

      {/* Document List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="g-card p-6">
              <Skeleton className="h-4 w-1/3 mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : sortedDocuments.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12 text-[var(--color-text-muted)]" />}
          title={hasActiveFilters ? 'No documents match' : 'No documents yet'}
          description={
            hasActiveFilters
              ? 'Nothing matches this search and these filters.'
              : 'Upload a purchase order, packing list, sales report or settlement and it appears here as a draft.'
          }
          action={
            hasActiveFilters
              ? { label: 'Clear filters', onClick: clearAllFilters }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3" data-tour="docs-list">
          {sortedDocuments.map((doc) => (
            <Link
              key={doc.id}
              href={`/dashboard/parsed-documents/${doc.id}`}
              className="group block g-card p-4 transition-colors hover:border-[var(--color-text-muted)]"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                      {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                    </span>
                    <Badge variant={doc.status} size="sm">{doc.status}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1 break-all">
                    {doc.source_filename || 'Untitled document'}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
                    {doc.tours && <span>Tour: {doc.tours.name}</span>}
                    {doc.shows && (
                      <span>
                        Show: {doc.shows.venue_name}
                        {doc.shows.city ? ` (${[doc.shows.city, doc.shows.state].filter(Boolean).join(', ')})` : ''}
                      </span>
                    )}
                    {!doc.tours && !doc.shows && (
                      <span className="font-medium text-warn">Not assigned to a tour or show</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-xs text-[var(--color-text-secondary)] tabular-nums">
                    {formatDate(doc.created_at)}
                  </div>
                  <span className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'group-hover:bg-[var(--color-bg-elevated)]')}>
                    {doc.status === 'draft' || doc.status === 'error' ? 'Review' : 'Open'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalCount > limit && (
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--color-bg-border)]">
          <Button variant="outline" onClick={handlePrevPage} disabled={offset === 0}>
            <ArrowLeft className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" />Previous
          </Button>
          <span className="text-sm text-[var(--color-text-secondary)]">
            Page {currentPage} of {totalPages}
          </span>
          <Button variant="outline" onClick={handleNextPage} disabled={offset + limit >= totalCount}>
            Next <ArrowRight className="inline-block h-4 w-4 align-[-0.125em] ml-1" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
