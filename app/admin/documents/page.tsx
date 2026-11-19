'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDate } from '@/lib/format';
import { generateBreadcrumbs } from '@/lib/utils/breadcrumbs';
import { Badge } from '@/components/ui/Badge';
import { StatCard, STAT_GRID } from '@/components/dashboard/StatCard';
import { Button, buttonVariants } from '@/components/ui/Button';
import { ChevronDown, ChevronRight, ClipboardList, DollarSign, FileText, Package, Receipt } from 'lucide-react';

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
    if (!confirm('Delete this document? This cannot be undone.')) return;

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
    rejected: documents.filter(d => d.status === 'rejected').length,
    error: documents.filter(d => d.status === 'error').length
  };

  return (
    <div className="g-container py-6">
      <PageHeader
        title="Documents"
        subtitle="Every parsed document across tours, with the data Claude read and the normalised version."
        breadcrumbs={breadcrumbs}
      />

      {/* Stats */}
      <div data-tour="admin-documents" className={`${STAT_GRID} mt-5 mb-5`}>
        {(
          [
            ['Total', stats.total, 'default'],
            ['Draft', stats.draft, stats.draft > 0 ? 'warn' : 'default'],
            ['Approved', stats.approved, 'default'],
            ['Posted', stats.posted, 'default'],
            ['Rejected', stats.rejected, 'default'],
            ['Errors', stats.error, stats.error > 0 ? 'danger' : 'default'],
          ] as const
        ).map(([label, value, tone]) => (
          <StatCard key={label} label={label} value={value} valueTone={tone} />
        ))}
      </div>

      {/* Filters */}
      <div className="g-card p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="adm-doc-tour" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Tour
            </label>
            <select
              id="adm-doc-tour"
              value={selectedTour}
              onChange={(e) => setSelectedTour(e.target.value)}
              className="g-input w-full"
            >
              <option value="all">All tours</option>
              {tours.map(tour => (
                <option key={tour.id} value={tour.id}>{tour.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="adm-doc-type" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Document type
            </label>
            <select
              id="adm-doc-type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="g-input w-full"
            >
              <option value="all">All types</option>
              <option value="po">Purchase orders</option>
              <option value="packing-list">Packing lists</option>
              <option value="sales-report">Sales reports</option>
              <option value="settlement">Settlements</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="adm-doc-status" className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">
              Status
            </label>
            <select
              id="adm-doc-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="g-input w-full"
            >
              <option value="all">All statuses</option>
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
          <div className="animate-pulse text-[var(--color-text-secondary)]">Loading documents…</div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="g-card p-12 text-center">
          <FileText className="block mx-auto h-10 w-10 mb-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
          <p className="text-[var(--color-text-secondary)] mb-4">
            {documents.length === 0 ? 'No documents have been uploaded yet.' : 'No documents match your filters.'}
          </p>
          <Link href="/upload" className={buttonVariants()}>Upload a document</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map(doc => (
            <div key={doc.id} className="g-card overflow-hidden">
              <button
                type="button"
                aria-expanded={expandedDoc === doc.id}
                className="block w-full text-left p-4 hover:bg-[var(--color-bg-elevated)] transition-colors"
                onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-[var(--color-text-secondary)]">
                      {doc.doc_type === 'po' && <Package className="h-5 w-5" aria-hidden="true" />}
                      {doc.doc_type === 'packing-list' && <ClipboardList className="h-5 w-5" aria-hidden="true" />}
                      {doc.doc_type === 'sales-report' && <DollarSign className="h-5 w-5" aria-hidden="true" />}
                      {doc.doc_type === 'settlement' && <Receipt className="h-5 w-5" aria-hidden="true" />}
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
                          <span className="text-[var(--color-text-primary)]">{doc.tours.name}</span>
                        )}
                        {doc.shows?.venue_name && (
                          <span>{doc.shows.venue_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      {formatDate(doc.created_at)}
                    </div>
                    <div className="text-[var(--color-text-secondary)]">
                      {expandedDoc === doc.id ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
                    </div>
                  </div>
                </div>
              </button>

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
                      <Link href={`/tours/${doc.tour_id}`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
View tour
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
