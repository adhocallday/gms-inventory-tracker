'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { generateBreadcrumbs } from '@/lib/utils/breadcrumbs';
import { Badge } from '@/components/ui/Badge';

interface AnalyticsData {
  summary: {
    totalGross: number;
    totalUnits: number;
    totalShows: number;
    totalTours: number;
    activeTours: number;
    totalAttendance: number;
    avgPerHead: number;
  };
  tourRankings: {
    byGross: TourMetric[];
    byPerHead: TourMetric[];
  };
  recentShows: RecentShow[];
  tours: TourMetric[];
}

interface TourMetric {
  id: string;
  name: string;
  artist: string;
  status: string;
  showCount: number;
  totalGross: number;
  totalUnits: number;
  totalAttendance: number;
  avgPerHead: number;
}

interface RecentShow {
  id: string;
  tourName: string;
  venueName: string;
  city: string;
  state: string;
  showDate: string;
  attendance: number;
  totalGross: number;
  perHead: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gross' | 'perHead'>('gross');

  const breadcrumbs = generateBreadcrumbs([
    { label: 'Admin', href: '/admin' },
    { label: 'Analytics' },
  ]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/analytics');
      const result = await res.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="g-container py-12">
        <div className="g-card p-12 text-center">
          <div className="animate-pulse text-[var(--color-text-secondary)]">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="g-container py-12">
        <div className="g-card p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-[var(--color-text-secondary)]">Failed to load analytics data.</p>
        </div>
      </div>
    );
  }

  const { summary, tourRankings, recentShows } = data;

  return (
    <div className="g-container py-12">
      <PageHeader
        title="Analytics Dashboard"
        subtitle="Cross-tour analytics and reporting. Track revenue, per-head metrics, and identify top-performing tours."
        kicker="Admin"
        breadcrumbs={breadcrumbs}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
        <div className="g-card p-4">
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">Total Gross</div>
          <div className="text-xl font-bold text-[var(--color-text-primary)]">
            {formatCurrency(summary.totalGross)}
          </div>
        </div>
        <div className="g-card p-4">
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">Avg Per Head</div>
          <div className="text-xl font-bold text-green-500">
            {formatCurrency(summary.avgPerHead)}
          </div>
        </div>
        <div className="g-card p-4">
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">Total Shows</div>
          <div className="text-xl font-bold text-[var(--color-text-primary)]">
            {formatNumber(summary.totalShows)}
          </div>
        </div>
        <div className="g-card p-4">
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">Total Tours</div>
          <div className="text-xl font-bold text-[var(--color-text-primary)]">
            {summary.totalTours}
          </div>
        </div>
        <div className="g-card p-4">
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">Active Tours</div>
          <div className="text-xl font-bold text-[var(--color-red-primary)]">
            {summary.activeTours}
          </div>
        </div>
        <div className="g-card p-4">
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">Total Units</div>
          <div className="text-xl font-bold text-[var(--color-text-primary)]">
            {formatNumber(summary.totalUnits)}
          </div>
        </div>
        <div className="g-card p-4">
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">Attendance</div>
          <div className="text-xl font-bold text-[var(--color-text-primary)]">
            {formatNumber(summary.totalAttendance)}
          </div>
        </div>
      </div>

      {/* Tour Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top by Gross */}
        <div className="g-card overflow-hidden">
          <div className="p-4 border-b border-[var(--color-bg-border)]">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Top Tours by Revenue
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Highest grossing tours across all time
            </p>
          </div>
          <div className="divide-y divide-[var(--color-bg-border)]">
            {tourRankings.byGross.length === 0 ? (
              <div className="p-6 text-center text-[var(--color-text-secondary)]">
                No tour data available
              </div>
            ) : (
              tourRankings.byGross.map((tour, index) => (
                <Link
                  key={tour.id}
                  href={`/tours/${tour.id}`}
                  className="flex items-center justify-between p-4 hover:bg-[var(--color-bg-elevated)] transition"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-amber-500/20 text-amber-500' :
                      index === 1 ? 'bg-[var(--color-bg-border)] text-[var(--color-text-secondary)]' :
                      index === 2 ? 'bg-orange-600/20 text-orange-600' :
                      'bg-[var(--color-bg-border)] text-[var(--color-text-secondary)]'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--color-text-primary)]">
                        {tour.name}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        {tour.artist} - {tour.showCount} shows
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-[var(--color-text-primary)]">
                      {formatCurrency(tour.totalGross)}
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      {formatCurrency(tour.avgPerHead)}/head
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Top by Per-Head */}
        <div className="g-card overflow-hidden">
          <div className="p-4 border-b border-[var(--color-bg-border)]">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Top Tours by Per-Head
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Highest revenue per attendee
            </p>
          </div>
          <div className="divide-y divide-[var(--color-bg-border)]">
            {tourRankings.byPerHead.length === 0 ? (
              <div className="p-6 text-center text-[var(--color-text-secondary)]">
                No tour data available
              </div>
            ) : (
              tourRankings.byPerHead.map((tour, index) => (
                <Link
                  key={tour.id}
                  href={`/tours/${tour.id}`}
                  className="flex items-center justify-between p-4 hover:bg-[var(--color-bg-elevated)] transition"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-green-500/20 text-green-500' :
                      index === 1 ? 'bg-emerald-400/20 text-emerald-400' :
                      index === 2 ? 'bg-teal-500/20 text-teal-500' :
                      'bg-[var(--color-bg-border)] text-[var(--color-text-secondary)]'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--color-text-primary)]">
                        {tour.name}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        {tour.artist} - {formatNumber(tour.totalAttendance)} attendance
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-500">
                      {formatCurrency(tour.avgPerHead)}
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      {formatCurrency(tour.totalGross)} total
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Shows */}
      <div className="g-card overflow-hidden">
        <div className="p-4 border-b border-[var(--color-bg-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Recent Shows
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Latest show performance data
          </p>
        </div>

        {recentShows.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-secondary)]">
            No show data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-bg-border)] text-left">
                  <th className="px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)]">Date</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)]">Tour</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)]">Venue</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] text-right">Attendance</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] text-right">Gross</th>
                  <th className="px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] text-right">Per Head</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-bg-border)]">
                {recentShows.map(show => (
                  <tr key={show.id} className="hover:bg-[var(--color-bg-elevated)] transition">
                    <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                      {new Date(show.showDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-[var(--color-red-primary)] font-medium">
                        {show.tourName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                      {show.venueName}
                      {show.city && <span className="text-[var(--color-text-muted)]"> - {show.city}, {show.state}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-[var(--color-text-primary)]">
                      {formatNumber(show.attendance || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-[var(--color-text-primary)]">
                      {formatCurrency(show.totalGross)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={show.perHead >= summary.avgPerHead ? 'text-green-500' : 'text-[var(--color-text-secondary)]'}>
                        {formatCurrency(show.perHead)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
