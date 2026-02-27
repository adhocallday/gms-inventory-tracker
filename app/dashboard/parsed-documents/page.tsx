'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { generateBreadcrumbs } from '@/lib/utils/breadcrumbs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileText, Search, X, SortAsc } from 'lucide-react';
import { useFuzzySearch } from '@/hooks/useFuzzySearch';
import { cn } from '@/lib/utils';

interface Tour {
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

interface ParsedDocument {
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
  { value: 'all', label: 'All Types' },
  { value: 'po', label: 'PO' },
  { value: 'packing-list', label: 'Packing List' },
  { value: 'sales-report', label: 'Sales Report' },
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
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'updated', label: 'Recently Updated' },
  { value: 'type', label: 'By Type' },
  { value: 'status', label: 'By Status' },
];

const DOC_TYPE_LABELS: Record<string, string> = {
  po: 'Purchase Order',
  'packing-list': 'Packing List',
  'sales-report': 'Sales Report',
  settlement: 'Settlement',
};

export default function ParsedDocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<ParsedDocument[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tourFilter, setTourFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [offset, setOffset] = useState(0);
  const limit = 50; // Fetch more for client-side filtering

  // Fetch tours for filter dropdown
  useEffect(() => {
    async function fetchTours() {
      try {
        const res = await fetch('/api/tours');
        if (res.ok) {
          const data = await res.json();
          setTours(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch tours:', err);
      }
    }
    fetchTours();
  }, []);

  // Fetch documents with server-side filters
  useEffect(() => {
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

  const breadcrumbs = generateBreadcrumbs([
    { label: 'Dashboard', href: '/' },
    { label: 'Parsed Documents' },
  ]);

  return (
    <div className="g-container py-12">
      <PageHeader
        title="Parsed Documents"
        subtitle="Review and manage AI-parsed documents before posting"
        kicker="Document Review"
        breadcrumbs={breadcrumbs}
      />

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            className="w-full pl-10 pr-10 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-bg-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-red-primary)] focus:border-transparent"
            placeholder="Search by filename, tour name, venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        {/* Document Type Tabs */}
        <div className="flex flex-wrap gap-2">
          {DOC_TYPE_OPTIONS.map((option) => {
            const isActive = docTypeFilter === option.value;
            const count = typeCounts[option.value];
            return (
              <button
                key={option.value}
                onClick={() => {
                  setDocTypeFilter(option.value);
                  setOffset(0);
                }}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-all border',
                  isActive
                    ? 'bg-[var(--color-red-primary)] text-white border-[var(--color-red-primary)]'
                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-bg-border)] hover:bg-[var(--color-bg-border)] hover:text-[var(--color-text-primary)]'
                )}
              >
                {option.label}
                {count !== undefined && option.value !== 'all' && docTypeFilter === 'all' && (
                  <span
                    className={cn(
                      'ml-2 px-1.5 py-0.5 text-xs rounded',
                      isActive ? 'bg-white/20' : 'bg-[var(--color-bg-border)]'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <SortAsc className="w-4 h-4 text-[var(--color-text-muted)]" />
            <select
              className="bg-[var(--color-bg-elevated)] border border-[var(--color-bg-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-red-primary)]"
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
              onClick={clearAllFilters}
              className="text-sm text-[var(--color-red-primary)] hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Status Tabs Row */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_OPTIONS.map((option) => {
          const isActive = statusFilter === option.value;
          const count = statusCounts[option.value];
          return (
            <button
              key={option.value}
              onClick={() => {
                setStatusFilter(option.value);
                setOffset(0);
              }}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-all border',
                isActive
                  ? 'bg-[var(--color-bg-border)] text-[var(--color-text-primary)] border-[var(--color-bg-border)]'
                  : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border-[var(--color-bg-border)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-secondary)]'
              )}
            >
              {option.label}
              {count !== undefined && option.value !== 'all' && statusFilter === 'all' && (
                <span
                  className={cn(
                    'ml-2 px-1.5 py-0.5 text-xs rounded',
                    isActive ? 'bg-[var(--color-bg-elevated)]' : 'bg-[var(--color-bg-border)]'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tour Filter (keep as dropdown since there could be many) */}
      {tours.length > 0 && (
        <div className="mb-6">
          <select
            className="bg-[var(--color-bg-elevated)] border border-[var(--color-bg-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-red-primary)]"
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
          'Loading...'
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
          title="No documents found"
          description={
            hasActiveFilters
              ? 'Try adjusting your filters or search term'
              : 'Upload a PDF to get started'
          }
          action={
            hasActiveFilters
              ? { label: 'Clear All Filters', onClick: clearAllFilters }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {sortedDocuments.map((doc) => (
            <div
              key={doc.id}
              className="g-card p-4 hover:border-[var(--color-red-primary)] transition cursor-pointer"
              onClick={() => router.push(`/dashboard/parsed-documents/${doc.id}`)}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                {/* Left Section: Type, Filename, Tour/Show */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="g-kicker text-xs">
                      {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                    </span>
                    <Badge variant={doc.status}>{doc.status}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">
                    {doc.source_filename || 'Untitled Document'}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
                    {doc.tours && <span>Tour: {doc.tours.name}</span>}
                    {doc.shows && (
                      <span>
                        Show: {doc.shows.venue_name} ({doc.shows.city}, {doc.shows.state})
                      </span>
                    )}
                    {!doc.tours && !doc.shows && (
                      <span className="text-[var(--color-status-warning)]">Not assigned to tour/show</span>
                    )}
                  </div>
                </div>

                {/* Right Section: Date, Actions */}
                <div className="flex items-center gap-4">
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {formatDate(doc.created_at)}
                  </div>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/parsed-documents/${doc.id}`);
                    }}
                  >
                    Review
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalCount > limit && (
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--color-bg-border)]">
          <Button variant="outline" onClick={handlePrevPage} disabled={offset === 0}>
            ← Previous
          </Button>
          <span className="text-sm text-[var(--color-text-secondary)]">
            Page {currentPage} of {totalPages}
          </span>
          <Button variant="outline" onClick={handleNextPage} disabled={offset + limit >= totalCount}>
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}
