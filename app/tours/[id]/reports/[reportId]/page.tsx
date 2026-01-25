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
  const { data: productSummaryRaw } = await supabase
    .from('product_summary_view')
    .select('*')
    .eq('tour_id', tourId);

  // Aggregate size-level data into SKU-level totals
  const productSummary = productSummaryRaw?.reduce((acc: any[], row: any) => {
    const existingProduct = acc.find(p => p.product_id === row.product_id);

    if (existingProduct) {
      // Aggregate: sum up units and gross
      existingProduct.total_sold = (existingProduct.total_sold || 0) + (row.total_sold || 0);
      existingProduct.total_gross = (existingProduct.total_gross || 0) + (row.total_gross || 0);
    } else {
      // First time seeing this product_id, add it
      acc.push({
        ...row,
        total_sold: row.total_sold || 0,
        total_gross: row.total_gross || 0,
        size: undefined // Remove size since this is now aggregated
      });
    }

    return acc;
  }, []).sort((a: any, b: any) => (b.total_sold || 0) - (a.total_sold || 0)); // Sort by sales descending

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

  // Debug: Log image data
  console.log(`[Report Page] Fetched ${productImages?.length || 0} product images`);
  if (productImages && productImages.length > 0) {
    const firstImage = productImages[0];
    console.log(`[Report Page] Sample image - SKU: ${firstImage.sku}, has file_url: ${!!firstImage.file_url}, URL length: ${firstImage.file_url?.length || 0}`);
  }

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
