'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ProductCogsTable, type ProductCogsRow } from '@/components/cogs/ProductCogsTable';
import { ShowCogsTable, type ShowCogsRow } from '@/components/cogs/ShowCogsTable';
import { Button } from '@/components/ui/Button';

interface Tour {
  id: string;
  name: string;
  artist: string;
}

interface CogsData {
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

export default function CogsReportPage() {
  const params = useParams();
  const tourId = params.id as string;

  const [tour, setTour] = useState<Tour | null>(null);
  const [cogsData, setCogsData] = useState<CogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'products' | 'shows'>('products');

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch tour info
        const tourRes = await fetch(`/api/tours`);
        if (tourRes.ok) {
          const toursData = await tourRes.json();
          const currentTour = toursData.data?.find((t: Tour) => t.id === tourId);
          setTour(currentTour || null);
        }

        // Fetch COGS data
        const cogsRes = await fetch(`/api/tours/${tourId}/cogs`);
        if (cogsRes.ok) {
          const data = await cogsRes.json();
          setCogsData(data);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tourId]);

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

  if (loading) {
    return (
      <div className="g-container py-12">
        <div className="text-center text-[var(--color-text-secondary)]">
          Loading COGS data...
        </div>
      </div>
    );
  }

  if (!tour || !cogsData) {
    return (
      <div className="g-container py-12">
        <div className="text-center text-[var(--color-text-muted)]">
          No data available
        </div>
      </div>
    );
  }

  const topPerformers = [...cogsData.products]
    .filter((p) => p.total_sold > 0)
    .sort((a, b) => {
      const marginA = a.total_gross > 0 ? (a.gross_margin / a.total_gross) * 100 : 0;
      const marginB = b.total_gross > 0 ? (b.gross_margin / b.total_gross) * 100 : 0;
      return marginB - marginA;
    })
    .slice(0, 5);

  const bottomPerformers = [...cogsData.products]
    .filter((p) => p.total_sold > 0)
    .sort((a, b) => {
      const marginA = a.total_gross > 0 ? (a.gross_margin / a.total_gross) * 100 : 0;
      const marginB = b.total_gross > 0 ? (b.gross_margin / b.total_gross) * 100 : 0;
      return marginA - marginB;
    })
    .slice(0, 5);

  return (
    <div className="g-container py-12">
      {/* Header */}
      <Link href={`/tours/${tourId}`} className="text-sm font-medium g-link">
        ← Back to tour
      </Link>

      <div className="flex flex-col gap-4 mt-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="g-kicker">COGS Report</p>
          <h1 className="text-3xl font-semibold g-title mt-2">{tour.name}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{tour.artist}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <div className="g-card p-4">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Total Revenue</p>
          <p className="text-2xl font-semibold text-[var(--color-text-primary)]">
            {formatCurrency(cogsData.totals.total_revenue)}
          </p>
        </div>

        <div className="g-card p-4">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Total COGS</p>
          <p className="text-2xl font-semibold text-red-300">
            {formatCurrency(cogsData.totals.total_cogs)}
          </p>
        </div>

        <div className="g-card p-4">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Gross Margin</p>
          <p className="text-2xl font-semibold text-green-300">
            {formatCurrency(cogsData.totals.total_margin)}
          </p>
        </div>

        <div className="g-card p-4">
          <p className="text-xs text-[var(--color-text-muted)] mb-1">Margin %</p>
          <p className="text-2xl font-semibold text-green-300">
            {formatPercent(cogsData.totals.margin_percentage)}
          </p>
        </div>
      </div>

      {/* Top/Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Top Performers */}
        <div className="g-card p-6">
          <h3 className="text-lg font-semibold g-title mb-4">
            Top 5 Products by Margin %
          </h3>
          <div className="space-y-3">
            {topPerformers.map((product, index) => {
              const marginPct =
                product.total_gross > 0
                  ? (product.gross_margin / product.total_gross) * 100
                  : 0;
              return (
                <div
                  key={`${product.sku}-${product.size}-${index}`}
                  className="flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {product.sku} - {product.size}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {product.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-300">
                      {formatPercent(marginPct)}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatCurrency(product.gross_margin)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Performers */}
        <div className="g-card p-6">
          <h3 className="text-lg font-semibold g-title mb-4">
            Bottom 5 Products by Margin %
          </h3>
          <div className="space-y-3">
            {bottomPerformers.map((product, index) => {
              const marginPct =
                product.total_gross > 0
                  ? (product.gross_margin / product.total_gross) * 100
                  : 0;
              return (
                <div
                  key={`${product.sku}-${product.size}-${index}`}
                  className="flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {product.sku} - {product.size}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {product.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-yellow-300">
                      {formatPercent(marginPct)}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatCurrency(product.gross_margin)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-3 mt-8 mb-6">
        <Button
          variant={view === 'products' ? 'primary' : 'outline'}
          onClick={() => setView('products')}
        >
          By Product
        </Button>
        <Button
          variant={view === 'shows' ? 'primary' : 'outline'}
          onClick={() => setView('shows')}
        >
          By Show
        </Button>
      </div>

      {/* Product COGS Table */}
      {view === 'products' && (
        <div className="g-card p-6">
          <h3 className="text-lg font-semibold g-title mb-4">
            Product COGS Breakdown
          </h3>
          <ProductCogsTable data={cogsData.products} totals={cogsData.totals} />
        </div>
      )}

      {/* Show COGS Table */}
      {view === 'shows' && (
        <div className="g-card p-6">
          <h3 className="text-lg font-semibold g-title mb-4">
            Show COGS Breakdown
          </h3>
          <ShowCogsTable data={cogsData.shows} />
        </div>
      )}
    </div>
  );
}
