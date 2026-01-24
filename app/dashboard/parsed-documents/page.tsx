'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  approved: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  posted: 'bg-green-500/20 text-green-300 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
  error: 'bg-red-500/20 text-red-300 border-red-500/30',
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

  return (
    <div className="g-container py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold g-title">Parsed Documents</h1>
          <p className="text-sm text-[var(--g-text-muted)] mt-2">
            Review and manage AI-parsed documents before posting
          </p>
        </div>
        <div className="text-sm text-[var(--g-text-dim)]">
          {count} {count === 1 ? 'document' : 'documents'}
        </div>
      </div>

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
        <div className="text-center py-12 text-[var(--g-text-dim)]">
          Loading documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="g-card p-12 text-center">
          <p className="text-[var(--g-text-muted)]">No documents found</p>
          <p className="text-sm text-[var(--g-text-muted)] mt-2">
            Upload a PDF to get started
          </p>
        </div>
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
                    <span
                      className={`g-kicker text-xs border ${
                        STATUS_COLORS[doc.status] || ''
                      }`}
                    >
                      {doc.status}
                    </span>
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
                  <button
                    className="g-button text-xs px-3 py-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/parsed-documents/${doc.id}`);
                    }}
                  >
                    Review
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {count > limit && (
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
          <button
            className="g-button g-button-outline text-sm"
            onClick={handlePrevPage}
            disabled={offset === 0}
          >
            ← Previous
          </button>
          <span className="text-sm text-[var(--g-text-dim)]">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="g-button g-button-outline text-sm"
            onClick={handleNextPage}
            disabled={offset + limit >= count}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
