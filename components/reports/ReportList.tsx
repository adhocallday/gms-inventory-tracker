'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getStatusBadge = (status: Report['status']) => {
    const badges = {
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      generating: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      completed: 'bg-green-500/10 text-green-500 border-green-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20'
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
    if (!confirm('Are you sure you want to delete this report?')) {
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

      // Refresh page to update list
      window.location.reload();
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
      <div className="lg:col-span-2">
        <div className="g-card p-8 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold g-title mb-2">No Reports Yet</h3>
          <p className="text-sm text-[var(--g-text-muted)]">
            Create your first report to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-2">
      <div className="g-card p-6">
        <h2 className="text-xl font-semibold g-title mb-4">Generated Reports</h2>

        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="border border-[var(--g-border)] rounded-lg p-4 hover:border-[var(--g-accent)] transition"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold g-title">{report.title}</h3>
                    {getStatusBadge(report.status)}
                  </div>
                  <p className="text-sm text-[var(--g-text-muted)]">
                    {getReportTypeLabel(report.report_type)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {report.status === 'completed' && report.pdf_url && (
                    <button
                      onClick={() => handleDownload(report)}
                      className="px-3 py-1.5 text-sm bg-[var(--g-accent)] text-white rounded hover:bg-[var(--g-accent-2)] transition"
                    >
                      Download PDF
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(report.id)}
                    disabled={deletingId === report.id}
                    className="px-3 py-1.5 text-sm border border-[var(--g-border)] rounded hover:bg-[var(--g-bg-muted)] transition disabled:opacity-50"
                  >
                    {deletingId === report.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>

              {report.description && (
                <p className="text-sm text-[var(--g-text-muted)] mb-2">
                  {report.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-xs text-[var(--g-text-muted)] mt-3 pt-3 border-t border-[var(--g-border)]">
                <span>
                  {report.section_count} {report.section_count === 1 ? 'section' : 'sections'}
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
                <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-500">
                  Report generation failed. Please try creating a new report.
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
