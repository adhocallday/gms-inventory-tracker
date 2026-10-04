import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/client';
import { ProjectionSheet } from '@/components/projections/ProjectionSheet';
import { ArrowLeft } from 'lucide-react';

type ProjectionParams = {
  params: { id: string };
};

// Force dynamic rendering to always fetch fresh data
export const revalidate = 0;

export default async function ProjectionPage({ params }: ProjectionParams) {
  const supabase = createServiceClient();

  // Independent queries run in parallel
  const [
    { data: tour },
    { data: productSummary },
    { data: showSummary },
    { data: inventoryBalances },
    { data: poOpenQuantities },
    { data: tourProducts },
    { data: scenarios },
  ] = await Promise.all([
    supabase
      .from('tours')
      .select('id, name, artist')
      .eq('id', params.id)
      .maybeSingle(),
    supabase
      .from('product_summary_view')
      .select(
        'product_id, sku, description, size, total_sold, total_gross, full_package_cost'
      )
      .eq('tour_id', params.id),
    supabase
      .from('show_summary_view')
      .select('show_id, show_date, total_gross, attendance, per_head')
      .eq('tour_id', params.id),
    supabase
      .from('inventory_balances')
      .select('product_id, size, balance')
      .eq('tour_id', params.id),
    supabase
      .from('po_open_qty_view')
      .select('product_id, size, open_quantity, sku')
      .eq('tour_id', params.id),
    supabase
      .from('tour_products')
      .select('product_id, size, full_package_cost, suggested_retail')
      .eq('tour_id', params.id),
    supabase
      .from('forecast_scenarios')
      .select('id, name, is_baseline')
      .eq('tour_id', params.id)
      .order('created_at', { ascending: true }),
  ]);

  if (!tour) {
    notFound();
  }

  const productIds = Array.from(
    new Set((tourProducts ?? []).map((row) => row.product_id))
  );

  const { data: products } = productIds.length
    ? await supabase
        .from('products')
        .select('id, sku, description')
        .in('id', productIds)
    : { data: [] };

  return (
    <div className="g-container py-12">
      <Link href={`/tours/${tour.id}`} className="text-sm font-medium g-link">
        <ArrowLeft className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" />Back to tour
      </Link>
      <div className="flex flex-col gap-4 mt-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="g-kicker">Projection sheet</p>
          <h1 className="text-3xl font-semibold g-title mt-2">
            {tour.name}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">{tour.artist}</p>
        </div>
      </div>

      <ProjectionSheet
        tourId={tour.id}
        scenarios={scenarios ?? []}
        products={products ?? []}
        tourProducts={tourProducts ?? []}
        productSummary={productSummary ?? []}
        showSummary={showSummary ?? []}
        inventoryBalances={inventoryBalances ?? []}
        poOpenQuantities={poOpenQuantities ?? []}
      />
    </div>
  );
}
