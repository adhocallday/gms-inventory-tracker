'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BarChart3, Check, X } from 'lucide-react';

interface ReportBuilderProps {
  tourId: string;
  tour: any;
}

interface ReportSection {
  id: string;
  type: string;
  title: string;
  enabled: boolean;
  config: any;
}

const DEFAULT_SECTIONS: ReportSection[] = [
  {
    id: 'cover',
    type: 'cover',
    title: 'Cover page',
    enabled: true,
    config: { includeTourArt: true }
  },
  {
    id: 'product-breakdown',
    type: 'product_breakdown',
    title: 'Product breakdown',
    enabled: true,
    config: { groupByCategory: true, showImages: true }
  },
  {
    id: 'event-tees',
    type: 'product_breakdown',
    title: 'Event tees',
    enabled: true,
    config: { category: 'event-tees', showImages: true }
  },
  {
    id: 'gross-sales',
    type: 'sales_chart',
    title: 'Gross sales report',
    enabled: true,
    config: { chartType: 'bar', groupBy: 'city' }
  },
  {
    id: 'per-heads',
    type: 'sales_chart',
    title: 'Per heads report',
    enabled: true,
    config: { chartType: 'bar', metric: 'per_head' }
  },
  {
    id: 'product-ratios',
    type: 'analytics',
    title: 'Product ratios',
    enabled: true,
    config: { showTable: true }
  },
  {
    id: 'product-percentage',
    type: 'analytics',
    title: 'Product % Breakdown',
    enabled: true,
    config: { chartType: 'pie' }
  }
];

export function ReportBuilder({ tourId, tour }: ReportBuilderProps) {
  const router = useRouter();
  const [reportType, setReportType] = useState('post_tour_breakdown');
  const [title, setTitle] = useState(`${tour.name} - Post-Tour Sales Report`);
  const [sections, setSections] = useState<ReportSection[]>(DEFAULT_SECTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const toggleSection = (sectionId: string) => {
    setSections(sections.map(s =>
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/tours/${tourId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          title,
          config: {
            sections: sections.filter(s => s.enabled)
          },
          startDate: tour.start_date,
          endDate: tour.end_date
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      const { report } = await response.json();
      setSuccess(true);

      // Refresh the page after 2 seconds to show new report
      setTimeout(() => {
        router.refresh();
      }, 2000);

    } catch (err: any) {
      console.error('Report generation error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="g-card p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Generate new report</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Builds a report from this tour's posted sales: charts and product tables, saved so you can print it later.
        </p>
      </div>

      {/* Report Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Report type
        </label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="w-full g-input"
        >
          <option value="post_tour_breakdown">Post-tour breakdown (full report)</option>
          <option value="sales_analysis">Sales analysis only</option>
          <option value="inventory_summary">Inventory summary</option>
        </select>
      </div>

      {/* Report Title */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Report title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full g-input"
          placeholder="e.g. SKELETOUR 2025 post-tour sales"
        />
      </div>

      {/* Sections */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-3">
          Report sections
        </label>
        <div className="space-y-2">
          {sections.map((section) => (
            <label
              key={section.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-bg-border)] hover:bg-[var(--color-bg-elevated)] cursor-pointer transition"
            >
              <input
                type="checkbox"
                checked={section.enabled}
                onChange={() => toggleSection(section.id)}
                className="w-4 h-4 text-[var(--color-red-primary)] border-[var(--color-bg-border-strong)] rounded focus:ring-[var(--color-red-primary)]"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-[var(--color-text-primary)]">
                  {section.title}
                </div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {section.type.replace('_', ' ')}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading || !title}
        className="w-full px-6 py-3 bg-[var(--color-red-primary)] text-white rounded-lg hover:bg-[var(--color-red-hover)] transition disabled:opacity-50 font-semibold"
      >
        {loading ? 'Generating Report...' : 'Generate Report'}
      </button>

      {/* Loading Progress */}
      {loading && (
        <div className="mt-4 p-5 bg-info-bg border border-info-border rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-info-border"></div>
            <span className="text-sm font-semibold text-info">Generating your report...</span>
          </div>
          <div className="w-full bg-info-bg rounded-full h-2 overflow-hidden">
            <div className="h-full bg-info rounded-full animate-pulse" style={{ width: '70%' }}></div>
          </div>
          <p className="text-xs text-info mt-2">
            This may take a few moments while we compile all your sales data, product images, and charts.
          </p>
        </div>
      )}

      {/* Status Messages */}
      {success && (
        <div className="mt-4 p-5 bg-success-bg border border-success-border rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-bg-surface)] shadow-inner">
              <Check className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-success">Report generated</p>
              <p className="text-xs text-success">Refreshing page to show new report...</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-5 bg-danger-bg border border-danger-border rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-bg-surface)] shadow-inner">
              <X className="h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-danger">Error</p>
              <p className="text-xs text-danger">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-5 bg-info-bg border border-info-border rounded-2xl shadow-sm">
        <p className="font-semibold text-info mb-2"><BarChart3 className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" />What's Included:</p>
        <ul className="list-disc list-inside space-y-1 text-xs text-info">
          <li>Product images (grab sheets) with sales data</li>
          <li>Sales charts by city and venue</li>
          <li>Per-head revenue analysis</li>
          <li>Product performance ratios</li>
          <li>Professional branded layout</li>
        </ul>
      </div>
    </div>
  );
}
