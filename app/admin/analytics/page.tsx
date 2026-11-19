import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { generateBreadcrumbs } from '@/lib/utils/breadcrumbs';
import { BarChart3 } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { loadAnalytics } from '@/lib/analytics';
import { StatCard, STAT_GRID } from '@/components/dashboard/StatCard';
import { loadAiUsage } from '@/lib/ai/usage-summary';

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

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
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
  const [data, aiUsage] = await Promise.all([
    loadAnalytics().catch((error) => {
      console.error('[Analytics page] Load failed:', error);
      return null;
    }),
    loadAiUsage(),
  ]);

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
      <div data-tour="admin-analytics" className={`${STAT_GRID} xl:grid-cols-7 mt-5 mb-5`}>
        {[
          ['Gross sales', formatCurrency(summary.totalGross)],
          ['Per head', formatCurrency(summary.avgPerHead)],
          ['Shows', formatNumber(summary.totalShows)],
          ['Tours', formatNumber(summary.totalTours)],
          ['Active tours', formatNumber(summary.activeTours)],
          ['Units sold', formatNumber(summary.totalUnits)],
          ['Attendance', formatNumber(summary.totalAttendance)],
        ].map(([label, value]) => (
          <StatCard key={label} label={label} value={value} />
        ))}
      </div>

      {/* Tour Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Top by Gross */}
        <div className="g-card overflow-hidden">
          <div className="p-4 border-b border-[var(--color-bg-border)]">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Tours by gross
            </h2>
            <p className="text-[12.5px] text-[var(--color-text-secondary)]">
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
                      <div className="text-[12.5px] text-[var(--color-text-secondary)]">
                        {tour.artist} · {tour.showCount} shows
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-[var(--color-text-primary)]">
                      {formatCurrency(tour.totalGross)}
                    </div>
                    <div className="text-[12.5px] text-[var(--color-text-secondary)]">
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
            <p className="text-[12.5px] text-[var(--color-text-secondary)]">
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
                      <div className="text-[12.5px] text-[var(--color-text-secondary)]">
                        {tour.artist} · {formatNumber(tour.totalAttendance)} attendance
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums text-[var(--color-text-primary)]">
                      {formatCurrency(tour.avgPerHead)}
                    </div>
                    <div className="text-[12.5px] text-[var(--color-text-secondary)]">
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
          <p className="text-[12.5px] text-[var(--color-text-secondary)]">
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
                <tr className="border-b border-[var(--color-bg-border)] bg-[var(--color-table-head)] text-left">
                  <th className="px-3 py-2 text-[12.5px] font-semibold text-[var(--color-text-secondary)]">Date</th>
                  <th className="px-3 py-2 text-[12.5px] font-semibold text-[var(--color-text-secondary)]">Tour</th>
                  <th className="px-3 py-2 text-[12.5px] font-semibold text-[var(--color-text-secondary)]">Venue</th>
                  <th className="px-3 py-2 text-[12.5px] font-semibold text-[var(--color-text-secondary)] text-right">Attendance</th>
                  <th className="px-3 py-2 text-[12.5px] font-semibold text-[var(--color-text-secondary)] text-right">Gross</th>
                  <th className="px-3 py-2 text-[12.5px] font-semibold text-[var(--color-text-secondary)] text-right">Per head</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-bg-border)]">
                {recentShows.map(show => (
                  <tr key={show.id} className="tabular-nums">
                    <td className="px-3 py-2 text-[13.5px] text-[var(--color-text-primary)]">
                      {formatDate(show.showDate)}
                    </td>
                    <td className="px-3 py-2 text-[13.5px]">
                      <span className="font-medium text-[var(--color-text-primary)]">{show.tourName}</span>
                    </td>
                    <td className="px-3 py-2 text-[13.5px] text-[var(--color-text-primary)]">
                      {show.venueName}
                      {show.city && <span> · {[show.city, show.state].filter(Boolean).join(', ')}</span>}
                    </td>
                    <td className="px-3 py-2 text-[13.5px] text-right text-[var(--color-text-primary)]">
                      {show.attendance === null ? <span className="text-[var(--color-text-secondary)]">Not recorded</span> : formatNumber(show.attendance)}
                    </td>
                    <td className="px-3 py-2 text-[13.5px] text-right font-medium text-[var(--color-text-primary)]">
                      {formatCurrency(show.totalGross)}
                    </td>
                    <td className="px-3 py-2 text-[13.5px] text-right">
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

      {/* AI usage */}
      <div className="g-card overflow-hidden mt-5">
        <div className="p-4 border-b border-[var(--color-bg-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">AI usage</h2>
          <p className="text-[12.5px] text-[var(--color-text-secondary)]">
            Claude calls and cost this month, from each call&apos;s token usage.
          </p>
        </div>
        {!aiUsage.available ? (
          <div className="p-6 text-center text-[var(--color-text-secondary)]">
            Usage logging starts once database migration 009 is applied.
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard label="Calls this month" value={formatNumber(aiUsage.calls)} />
              <StatCard label="Cost this month" value={formatUsd(aiUsage.costUsd)} />
            </div>
            {aiUsage.byTask.length === 0 ? (
              <div className="text-center text-[var(--color-text-secondary)]">No AI calls this month yet.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-bg-border)] bg-[var(--color-table-head)] text-left">
                    <th className="px-3 py-2 text-[12.5px] font-semibold text-[var(--color-text-secondary)]">Task</th>
                    <th className="px-3 py-2 text-[12.5px] font-semibold text-[var(--color-text-secondary)] text-right">Calls</th>
                    <th className="px-3 py-2 text-[12.5px] font-semibold text-[var(--color-text-secondary)] text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-bg-border)]">
                  {aiUsage.byTask.map(t => (
                    <tr key={t.task} className="tabular-nums">
                      <td className="px-3 py-2 text-[13.5px] text-[var(--color-text-primary)]">{t.task}</td>
                      <td className="px-3 py-2 text-[13.5px] text-right text-[var(--color-text-primary)]">{formatNumber(t.calls)}</td>
                      <td className="px-3 py-2 text-[13.5px] text-right text-[var(--color-text-primary)]">{formatUsd(t.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
