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
import { FileText } from 'lucide-react';

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
  const [count, setCount] = useState(0);

  // Filter state
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tourFilter, setTourFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

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

  // Fetch documents
  useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: offset.toString(),
        });

        if (docTypeFilter !== 'all') params.set('doc_type', docTypeFilter);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (tourFilter !== 'all') params.set('tour_id', tourFilter);
        if (search.trim()) params.set('search', search.trim());

        const res = await fetch(`/api/parsed-documents?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.data || []);
          setCount(data.count || 0);
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
  }, [docTypeFilter, statusFilter, tourFilter, search, offset]);

  const totalPages = Math.ceil(count / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const handleNextPage = () => {
    if (offset + limit < count) {
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
        subtitle={`Review and manage AI-parsed documents before posting • ${count} ${count === 1 ? 'document' : 'documents'}`}
        kicker="Document Review"
        breadcrumbs={breadcrumbs}
      />

      {/* Filters */}
      <div className="g-card p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="g-label block mb-1">Search</label>
            <input
              type="text"
              className="g-input"
              placeholder="Filename or hash..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
            />
          </div>

          {/* Document Type Filter */}
          <div>
            <label className="g-label block mb-1">Document Type</label>
            <select
              className="g-input"
              value={docTypeFilter}
              onChange={(e) => {
                setDocTypeFilter(e.target.value);
                setOffset(0);
              }}
            >
              <option value="all">All types</option>
              <option value="po">Purchase Orders</option>
              <option value="packing-list">Packing Lists</option>
              <option value="sales-report">Sales Reports</option>
              <option value="settlement">Settlements</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="g-label block mb-1">Status</label>
            <select
              className="g-input"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setOffset(0);
              }}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="posted">Posted</option>
              <option value="rejected">Rejected</option>
              <option value="error">Error</option>
            </select>
          </div>

          {/* Tour Filter */}
          <div>
            <label className="g-label block mb-1">Tour</label>
            <select
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
        </div>
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
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12 text-[var(--g-text-muted)]" />}
          title="No documents found"
          description="Upload a PDF to get started"
        />
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="g-card p-4 hover:border-[var(--g-accent)] transition cursor-pointer"
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
                  <p className="text-sm font-semibold mb-1">
                    {doc.source_filename || 'Untitled Document'}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--g-text-muted)]">
                    {doc.tours && (
                      <span>
                        Tour: {doc.tours.name}
                      </span>
                    )}
                    {doc.shows && (
                      <span>
                        Show: {doc.shows.venue_name} ({doc.shows.city}, {doc.shows.state})
                      </span>
                    )}
                    {!doc.tours && !doc.shows && (
                      <span className="text-yellow-400">Not assigned to tour/show</span>
                    )}
                  </div>
                </div>

                {/* Right Section: Date, Actions */}
                <div className="flex items-center gap-4">
                  <div className="text-xs text-[var(--g-text-muted)]">
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
      {count > limit && (
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
          <Button
            variant="outline"
            onClick={handlePrevPage}
            disabled={offset === 0}
          >
            ← Previous
          </Button>
          <span className="text-sm text-[var(--g-text-dim)]">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={offset + limit >= count}
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}
