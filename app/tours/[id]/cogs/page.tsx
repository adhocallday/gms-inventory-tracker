'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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
  products: Array<{
    sku: string;
    description: string;
    size: string;
    total_sold: number;
    total_gross: number;
    full_package_cost: number;
    total_cogs: number;
    gross_margin: number;
  }>;
  shows: Array<{
    show_id: string;
    show_date: string;
    venue_name: string;
    city: string;
    state: string;
    total_gross: number;
    attendance: number;
    per_head: number;
    cogs: number;
    margin: number;
    margin_percentage: number;
  }>;
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
        <div className="text-center text-[var(--g-text-dim)]">
          Loading COGS data...
        </div>
      </div>
    );
  }

  if (!tour || !cogsData) {
    return (
      <div className="g-container py-12">
        <div className="text-center text-[var(--g-text-muted)]">
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
          <p className="text-sm text-[var(--g-text-dim)]">{tour.artist}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <div className="g-card p-4">
          <p className="text-xs text-[var(--g-text-muted)] mb-1">Total Revenue</p>
          <p className="text-2xl font-semibold text-[var(--g-text)]">
            {formatCurrency(cogsData.totals.total_revenue)}
          </p>
        </div>

        <div className="g-card p-4">
          <p className="text-xs text-[var(--g-text-muted)] mb-1">Total COGS</p>
          <p className="text-2xl font-semibold text-red-300">
            {formatCurrency(cogsData.totals.total_cogs)}
          </p>
        </div>

        <div className="g-card p-4">
          <p className="text-xs text-[var(--g-text-muted)] mb-1">Gross Margin</p>
          <p className="text-2xl font-semibold text-green-300">
            {formatCurrency(cogsData.totals.total_margin)}
          </p>
        </div>

        <div className="g-card p-4">
          <p className="text-xs text-[var(--g-text-muted)] mb-1">Margin %</p>
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
                    <p className="text-xs text-[var(--g-text-muted)]">
                      {product.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-300">
                      {formatPercent(marginPct)}
                    </p>
                    <p className="text-xs text-[var(--g-text-muted)]">
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
                    <p className="text-xs text-[var(--g-text-muted)]">
                      {product.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-yellow-300">
                      {formatPercent(marginPct)}
                    </p>
                    <p className="text-xs text-[var(--g-text-muted)]">
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
        <button
          className={`g-button ${
            view === 'products' ? '' : 'g-button-outline'
          } text-sm`}
          onClick={() => setView('products')}
        >
          By Product
        </button>
        <button
          className={`g-button ${
            view === 'shows' ? '' : 'g-button-outline'
          } text-sm`}
          onClick={() => setView('shows')}
        >
          By Show
        </button>
      </div>

      {/* Product COGS Table */}
      {view === 'products' && (
        <div className="g-card p-6">
          <h3 className="text-lg font-semibold g-title mb-4">
            Product COGS Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm g-table">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-4">SKU</th>
                  <th className="text-left py-2 pr-4">Description</th>
                  <th className="text-left py-2 pr-4">Size</th>
                  <th className="text-right py-2 pr-4">Units Sold</th>
                  <th className="text-right py-2 pr-4">Revenue</th>
                  <th className="text-right py-2 pr-4">Unit Cost</th>
                  <th className="text-right py-2 pr-4">Total COGS</th>
                  <th className="text-right py-2 pr-4">Margin</th>
                  <th className="text-right py-2 pr-4">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {cogsData.products.map((product, index) => {
                  const marginPct =
                    product.total_gross > 0
                      ? (product.gross_margin / product.total_gross) * 100
                      : 0;
                  return (
                    <tr key={`${product.sku}-${product.size}-${index}`} className="border-b border-white/10">
                      <td className="py-2 pr-4 font-semibold">{product.sku}</td>
                      <td className="py-2 pr-4">{product.description}</td>
                      <td className="py-2 pr-4">{product.size}</td>
                      <td className="py-2 pr-4 text-right">
                        {product.total_sold || 0}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {formatCurrency(product.total_gross || 0)}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {formatCurrency(product.full_package_cost || 0)}
                      </td>
                      <td className="py-2 pr-4 text-right text-red-300">
                        {formatCurrency(product.total_cogs || 0)}
                      </td>
                      <td className="py-2 pr-4 text-right text-green-300">
                        {formatCurrency(product.gross_margin || 0)}
                      </td>
                      <td
                        className={`py-2 pr-4 text-right font-semibold ${
                          marginPct >= 50
                            ? 'text-green-300'
                            : marginPct >= 30
                            ? 'text-yellow-300'
                            : 'text-red-300'
                        }`}
                      >
                        {formatPercent(marginPct)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 font-semibold">
                  <td className="py-3 pr-4" colSpan={3}>
                    Totals
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {cogsData.totals.total_units_sold}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatCurrency(cogsData.totals.total_revenue)}
                  </td>
                  <td className="py-3 pr-4" />
                  <td className="py-3 pr-4 text-right text-red-300">
                    {formatCurrency(cogsData.totals.total_cogs)}
                  </td>
                  <td className="py-3 pr-4 text-right text-green-300">
                    {formatCurrency(cogsData.totals.total_margin)}
                  </td>
                  <td className="py-3 pr-4 text-right text-green-300">
                    {formatPercent(cogsData.totals.margin_percentage)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Show COGS Table */}
      {view === 'shows' && (
        <div className="g-card p-6">
          <h3 className="text-lg font-semibold g-title mb-4">
            Show COGS Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm g-table">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-4">Date</th>
                  <th className="text-left py-2 pr-4">Venue</th>
                  <th className="text-left py-2 pr-4">City</th>
                  <th className="text-right py-2 pr-4">Attendance</th>
                  <th className="text-right py-2 pr-4">Revenue</th>
                  <th className="text-right py-2 pr-4">COGS</th>
                  <th className="text-right py-2 pr-4">Margin</th>
                  <th className="text-right py-2 pr-4">Margin %</th>
                  <th className="text-right py-2 pr-4">Per Head</th>
                </tr>
              </thead>
              <tbody>
                {cogsData.shows.map((show) => (
                  <tr key={show.show_id} className="border-b border-white/10">
                    <td className="py-2 pr-4">
                      {new Date(show.show_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-2 pr-4">{show.venue_name}</td>
                    <td className="py-2 pr-4">
                      {show.city}, {show.state}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {show.attendance || 0}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {formatCurrency(show.total_gross || 0)}
                    </td>
                    <td className="py-2 pr-4 text-right text-red-300">
                      {formatCurrency(show.cogs)}
                    </td>
                    <td className="py-2 pr-4 text-right text-green-300">
                      {formatCurrency(show.margin)}
                    </td>
                    <td
                      className={`py-2 pr-4 text-right font-semibold ${
                        show.margin_percentage >= 50
                          ? 'text-green-300'
                          : show.margin_percentage >= 30
                          ? 'text-yellow-300'
                          : 'text-red-300'
                      }`}
                    >
                      {formatPercent(show.margin_percentage)}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {formatCurrency(show.per_head || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
