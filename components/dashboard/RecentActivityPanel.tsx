'use client';

import Link from 'next/link';
import { FileText, AlertCircle, CheckCircle, Clock, FileQuestion } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export interface RecentDocument {
  id: string;
  doc_type: string;
  status: string;
  source_filename: string | null;
  created_at: string;
}

interface RecentActivityPanelProps {
  documents: RecentDocument[];
}

const statusIcons: Record<string, React.ReactNode> = {
  draft: <Clock className="w-4 h-4 text-yellow-400" />,
  approved: <CheckCircle className="w-4 h-4 text-green-400" />,
  posted: <CheckCircle className="w-4 h-4 text-blue-400" />,
  error: <AlertCircle className="w-4 h-4 text-red-400" />,
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDocType(docType: string): string {
  const typeMap: Record<string, string> = {
    settlement: 'Settlement',
    po: 'Purchase Order',
    'packing-list': 'Packing List',
    invoice: 'Invoice',
  };
  return typeMap[docType] || docType;
}

export function RecentActivityPanel({ documents }: RecentActivityPanelProps) {
  return (
    <div className="g-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold g-title">Recent Activity</h2>
        <Link
          href="/dashboard/parsed-documents"
          className="text-sm font-medium g-link"
        >
          View all
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileQuestion className="w-10 h-10 text-[var(--g-text-muted)] mb-3" />
          <p className="text-sm text-[var(--g-text-muted)]">No recent documents</p>
          <p className="text-xs text-[var(--g-text-muted)] mt-1">
            Upload a document to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/dashboard/parsed-documents/${doc.id}`}
              className="flex items-start gap-3 p-3 rounded-lg border border-[var(--g-border)] hover:border-[var(--g-accent)]/50 hover:bg-[var(--g-bg-subtle)] transition group"
            >
              <div className="mt-0.5">
                {statusIcons[doc.status] || <FileText className="w-4 h-4 text-[var(--g-text-muted)]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--g-text)] truncate group-hover:text-[var(--g-accent)] transition">
                  {doc.source_filename || 'Untitled document'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={doc.status as any} size="sm">
                    {doc.status}
                  </Badge>
                  <span className="text-xs text-[var(--g-text-muted)]">
                    {formatDocType(doc.doc_type)}
                  </span>
                </div>
              </div>
              <span className="text-xs text-[var(--g-text-muted)] whitespace-nowrap">
                {formatRelativeTime(doc.created_at)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
