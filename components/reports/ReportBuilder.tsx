'use client';

import { useState } from 'react';

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
    title: 'Cover Page',
    enabled: true,
    config: { includeTourArt: true }
  },
  {
    id: 'product-breakdown',
    type: 'product_breakdown',
    title: 'Product Breakdown',
    enabled: true,
    config: { groupByCategory: true, showImages: true }
  },
  {
    id: 'event-tees',
    type: 'product_breakdown',
    title: 'Event Tees',
    enabled: true,
    config: { category: 'event-tees', showImages: true }
  },
  {
    id: 'gross-sales',
    type: 'sales_chart',
    title: 'Gross Sales Report',
    enabled: true,
    config: { chartType: 'bar', groupBy: 'city' }
  },
  {
    id: 'per-heads',
    type: 'sales_chart',
    title: 'Per Heads Report',
    enabled: true,
    config: { chartType: 'bar', metric: 'per_head' }
  },
  {
    id: 'product-ratios',
    type: 'analytics',
    title: 'Product Ratios',
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
        window.location.reload();
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
        <h2 className="text-2xl font-bold g-title mb-2">Generate New Report</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Create a professional PDF report with sales data, charts, and product images
        </p>
      </div>

      {/* Report Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Report Type
        </label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="w-full g-input"
        >
          <option value="post_tour_breakdown">Post-Tour Breakdown (Full Report)</option>
          <option value="sales_analysis">Sales Analysis Only</option>
          <option value="inventory_summary">Inventory Summary</option>
        </select>
      </div>

      {/* Report Title */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Report Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full g-input"
          placeholder="e.g., Ghost Skeletour 2025 - Post-Tour Sales Report"
        />
      </div>

      {/* Sections */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-3">
          Report Sections
        </label>
        <div className="space-y-2">
          {sections.map((section) => (
            <label
              key={section.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-bg-border)] hover:bg-[var(--g-bg-subtle)] cursor-pointer transition"
            >
              <input
                type="checkbox"
                checked={section.enabled}
                onChange={() => toggleSection(section.id)}
                className="w-4 h-4 text-[var(--color-red-primary)] border-gray-300 rounded focus:ring-[var(--color-red-primary)]"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-[var(--color-text-primary)]">
                  {section.title}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
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
        <div className="mt-4 p-5 bg-gradient-to-br from-blue-50/80 to-white border-2 border-blue-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm font-semibold text-blue-800">Generating your report...</span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '70%' }}></div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            This may take a few moments while we compile all your sales data, product images, and charts.
          </p>
        </div>
      )}

      {/* Status Messages */}
      {success && (
        <div className="mt-4 p-5 bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--color-bg-surface)] shadow-inner">
              <span className="text-emerald-600 text-lg">✓</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">Report Generated</p>
              <p className="text-xs text-emerald-600">Refreshing page to show new report...</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-5 bg-gradient-to-br from-red-50/80 to-white border-2 border-red-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--color-bg-surface)] shadow-inner">
              <span className="text-red-600 text-lg">✗</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800">Error</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-5 bg-gradient-to-br from-blue-50/80 to-white border-2 border-blue-200 rounded-2xl shadow-sm">
        <p className="font-semibold text-blue-800 mb-2">📊 What's Included:</p>
        <ul className="list-disc list-inside space-y-1 text-xs text-blue-700">
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
