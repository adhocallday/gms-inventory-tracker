'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';

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
  const router = useRouter();

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
    <div className="mb-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-4">
        <Link href="/" className="hover:text-[var(--color-red-primary)] transition">
          Dashboard
        </Link>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        <Link
          href="/dashboard/parsed-documents"
          className="hover:text-[var(--color-red-primary)] transition"
        >
          Parsed Documents
        </Link>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        <span className="text-[var(--color-text-primary)]">
          {DOC_TYPE_LABELS[docType] || docType}
        </span>
      </nav>

      {/* Header Content */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="g-kicker text-sm">
              {DOC_TYPE_LABELS[docType] || docType}
            </span>
            <span
              className={`g-kicker text-sm border ${
                STATUS_COLORS[status] || ''
              }`}
            >
              {status.toUpperCase()}
            </span>
          </div>
          <h1 className="text-3xl font-semibold g-title">
            {filename || 'Untitled Document'}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">
            Uploaded on {formatDate(createdAt)}
          </p>
        </div>

        <div>
          <button
            className="g-button g-button-outline"
            onClick={() => router.back()}
          >
            <ArrowLeft className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" />Back
          </button>
        </div>
      </div>
    </div>
  );
}
