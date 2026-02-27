import { Suspense } from 'react';
import { createServiceClient } from '@/lib/supabase/client';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { ReportList } from '@/components/reports/ReportList';
import { PageHeader } from '@/components/layout/PageHeader';
import { generateBreadcrumbs } from '@/lib/utils/breadcrumbs';

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
          <p className="text-[var(--color-text-muted)]">Tour not found</p>
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

  // Fetch product count
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('tour_id', tourId);

  const breadcrumbs = generateBreadcrumbs([
    { label: 'Tours', href: '/' },
    { label: tour.name, href: `/tours/${tourId}` },
    { label: 'Reports' },
  ]);

  return (
    <div className="g-container py-12">
      <PageHeader
        title="Tour Reports"
        subtitle={`${tour.name} • ${showCount || 0} shows • ${productCount || 0} products`}
        kicker="Reporting"
        breadcrumbs={breadcrumbs}
      />

      {/* Info Box */}
      <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-400 mb-2">💡 About Product Images</h3>
        <p className="text-xs text-blue-400/80 mb-2">
          Product images (grab sheets) will automatically appear in reports once uploaded. To add images:
        </p>
        <ol className="text-xs text-blue-400/80 space-y-1 list-decimal list-inside">
          <li>Images can be uploaded through the product management interface (coming soon)</li>
          <li>Supported formats: PNG, JPG, GIF, WebP (max 10MB)</li>
          <li>Set one image as "primary" to display in reports</li>
          <li>Images are stored securely in Supabase Storage and delivered via CDN</li>
        </ol>
        <p className="text-xs text-blue-400/80 mt-3">
          <strong>Note:</strong> Reports currently display product data without images. Upload grab sheets to see them in the Product Breakdown section.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Report Builder */}
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="g-card p-8">Loading...</div>}>
            <ReportBuilder tourId={tourId} tour={tour} />
          </Suspense>
        </div>

        {/* Existing Reports List */}
        <div className="lg:col-span-1">
          <Suspense fallback={<div className="g-card p-8">Loading...</div>}>
            <ReportList tourId={tourId} reports={reports || []} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
