'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';

interface Report {
  id: string;
  tour_id: string;
  report_type: string;
  title: string;
  description?: string;
  pdf_url?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  config: any;
  created_at: string;
  updated_at: string;
  generated_at?: string;
  section_count: number;
}

interface ReportListProps {
  tourId: string;
  reports: Report[];
}

export function ReportList({ tourId, reports }: ReportListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getStatusBadge = (status: Report['status']) => {
    const badges = {
      pending: 'bg-warn-bg text-warn border-warn-border',
      generating: 'bg-info-bg text-info border-info-border',
      completed: 'bg-success-bg text-success border-success-border',
      failed: 'bg-danger-bg text-danger border-danger-border'
    };

    const labels = {
      pending: 'Pending',
      generating: 'Generating...',
      completed: 'Completed',
      failed: 'Failed'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium border rounded ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      post_tour_breakdown: 'Post-Tour Breakdown',
      sales_analysis: 'Sales Analysis',
      inventory_summary: 'Inventory Summary'
    };
    return labels[type] || type;
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Delete this saved report? This cannot be undone.')) {
      return;
    }

    setDeletingId(reportId);

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete report');
      }

      // Re-render the server-rendered list
      router.refresh();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete report. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (report: Report) => {
    if (report.pdf_url) {
      window.open(report.pdf_url, '_blank');
    }
  };

  if (reports.length === 0) {
    return (
      <div className="g-card p-8 text-center">
        <BarChart3 className="block mx-auto h-10 w-10 mb-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
        <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Reports you generate on the left are listed here.
        </p>
      </div>
    );
  }

  return (
    <div className="g-card p-5">
      <h2 className="text-lg font-semibold mb-4">Saved reports</h2>

      <div className="space-y-3">
        {reports.map((report) => (
            <div
              key={report.id}
              className="border border-[var(--color-bg-border)] rounded-lg p-4"
            >
              <div className="mb-2">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-semibold">{report.title}</h3>
                  {getStatusBadge(report.status)}
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {getReportTypeLabel(report.report_type)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/tours/${tourId}/reports/${report.id}`}
                    className="px-3 py-1.5 text-sm font-medium border border-[var(--color-bg-border)] rounded-md bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] transition-colors"
                  >
                    View report
                  </Link>
                  {report.status === 'completed' && report.pdf_url && (
                    <button
                      onClick={() => handleDownload(report)}
                      type="button"
                      className="px-3 py-1.5 text-sm font-medium border border-[var(--color-bg-border)] rounded-md hover:bg-[var(--color-bg-elevated)] transition-colors"
                    >
                      Download PDF
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(report.id)}
                    disabled={deletingId === report.id}
                    className="px-3 py-1.5 text-sm font-medium text-danger rounded-md hover:bg-danger-bg transition-colors disabled:opacity-50"
                  >
                    {deletingId === report.id ? 'Deleting…' : 'Delete'}
                  </button>
              </div>

              {report.description && (
                <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                  {report.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)] mt-3 pt-3 border-t border-[var(--color-bg-border)]">
                <span>
                  {report.section_count || 0} {report.section_count === 1 ? 'section' : 'sections'}
                </span>
                <span>•</span>
                <span>
                  Created {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                </span>
                {report.generated_at && (
                  <>
                    <span>•</span>
                    <span>
                      Generated {formatDistanceToNow(new Date(report.generated_at), { addSuffix: true })}
                    </span>
                  </>
                )}
              </div>

              {report.status === 'failed' && (
                <div className="mt-3 p-2 bg-danger-bg border border-danger-border rounded text-sm text-danger">
                  Report generation failed. Please try creating a new report.
                </div>
              )}
            </div>
          ))}
        </div>
    </div>
  );
}
