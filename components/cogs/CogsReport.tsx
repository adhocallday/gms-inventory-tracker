'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProductCogsTable, hasCost, marginPercent, type ProductCogsRow } from '@/components/cogs/ProductCogsTable';
import { ShowCogsTable, type ShowCogsRow } from '@/components/cogs/ShowCogsTable';
import { ArrowLeft } from 'lucide-react';
import { StatCard, STAT_GRID } from '@/components/dashboard/StatCard';

export interface Tour {
  id: string;
  name: string;
  artist: string;
}

export interface CogsData {
  totals: {
    total_revenue: number;
    total_cogs: number;
    total_margin: number;
    margin_percentage: number;
    total_units_sold: number;
  };
  products: ProductCogsRow[];
  shows: ShowCogsRow[];
}

export function CogsReport({ tour, cogsData }: { tour: Tour; cogsData: CogsData }) {
  const tourId = tour.id;
  const [view, setView] = useState<'products' | 'shows'>('products');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Rank only products with a unit cost: with no cost entered, margin reads
  // 100% and would crowd the top five.
  const ranked = cogsData.products
    .filter((p) => p.total_sold > 0)
    .map((p) => ({ product: p, pct: marginPercent(p) }))
    .filter((r): r is { product: (typeof cogsData.products)[number]; pct: number } => r.pct !== null);
  const topPerformers = [...ranked].sort((a, b) => b.pct - a.pct).slice(0, 5);
  const bottomPerformers = [...ranked].sort((a, b) => a.pct - b.pct).slice(0, 5);
  const noCostCount = cogsData.products.filter((p) => p.total_sold > 0 && !hasCost(p)).length;

  const rankList = (title: string, rows: typeof topPerformers) => (
    <div className="g-card g-panel">
      <h2 className="text-base font-semibold mb-3">{title}</h2>
      <ol className="space-y-3">
        {rows.map(({ product, pct }, index) => (
          <li key={`${product.sku}-${product.size}-${index}`} className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {product.sku} · {product.size}
              </p>
              <p className="text-[12.5px] text-[var(--color-text-secondary)] truncate">{product.description}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold tabular-nums ${pct < 30 ? 'text-danger' : pct < 50 ? 'text-warn' : ''}`}>
                {formatPercent(pct)}
              </p>
              <p className="text-[12.5px] text-[var(--color-text-secondary)] tabular-nums">{formatCurrency(product.gross_margin)}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <div className="g-container py-6">
      <Link href={`/tours/${tourId}`} className="text-sm font-medium g-link">
        <ArrowLeft className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" />
        {tour.name}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight lg:text-[28px] lg:leading-9">Cost of goods sold</h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        {tour.artist}. COGS = units sold × full package cost; margin = revenue − COGS.
      </p>

      <div data-tour="cogs-summary" className={`${STAT_GRID} mt-5`}>
        {[
          ['Revenue', formatCurrency(cogsData.totals.total_revenue)],
          ['COGS', formatCurrency(cogsData.totals.total_cogs)],
          ['Gross margin', formatCurrency(cogsData.totals.total_margin)],
          ['Margin %', formatPercent(cogsData.totals.margin_percentage)],
        ].map(([label, value]) => (
          <StatCard key={label} label={label} value={value} />
        ))}
      </div>
      {noCostCount > 0 && (
        <p data-tour="cogs-missing" className="mt-3 text-sm text-warn">
          {noCostCount} product sizes with sales have no unit cost, so their COGS counts as $0 and the totals
          overstate margin. Set costs under Product costs.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
        {rankList('Highest margin %, top 5', topPerformers)}
        {rankList('Lowest margin %, bottom 5', bottomPerformers)}
      </div>

      {/* View Toggle */}
      <div data-tour="cogs-table" className="mt-6 mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{view === 'products' ? 'By product' : 'By show'}</h2>
        <div className="flex rounded-md border border-[var(--color-bg-border)] p-0.5 bg-[var(--color-bg-elevated)]" role="group" aria-label="Group COGS by">
          {(['products', 'shows'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                view === v
                  ? 'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {v === 'products' ? 'By product' : 'By show'}
            </button>
          ))}
        </div>
      </div>

      {/* Product COGS Table */}
      {view === 'products' && (
        <div>
          <ProductCogsTable data={cogsData.products} totals={cogsData.totals} />
        </div>
      )}

      {/* Show COGS Table */}
      {view === 'shows' && (
        <div>
          <ShowCogsTable data={cogsData.shows} />
        </div>
      )}
    </div>
  );
}
