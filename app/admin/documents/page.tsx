'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { generateBreadcrumbs } from '@/lib/utils/breadcrumbs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface ParsedDocument {
  id: string;
  doc_type: 'po' | 'packing-list' | 'sales-report' | 'settlement';
  status: 'draft' | 'approved' | 'rejected' | 'posted' | 'error';
  source_filename: string | null;
  tour_id: string | null;
  show_id: string | null;
  extracted_json: any;
  normalized_json: any;
  created_at: string;
  updated_at: string;
  tours?: { name: string } | null;
  shows?: { venue_name: string; show_date: string } | null;
}

interface Tour {
  id: string;
  name: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  'po': 'Purchase Order',
  'packing-list': 'Packing List',
  'sales-report': 'Sales Report',
  'settlement': 'Settlement'
};

const STATUS_VARIANTS: Record<string, 'active' | 'draft' | 'completed' | 'error'> = {
  'draft': 'draft',
  'approved': 'active',
  'rejected': 'error',
  'posted': 'completed',
  'error': 'error'
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<ParsedDocument[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTour, setSelectedTour] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const breadcrumbs = generateBreadcrumbs([
    { label: 'Admin', href: '/admin' },
    { label: 'Documents' },
  ]);

  useEffect(() => {
    fetchDocuments();
    fetchTours();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/admin/documents');
      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTours = async () => {
    try {
      const res = await fetch('/api/tours');
      const data = await res.json();
      if (data.data) {
        setTours(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch tours:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments(docs => docs.filter(d => d.id !== id));
      } else {
        alert('Failed to delete document');
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document');
    } finally {
      setDeleting(null);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (selectedTour !== 'all' && doc.tour_id !== selectedTour) return false;
    if (selectedType !== 'all' && doc.doc_type !== selectedType) return false;
    if (selectedStatus !== 'all' && doc.status !== selectedStatus) return false;
    return true;
  });

  const stats = {
    total: documents.length,
    draft: documents.filter(d => d.status === 'draft').length,
    approved: documents.filter(d => d.status === 'approved').length,
    posted: documents.filter(d => d.status === 'posted').length,
    error: documents.filter(d => d.status === 'error').length
  };

  return (
    <div className="g-container py-12">
      <PageHeader
        title="Document Management"
        subtitle="View and manage all parsed documents including purchase orders, packing lists, sales reports, and settlements."
        kicker="Admin"
        breadcrumbs={breadcrumbs}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="g-card p-4 text-center">
          <div className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.total}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Total</div>
        </div>
        <div className="g-card p-4 text-center">
          <div className="text-2xl font-bold text-amber-500">{stats.draft}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Draft</div>
        </div>
        <div className="g-card p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">{stats.approved}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Approved</div>
        </div>
        <div className="g-card p-4 text-center">
          <div className="text-2xl font-bold text-green-500">{stats.posted}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Posted</div>
        </div>
        <div className="g-card p-4 text-center">
          <div className="text-2xl font-bold text-[var(--color-red-primary)]">{stats.error}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">Errors</div>
        </div>
      </div>

      {/* Filters */}
      <div className="g-card p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Tour
            </label>
            <select
              value={selectedTour}
              onChange={(e) => setSelectedTour(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-bg-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-red-primary)]"
            >
              <option value="all">All Tours</option>
              {tours.map(tour => (
                <option key={tour.id} value={tour.id}>{tour.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Document Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-bg-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-red-primary)]"
            >
              <option value="all">All Types</option>
              <option value="po">Purchase Orders</option>
              <option value="packing-list">Packing Lists</option>
              <option value="sales-report">Sales Reports</option>
              <option value="settlement">Settlements</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-bg-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-red-primary)]"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="posted">Posted</option>
              <option value="rejected">Rejected</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </div>

      {/* Document List */}
      {loading ? (
        <div className="g-card p-12 text-center">
          <div className="animate-pulse text-[var(--color-text-secondary)]">Loading documents...</div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="g-card p-12 text-center">
          <div className="text-4xl mb-4">📄</div>
          <p className="text-[var(--color-text-secondary)] mb-4">
            {documents.length === 0 ? 'No documents have been uploaded yet.' : 'No documents match your filters.'}
          </p>
          <Link href="/upload">
            <Button>Upload Documents</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map(doc => (
            <div key={doc.id} className="g-card overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-[var(--color-bg-elevated)] transition"
                onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">
                      {doc.doc_type === 'po' && '📦'}
                      {doc.doc_type === 'packing-list' && '📋'}
                      {doc.doc_type === 'sales-report' && '💰'}
                      {doc.doc_type === 'settlement' && '🧾'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {DOC_TYPE_LABELS[doc.doc_type]}
                        </span>
                        <Badge variant={STATUS_VARIANTS[doc.status] || 'draft'}>
                          {doc.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                        {doc.source_filename && (
                          <span title={doc.source_filename}>
                            {doc.source_filename.length > 30
                              ? doc.source_filename.substring(0, 30) + '...'
                              : doc.source_filename}
                          </span>
                        )}
                        {doc.tours?.name && (
                          <span className="text-[var(--color-red-primary)]">{doc.tours.name}</span>
                        )}
                        {doc.shows?.venue_name && (
                          <span>{doc.shows.venue_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-[var(--color-text-secondary)]">
                      {expandedDoc === doc.id ? '▼' : '▶'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded View */}
              {expandedDoc === doc.id && (
                <div className="border-t border-[var(--color-bg-border)] p-4 bg-[var(--color-bg-base)]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">
                        Extracted Data
                      </h4>
                      <pre className="text-xs bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] p-3 rounded-lg border border-[var(--color-bg-border)] overflow-auto max-h-64 font-mono">
                        {JSON.stringify(doc.extracted_json, null, 2) || 'No data'}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">
                        Normalized Data
                      </h4>
                      <pre className="text-xs bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] p-3 rounded-lg border border-[var(--color-bg-border)] overflow-auto max-h-64 font-mono">
                        {JSON.stringify(doc.normalized_json, null, 2) || 'Not processed'}
                      </pre>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deleting === doc.id}
                    >
                      {deleting === doc.id ? 'Deleting...' : 'Delete'}
                    </Button>
                    {doc.tour_id && (
                      <Link href={`/tours/${doc.tour_id}`}>
                        <Button variant="secondary" size="sm">
                          View Tour
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
