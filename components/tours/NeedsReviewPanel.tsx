'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { buttonVariants } from '@/components/ui/Button';

const DOC_LABELS: Record<string, string> = {
  po: 'Purchase order',
  'packing-list': 'Packing list',
  packing_list: 'Packing list',
  'sales-report': 'Sales report',
  sales_report: 'Sales report',
  settlement: 'Settlement',
};
import { useMemo, useState } from 'react';

type ParsedDocumentRow = {
  id: string;
  doc_type: string;
  status: string;
  source_filename: string | null;
  updated_at: string | null;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

function formatDate(value?: string | null) {
  if (!value) return '—';
  return dateFormatter.format(new Date(value));
}

export function NeedsReviewPanel({ documents }: { documents: ParsedDocumentRow[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localDocs, setLocalDocs] = useState(documents);

  const visibleDocs = useMemo(
    () => localDocs.filter((doc) => ['draft', 'error', 'approved'].includes(doc.status)),
    [localDocs]
  );

  async function handlePost(id: string) {
    setBusyId(id);
    try {
      const response = await fetch(`/api/parsed-documents/${id}/post`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Post failed');
      }
      setLocalDocs((prev) =>
        prev.map((doc) => (doc.id === id ? { ...doc, status: 'posted' } : doc))
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      const response = await fetch(`/api/parsed-documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      });
      if (!response.ok) {
        throw new Error('Reject failed');
      }
      setLocalDocs((prev) =>
        prev.map((doc) => (doc.id === id ? { ...doc, status: 'rejected' } : doc))
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="g-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Needs review</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Drafts and documents with parsing errors.
          </p>
        </div>
        <Link href="/upload" className="text-sm font-medium g-link">
          Add document
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {visibleDocs.length === 0 ? (
          <div className="text-sm text-[var(--color-text-secondary)]">
            No documents waiting for review.
          </div>
        ) : (
          visibleDocs.map((doc) => (
            <div
              key={doc.id}
              className="border border-[var(--color-bg-border)] rounded-lg p-4 flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{DOC_LABELS[doc.doc_type] ?? doc.doc_type}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] break-all">
                    {doc.source_filename ?? 'Unnamed file'} · {formatDate(doc.updated_at)}
                  </p>
                </div>
                <Badge variant={(doc.status as never) ?? 'default'} size="sm">{doc.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/dashboard/parsed-documents/${doc.id}`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                  Review
                </Link>
                <button
                  type="button"
                  className={buttonVariants({ size: 'sm' })}
                  onClick={() => handlePost(doc.id)}
                  disabled={busyId === doc.id}
                >
                  Approve and post
                </button>
                <button
                  type="button"
                  className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                  onClick={() => handleReject(doc.id)}
                  disabled={busyId === doc.id}
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
