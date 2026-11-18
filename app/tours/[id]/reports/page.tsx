import { Suspense } from 'react';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/client';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { ReportList } from '@/components/reports/ReportList';
import { PageHeader } from '@/components/layout/PageHeader';
import { MakeSalesChartButton } from '@/components/reports/MakeSalesChartButton';
import { BusinessCentralCard } from '@/components/reports/BusinessCentralCard';
import { ArrowLeft, BarChart3, Info } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface TourReportsPageProps {
  params: { id: string };
}

export default async function TourReportsPage({ params }: TourReportsPageProps) {
  const { id: tourId } = params;
  const supabase = createServiceClient();

  // Fetch tour details
  const { data: tour } = await supabase
    .from('tours')
    .select('*')
    .eq('id', tourId)
    .single();

  if (!tour) {
    return (
      <div className="g-container py-8">
        <div className="g-card p-8 text-center">
          <p className="text-[var(--color-text-secondary)]">This tour does not exist or was deleted.</p>
        </div>
      </div>
    );
  }

  // Fetch existing reports
  const { data: reports } = await supabase
    .from('tour_reports_summary')
    .select('*, section_count')
    .eq('tour_id', tourId)
    .order('created_at', { ascending: false });

  // Fetch show count for context
  const { count: showCount } = await supabase
    .from('shows')
    .select('*', { count: 'exact', head: true })
    .eq('tour_id', tourId);

  // Products belong to a tour through tour_products (one row per size);
  // products itself has no tour_id, so counting it by tour always gave 0.
  const { data: tourProductRows } = await supabase
    .from('tour_products')
    .select('product_id')
    .eq('tour_id', tourId);
  const productCount = new Set((tourProductRows ?? []).map((row) => row.product_id)).size;

  return (
    <div className="g-container py-6">
      <Link href={`/tours/${tourId}`} className="text-sm font-medium g-link">
        <ArrowLeft className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" />
        {tour.name}
      </Link>
      <PageHeader
        className="mt-3"
        title="Reports"
        subtitle={`${showCount || 0} shows · ${productCount} products. The merch flow report is live; reports built below are saved snapshots.`}
        actions={
          <>
            <MakeSalesChartButton tourId={tourId} />
            <Link
              href={`/tours/${tourId}/reports/merch-flow`}
              data-tour="merch-flow-report"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md text-sm font-semibold bg-[var(--color-red-primary)] text-white hover:bg-[var(--color-red-hover)] active:bg-[var(--color-red-active)] transition-all"
            >
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              Merch flow report
            </Link>
          </>
        }
      />

      <BusinessCentralCard />

      <div className="mb-6 rounded-lg border border-info-border bg-info-bg p-4 text-sm">
        <p className="flex items-center gap-1.5 font-semibold text-info">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          Product images
        </p>
        <p className="mt-1 text-[var(--color-text-secondary)]">
          Reports built here show product data without images: the tracker has no image upload screen yet.
          When images are added (PNG, JPG, GIF or WebP, up to 10 MB), the one marked primary appears in the product breakdown.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Builder */}
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="g-card p-8 text-sm text-[var(--color-text-secondary)]" role="status">Loading…</div>}>
            <ReportBuilder tourId={tourId} tour={tour} />
          </Suspense>
        </div>

        {/* Existing Reports List */}
        <div className="lg:col-span-1">
          <Suspense fallback={<div className="g-card p-8 text-sm text-[var(--color-text-secondary)]" role="status">Loading…</div>}>
            <ReportList tourId={tourId} reports={reports || []} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
