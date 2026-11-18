'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/format';

const DOC_TYPE_LABELS: Record<string, string> = {
  po: 'Purchase order',
  'packing-list': 'Packing list',
  'sales-report': 'Sales report',
  settlement: 'Settlement',
};

interface DocumentReviewHeaderProps {
  docType: 'po' | 'packing-list' | 'sales-report' | 'settlement';
  status: 'draft' | 'approved' | 'posted' | 'rejected' | 'error';
  filename?: string;
  createdAt: string;
}

export default function DocumentReviewHeader({
  docType,
  status,
  filename,
  createdAt,
}: DocumentReviewHeaderProps) {
  return (
    <div className="mb-6">
      <Link href="/dashboard/parsed-documents" className="text-sm font-medium g-link">
        <ArrowLeft className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" />
        Documents
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
          {DOC_TYPE_LABELS[docType] || docType}
        </span>
        <Badge variant={status} size="sm">
          {status}
        </Badge>
      </div>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight break-all lg:text-[28px] lg:leading-9">
        {filename || 'Untitled document'}
      </h1>
      <p className="text-sm text-[var(--color-text-secondary)] mt-1">
        Uploaded {formatDate(createdAt, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
      </p>
    </div>
  );
}
