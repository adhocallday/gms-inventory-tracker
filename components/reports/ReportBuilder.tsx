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
        <p className="text-sm text-[var(--g-text-muted)]">
          Create a professional PDF report with sales data, charts, and product images
        </p>
      </div>

      {/* Report Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-[var(--g-text)] mb-2">
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
        <label className="block text-sm font-medium text-[var(--g-text)] mb-2">
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
        <label className="block text-sm font-medium text-[var(--g-text)] mb-3">
          Report Sections
        </label>
        <div className="space-y-2">
          {sections.map((section) => (
            <label
              key={section.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-[var(--g-border)] hover:bg-[var(--g-bg-subtle)] cursor-pointer transition"
            >
              <input
                type="checkbox"
                checked={section.enabled}
                onChange={() => toggleSection(section.id)}
                className="w-4 h-4 text-[var(--g-accent)] border-gray-300 rounded focus:ring-[var(--g-accent)]"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-[var(--g-text)]">
                  {section.title}
                </div>
                <div className="text-xs text-[var(--g-text-muted)]">
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
        className="w-full px-6 py-3 bg-[var(--g-accent)] text-white rounded-lg hover:bg-[var(--g-accent-2)] transition disabled:opacity-50 font-semibold"
      >
        {loading ? 'Generating Report...' : 'Generate PDF Report'}
      </button>

      {/* Status Messages */}
      {success && (
        <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-500">
          ✓ Report generated successfully! Refreshing...
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">
          ✗ Error: {error}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-400">
        <p className="font-semibold mb-1">📊 What's Included:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
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
