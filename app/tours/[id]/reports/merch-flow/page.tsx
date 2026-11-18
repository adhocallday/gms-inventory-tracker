import { notFound } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckCircle,
  DollarSign,
  Info,
  Lightbulb,
  Minus,
  PieChart,
  ShoppingCart,
  Ticket,
  Trophy,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { generateBreadcrumbs } from '@/lib/utils/breadcrumbs';
import { CategoryMixChart, MonthlyTotalsChart } from '@/components/reports/merch-flow/MerchFlowCharts';
import { loadTourReport } from '@/lib/reporting/merch-flow/from-db';
import {
  categoryTotals,
  inferTourStart,
  keyFigures,
  monthTotals,
  perHeadValue,
  rollUpTail,
  scorecard,
} from '@/lib/reporting/merch-flow/derive';
import { findIssues } from '@/lib/reporting/merch-flow/issues';
import { productRatios, totalGross, totalUnits } from '@/lib/reporting/merch-flow/types';
import { oneIn, percent, units, usd } from '@/lib/reporting/merch-flow/format';

export const revalidate = 30;

interface MerchFlowPageProps {
  params: { id: string };
}

function Section({
  title,
  icon: Icon,
  description,
  children,
}: {
  title: string;
  icon: LucideIcon;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="g-card p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          <Icon className="inline-block h-5 w-5 align-[-0.2em] mr-2 text-[var(--color-text-secondary)]" aria-hidden="true" />
          {title}
        </h2>
        {description && (
          <p className="text-xs text-[var(--color-text-muted)] mt-1">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, note, icon: Icon }: { label: string; value: string; note?: string; icon: LucideIcon }) {
  return (
    <div className="g-card p-4">
      <p className="text-xs text-[var(--color-text-muted)]">
        <Icon className="inline-block h-4 w-4 align-[-0.2em] mr-1" aria-hidden="true" />
        {label}
      </p>
      <p className="text-2xl font-semibold mt-2 tabular-nums">{value}</p>
      {note && <p className="text-xs text-[var(--color-text-muted)] mt-1">{note}</p>}
    </div>
  );
}

function RankShift({ shift }: { shift: number }) {
  if (shift === 0) {
    return (
      <span className="text-[var(--color-text-muted)]">
        <Minus className="inline-block h-3 w-3" aria-hidden="true" />
        <span className="sr-only">No change</span>
      </span>
    );
  }
  const up = shift > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={up ? 'text-green-400' : 'text-[var(--color-text-secondary)]'}>
      <Icon className="inline-block h-3 w-3 align-[-0.1em] mr-0.5" aria-hidden="true" />
      {Math.abs(shift)}
      <span className="sr-only">{up ? ' places higher by gross' : ' places lower by gross'}</span>
    </span>
  );
}

const th = 'px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)] whitespace-nowrap';
const thNum = `${th} text-right`;
const td = 'px-3 py-2 text-sm text-[var(--color-text-primary)]';
const tdNum = `${td} text-right tabular-nums`;

export default async function MerchFlowReportPage({ params }: MerchFlowPageProps) {
  const { id: tourId } = params;
  const supabase = createServiceClient();

  let data: Awaited<ReturnType<typeof loadTourReport>>;
  try {
    data = await loadTourReport(supabase, tourId);
  } catch (error) {
    console.error('[merch-flow] failed to load tour report', error);
    return (
      <div className="g-container py-8">
        <div className="g-card p-8 text-center">
          <p className="text-[var(--color-text-muted)]">The merch flow report could not be loaded. Try again shortly.</p>
        </div>
      </div>
    );
  }
  if (!data) notFound();

  const { tour, report, rows, gaps, totalComps, unitsAtCountedShows } = data;

  const gross = totalGross(report.shows);
  const unitCount = totalUnits(report.products);
  const perHead = perHeadValue(report);
  const showsWithHeads = report.shows.filter((s) => typeof s.perHeadUsd === 'number').length;
  const showsWithAttendance = report.shows.filter((s) => s.attendance !== undefined).length;

  const tourStart = inferTourStart(report.shows);
  const rowsByRank = scorecard(report.products);
  const { head, tail, tailUnits, tailShare } = rollUpTail(rowsByRank, report.options.tailThreshold);
  const categories = categoryTotals(report.products);
  const months = monthTotals(report.shows, tourStart);
  const figures = keyFigures(report);
  const issues = findIssues({ rows, shows: report.shows, tourStart });
  // The per-show attendance issue already lists what the attendance gap says.
  const shownGaps = issues.some((i) => i.kind === 'missingAttendance')
    ? gaps.filter((g) => g.field !== 'attendance')
    : gaps;

  const ratios = productRatios(
    report.products.map((p) => ({ ...p, unitsSold: unitsAtCountedShows[p.sku] ?? 0 })),
    report.attendance,
  );
  const displayNameBySku = new Map(rowsByRank.map((r) => [r.sku, r.displayName ?? r.name]));

  const breadcrumbs = generateBreadcrumbs([
    { label: 'Tours', href: '/' },
    { label: tour.name, href: `/tours/${tourId}` },
    { label: 'Reports', href: `/tours/${tourId}/reports` },
    { label: 'Merch flow' },
  ]);

  const subtitle = [report.artist, report.dateRange, `${report.shows.length} reported show${report.shows.length === 1 ? '' : 's'}`]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className="g-container py-12 space-y-8">
      <PageHeader title="Merch Flow Report" subtitle={subtitle} kicker="Reporting" breadcrumbs={breadcrumbs} />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={DollarSign} label="Gross" value={usd(gross)} note={`${report.shows.length} shows`} />
        <Kpi
          icon={ShoppingCart}
          label="Units sold"
          value={units(unitCount)}
          note={totalComps ? `plus ${units(totalComps)} comped` : `${report.products.length} products`}
        />
        <Kpi
          icon={Users}
          label="Per head"
          value={showsWithHeads ? usd(perHead, 2) : 'No data'}
          note={showsWithHeads ? `Mean of ${showsWithHeads} show${showsWithHeads === 1 ? '' : 's'} with attendance` : 'Needs attendance'}
        />
        <Kpi
          icon={Ticket}
          label="Attendance"
          value={report.attendance ? units(report.attendance) : 'No data'}
          note={`${showsWithAttendance} of ${report.shows.length} shows entered`}
        />
      </div>

      {/* Key figures */}
      {figures.length > 0 && (
        <Section title="Key figures" icon={Lightbulb}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {figures.map((f) => (
              <div key={f.text} className="rounded-lg border border-[var(--color-bg-border)] p-4">
                <p className="text-3xl font-semibold tabular-nums text-[var(--color-text-primary)]">{f.stat}</p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">{f.text}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Scorecard */}
      <Section
        title="Product scorecard"
        icon={Trophy}
        description="Ranked by units sold. Shift is how many places higher (or lower) a product ranks by share of gross."
      >
        {head.length + tail.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No sales posted for this tour yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-[var(--color-bg-border)]">
                <tr>
                  <th className={th}>Product</th>
                  <th className={th}>Category</th>
                  <th className={thNum}>Units</th>
                  <th className={thNum}>Share of gross</th>
                  <th className={thNum}>Unit rank</th>
                  <th className={thNum}>Gross rank</th>
                  <th className={thNum}>Shift</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-bg-border)]">
                {head.map((r) => (
                  <tr key={r.sku}>
                    <td className={td}>
                      <span className="font-medium">{r.displayName}</span>
                      <span className="block text-xs text-[var(--color-text-muted)] font-mono">{r.sku}</span>
                    </td>
                    <td className={`${td} text-[var(--color-text-secondary)]`}>{r.category}</td>
                    <td className={tdNum}>{units(r.unitsSold)}</td>
                    <td className={tdNum}>{percent(r.shareOfGross, 1)}</td>
                    <td className={tdNum}>#{r.rankByUnits}</td>
                    <td className={tdNum}>#{r.rankByGross}</td>
                    <td className={tdNum}>
                      <RankShift shift={r.rankShift} />
                    </td>
                  </tr>
                ))}
                {tail.length > 0 && (
                  <tr>
                    <td className={`${td} text-[var(--color-text-secondary)]`} colSpan={2}>
                      {tail.length} more product{tail.length === 1 ? '' : 's'} under {percent(report.options.tailThreshold, 0)} of gross
                    </td>
                    <td className={tdNum}>{units(tailUnits)}</td>
                    <td className={tdNum}>{percent(tailShare, 1)}</td>
                    <td className={tdNum} colSpan={3} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category mix */}
        <Section title="Category mix" icon={PieChart} description="Share of units sold by category.">
          {categories.length ? (
            <>
              <CategoryMixChart
                data={categories.map((c) => ({ category: c.category, units: c.units, share: c.share, color: c.color }))}
              />
              <table className="w-full mt-4">
                <thead className="border-b border-[var(--color-bg-border)]">
                  <tr>
                    <th className={th}>Category</th>
                    <th className={thNum}>Products</th>
                    <th className={thNum}>Units</th>
                    <th className={thNum}>Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-bg-border)]">
                  {categories.map((c) => (
                    <tr key={c.category}>
                      <td className={td}>
                        <span className="inline-block h-2.5 w-2.5 rounded-sm mr-2" style={{ backgroundColor: c.color }} aria-hidden="true" />
                        {c.category}
                      </td>
                      <td className={tdNum}>{c.products}</td>
                      <td className={tdNum}>{units(c.units)}</td>
                      <td className={tdNum}>{percent(c.share, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">No units sold yet.</p>
          )}
        </Section>

        {/* Monthly totals */}
        <Section title="Monthly totals" icon={CalendarDays} description="Gross by month. Isolated shows before the main leg are grouped together.">
          {months.length ? (
            <>
              <MonthlyTotalsChart data={months.map((m) => ({ label: m.label, gross: m.gross, shows: m.shows.length }))} />
              <table className="w-full mt-4">
                <thead className="border-b border-[var(--color-bg-border)]">
                  <tr>
                    <th className={th}>Month</th>
                    <th className={thNum}>Shows</th>
                    <th className={thNum}>Gross</th>
                    <th className={thNum}>Per show</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-bg-border)]">
                  {months.map((m) => (
                    <tr key={m.key}>
                      <td className={td}>{m.label}</td>
                      <td className={tdNum}>{m.shows.length}</td>
                      <td className={tdNum}>{usd(m.gross)}</td>
                      <td className={tdNum}>{usd(m.gross / m.shows.length)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">No shows with sales yet.</p>
          )}
        </Section>
      </div>

      {/* 1-in-N ratios */}
      <Section
        title="1-in-N ratios"
        icon={Users}
        description={
          showsWithAttendance
            ? `How many attendees per unit sold, over the ${showsWithAttendance} show${showsWithAttendance === 1 ? '' : 's'} with attendance entered (${units(report.attendance)} people).`
            : undefined
        }
      >
        {report.attendance > 0 && ratios.length > 0 ? (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[480px]">
              <thead className="border-b border-[var(--color-bg-border)]">
                <tr>
                  <th className={th}>Product</th>
                  <th className={thNum}>Units at counted shows</th>
                  <th className={thNum}>Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-bg-border)]">
                {ratios.map((r) => (
                  <tr key={r.sku}>
                    <td className={td}>{displayNameBySku.get(r.sku) ?? r.name}</td>
                    <td className={tdNum}>{units(r.unitsSold)}</td>
                    <td className={tdNum}>{oneIn(r.oneInN)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            Ratios need attendance. Enter attendance on the shows to see them.
          </p>
        )}
      </Section>

      {/* Data quality */}
      <Section title="Data quality" icon={AlertTriangle} description="Suggestions only. Nothing here changes the stored data.">
        {issues.length === 0 && shownGaps.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            <CheckCircle className="inline-block h-4 w-4 align-[-0.125em] mr-1 text-green-400" aria-hidden="true" />
            No issues found.
          </p>
        ) : (
          <ul className="space-y-3">
            {issues.map((issue) => (
              <li key={`${issue.kind}-${issue.title}`} className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-4">
                <p className="text-sm font-semibold text-orange-400">
                  <AlertTriangle className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" />
                  {issue.title}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{issue.detail}</p>
              </li>
            ))}
            {shownGaps.map((gap) => (
              <li key={gap.field} className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
                <p className="text-sm font-semibold text-blue-400">
                  <Info className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" />
                  Missing data: {gap.field}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{gap.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
