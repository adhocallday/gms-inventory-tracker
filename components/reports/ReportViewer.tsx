'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CoverSection } from './sections/CoverSection';
import { ProductBreakdownSection } from './sections/ProductBreakdownSection';
import { SalesChartSection } from './sections/SalesChartSection';
import { PerHeadsChartSection } from './sections/PerHeadsChartSection';
import { ProductRatiosSection } from './sections/ProductRatiosSection';
import { ProductPercentageSection } from './sections/ProductPercentageSection';

interface ReportViewerProps {
  report: any;
  tour: any;
  productSummary: any[];
  showSummary: any[];
  productImages: any[];
  categories: any[];
}

export function ReportViewer({
  report,
  tour,
  productSummary,
  showSummary,
  productImages,
  categories
}: ReportViewerProps) {
  const [isPrintMode, setIsPrintMode] = useState(false);

  const enabledSections = report.config?.sections || [];

  const isSectionEnabled = (sectionId: string) => {
    return enabledSections.some((s: any) => s.id === sectionId && s.enabled);
  };

  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 100);
  };

  return (
    <div className={`min-h-screen ${isPrintMode ? 'print-mode' : ''}`}>
      {/* Header - Hide in print mode */}
      {!isPrintMode && (
        <header className="g-bg-surface border-b border-[var(--color-bg-border)] print:hidden">
          <div className="g-container py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href={`/tours/${tour.id}/reports`}
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                  ← Back to Reports
                </Link>
                <h1 className="text-xl font-semibold g-title">{report.title}</h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 border border-[var(--color-bg-border)] rounded hover:bg-[var(--color-bg-elevated)] transition text-sm"
                >
                  Print Report
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Report Content */}
      <div className="g-container py-8 print:p-0">
        <div className="space-y-12 print:space-y-8">
          {/* Cover Page */}
          {isSectionEnabled('cover') && (
            <CoverSection
              tour={tour}
              report={report}
              showCount={showSummary.length}
            />
          )}

          {/* Product Breakdown - Regular Products */}
          {isSectionEnabled('product-breakdown') && (
            <ProductBreakdownSection
              title="Product Breakdown"
              products={productSummary.filter(p => !p.sku?.includes('EVENT'))}
              productImages={productImages}
              categories={categories}
            />
          )}

          {/* Product Breakdown - Event Tees */}
          {isSectionEnabled('event-tees') && (
            <ProductBreakdownSection
              title="Event Tees"
              products={productSummary.filter(p => p.sku?.includes('EVENT'))}
              productImages={productImages}
              categories={categories.filter(c => c.slug === 'event-tees')}
            />
          )}

          {/* Gross Sales Chart */}
          {isSectionEnabled('gross-sales') && (
            <SalesChartSection
              title="Gross Sales Report"
              showSummary={showSummary}
            />
          )}

          {/* Per Heads Chart */}
          {isSectionEnabled('per-heads') && (
            <PerHeadsChartSection
              title="Per Heads Report"
              showSummary={showSummary}
            />
          )}

          {/* Product Ratios */}
          {isSectionEnabled('product-ratios') && (
            <ProductRatiosSection
              products={productSummary}
              showSummary={showSummary}
            />
          )}

          {/* Product Percentage Breakdown */}
          {isSectionEnabled('product-percentage') && (
            <ProductPercentageSection
              products={productSummary}
            />
          )}
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:space-y-8 > * + * {
            margin-top: 2rem !important;
          }
          .print-mode {
            background: white !important;
          }
          @page {
            size: letter;
            margin: 0.5in;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
