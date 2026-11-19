import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { generateBreadcrumbs } from '@/lib/utils/breadcrumbs';
import { BarChart3 } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { loadAnalytics } from '@/lib/analytics';

// Read live on every request (the Supabase client is no-store), never prerendered at build.
export const dynamic = 'force-dynamic';

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

export default async function AnalyticsPage() {
  const breadcrumbs = generateBreadcrumbs([
    { label: 'Admin', href: '/admin' },
    { label: 'Analytics' },
  ]);

  // Rendered on the server: the page arrives with its figures.
  const data = await loadAnalytics().catch((error) => {
    console.error('[Analytics page] Load failed:', error);
    return null;
  });

  if (!data) {
    return (
      <div className="g-container py-12">
        <div className="g-card p-12 text-center">
          <BarChart3 className="block mx-auto h-10 w-10 mb-4 text-[var(--color-text-secondary)]" aria-hidden="true" />
          <p className="text-[var(--color-text-secondary)]">Analytics could not be loaded. Reload the page to try again.</p>
        </div>
      </div>
    );
  }

  const { summary, tourRankings, recentShows } = data;

  return (
    <div className="g-container py-6">
      <PageHeader
        title="Analytics"
        subtitle="Totals and rankings across every tour, from posted sales reports."
        breadcrumbs={breadcrumbs}
      />

      {/* Summary Stats */}
      <div data-tour="admin-analytics" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-6 mb-8">
        {[
          ['Gross sales', formatCurrency(summary.totalGross)],
          ['Per head', formatCurrency(summary.avgPerHead)],
          ['Shows', formatNumber(summary.totalShows)],
          ['Tours', formatNumber(summary.totalTours)],
          ['Active tours', formatNumber(summary.activeTours)],
          ['Units sold', formatNumber(summary.totalUnits)],
          ['Attendance', formatNumber(summary.totalAttendance)],
        ].map(([label, value]) => (
          <div key={label} className="g-card p-4">
            <div className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-1">{label}</div>
            <div className="text-xl font-semibold tabular-nums text-[var(--color-text-primary)]">{value}</div>
          </div>
        ))}
      </div>

      {/* Tour Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top by Gross */}
        <div className="g-card overflow-hidden">
          <div className="p-4 border-b border-[var(--color-bg-border)]">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Tours by gross
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Posted sales, all time
            </p>
          </div>
          <div className="divide-y divide-[var(--color-bg-border)]">
            {tourRankings.byGross.length === 0 ? (
              <div className="p-6 text-center text-[var(--color-text-secondary)]">
                No posted sales yet
              </div>
            ) : (
              tourRankings.byGross.map((tour, index) => (
                <Link
                  key={tour.id}
                  href={`/tours/${tour.id}`}
                  className="flex items-center justify-between p-4 hover:bg-[var(--color-bg-elevated)] transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold tabular-nums bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--color-text-primary)]">
                        {tour.name}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        {tour.artist} · {tour.showCount} shows
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
              Tours by per head
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Gross over attendance
            </p>
          </div>
          <div className="divide-y divide-[var(--color-bg-border)]">
            {tourRankings.byPerHead.length === 0 ? (
              <div className="p-6 text-center text-[var(--color-text-secondary)]">
                No posted sales yet
              </div>
            ) : (
              tourRankings.byPerHead.map((tour, index) => (
                <Link
                  key={tour.id}
                  href={`/tours/${tour.id}`}
                  className="flex items-center justify-between p-4 hover:bg-[var(--color-bg-elevated)] transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold tabular-nums bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--color-text-primary)]">
                        {tour.name}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">
                        {tour.artist} · {formatNumber(tour.totalAttendance)} attendance
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums text-[var(--color-text-primary)]">
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
            Recent shows with sales
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            The 10 latest shows with a posted sales report.
            {(summary.showsWithoutSales ?? 0) > 0 &&
              ` ${summary.showsWithoutSales} shows have no sales report posted yet and are not listed.`}
          </p>
        </div>

        {recentShows.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-secondary)]">
            No show has a posted sales report yet.
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
                  <th className="px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] text-right">Per head</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-bg-border)]">
                {recentShows.map(show => (
                  <tr key={show.id} className="tabular-nums">
                    <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                      {formatDate(show.showDate)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium text-[var(--color-text-primary)]">{show.tourName}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                      {show.venueName}
                      {show.city && <span> · {[show.city, show.state].filter(Boolean).join(', ')}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-[var(--color-text-primary)]">
                      {show.attendance === null ? <span className="text-[var(--color-text-secondary)]">Not recorded</span> : formatNumber(show.attendance)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-[var(--color-text-primary)]">
                      {formatCurrency(show.totalGross)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {show.perHead === null ? (
                        <span className="text-[var(--color-text-secondary)]">—</span>
                      ) : (
                        <span className="text-[var(--color-text-primary)]">{formatCurrency(show.perHead)}</span>
                      )}
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
