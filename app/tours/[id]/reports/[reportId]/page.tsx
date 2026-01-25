import { createServiceClient } from '@/lib/supabase/client';
import { ReportViewer } from '@/components/reports/ReportViewer';
import { notFound } from 'next/navigation';

interface ReportViewPageProps {
  params: {
    id: string;
    reportId: string;
  };
}

export default async function ReportViewPage({ params }: ReportViewPageProps) {
  const { id: tourId, reportId } = params;
  const supabase = createServiceClient();

  // Fetch report
  const { data: report, error: reportError } = await supabase
    .from('tour_reports')
    .select('*')
    .eq('id', reportId)
    .eq('tour_id', tourId)
    .single();

  if (reportError || !report) {
    notFound();
  }

  // Fetch tour details
  const { data: tour } = await supabase
    .from('tours')
    .select('*')
    .eq('id', tourId)
    .single();

  // Fetch product summary (historical sales data)
  const { data: productSummary } = await supabase
    .from('product_summary_view')
    .select('*')
    .eq('tour_id', tourId);

  // Fetch show summary
  const { data: showSummary } = await supabase
    .from('show_summary_view')
    .select('*')
    .eq('tour_id', tourId)
    .order('show_date', { ascending: true });

  // Fetch product images
  const { data: productImages } = await supabase
    .from('product_images_detail')
    .select('*')
    .eq('tour_id', tourId)
    .eq('is_primary', true);

  // Fetch product categories
  const { data: categories } = await supabase
    .from('product_categories')
    .select('*')
    .eq('tour_id', tourId)
    .order('display_order', { ascending: true });

  return (
    <ReportViewer
      report={report}
      tour={tour}
      productSummary={productSummary || []}
      showSummary={showSummary || []}
      productImages={productImages || []}
      categories={categories || []}
    />
  );
}
