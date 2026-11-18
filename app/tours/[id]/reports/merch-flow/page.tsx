import { notFound } from 'next/navigation';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/client';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { generateBreadcrumbs } from '@/lib/utils/breadcrumbs';
import { chartsNewReportUrl } from '@/lib/apps';
import { loadTourReport } from '@/lib/reporting/merch-flow/from-db';
import { ReportDashboard } from '@/components/merch-flow-report/ReportDashboard';

export const revalidate = 30;

interface MerchFlowPageProps {
  params: { id: string };
}

/**
 * The tour report, rendered by MerchFlow Charts' own web dashboard
 * (components/merch-flow-report, vendored) from live data. The numbers come
 * from the vendored Charts engine, so they match what the Charts wizard builds
 * for this tour. The PDF is built in Charts through the tracker deep link.
 */
export default async function MerchFlowReportPage({ params }: MerchFlowPageProps) {
  const { id: tourId } = params;

  let data: Awaited<ReturnType<typeof loadTourReport>>;
  try {
    data = await loadTourReport(createServiceClient(), tourId);
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

  const { tour, report, imageUrls, issues, gaps } = data;

  const breadcrumbs = generateBreadcrumbs([
    { label: 'Tours', href: '/' },
    { label: tour.name, href: `/tours/${tourId}` },
    { label: 'Reports', href: `/tours/${tourId}/reports` },
    { label: 'Merch flow' },
  ]);

  return (
    <div className="py-6 space-y-5">
      <Breadcrumb items={breadcrumbs} />

      <section data-tour="mf-quality" className="g-card p-5" aria-label="Data quality">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          <AlertTriangle className="inline-block h-4 w-4 align-[-0.15em] mr-1.5 text-[var(--color-text-secondary)]" aria-hidden="true" />
          Data quality
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Suggestions only. Nothing here changes the stored data or the report below.
        </p>
        {issues.length === 0 && gaps.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
            <CheckCircle className="inline-block h-4 w-4 align-[-0.125em] mr-1 text-green-600" aria-hidden="true" />
            No issues found.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {gaps.map((gap) => (
              <li key={`gap-${gap.field}`} className="rounded-lg border border-blue-500/25 bg-blue-500/10 p-3">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  <Info className="inline-block h-4 w-4 align-[-0.125em] mr-1 text-blue-500" aria-hidden="true" />
                  Missing data: {gap.field}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{gap.message}</p>
              </li>
            ))}
            {issues.map((issue) => (
              <li key={`${issue.kind}-${issue.title}`} className="rounded-lg border border-orange-500/25 bg-orange-500/10 p-3">
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  <AlertTriangle className="inline-block h-4 w-4 align-[-0.125em] mr-1 text-orange-500" aria-hidden="true" />
                  {issue.title}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{issue.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Charts' dashboard is light-only; pin its text colour so dark mode does not leak in. */}
      <div className="mf-report overflow-hidden rounded-lg">
        <ReportDashboard
          report={report}
          imageUrls={imageUrls}
          pdfHref={chartsNewReportUrl(tourId)}
          pdfLabel="Build PDF in MerchFlow Charts"
        />
      </div>
    </div>
  );
}
