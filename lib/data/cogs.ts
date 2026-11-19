import { createServiceClient } from '@/lib/supabase/client';
import { fetchAll } from '@/lib/supabase/fetch-all';

/**
 * Cost of goods sold for one tour: totals, per product and size, and per show.
 * Shared by /tours/[id]/cogs (server-rendered) and GET /api/tours/[id]/cogs.
 */

export interface TourCogs {
  totals: {
    total_revenue: number;
    total_cogs: number;
    total_margin: number;
    margin_percentage: number;
    total_units_sold: number;
  };
  products: any[];
  shows: any[];
}

/** A query failed; `message` is safe to show to the client. */
export class CogsLoadError extends Error {}

export async function loadTourCogs(tourId: string): Promise<TourCogs> {
  const supabase = createServiceClient();

  // Product summary, show summary and every sale on the tour, in parallel.
  // Sales filter on the tour through the show join, so they need no first
  // round trip for the tour's show ids.
  const [
    { data: productData, error: productError },
    { data: showData, error: showError },
    tourSales,
  ] = await Promise.all([
    supabase
      .from('product_summary_view')
      .select('*')
      .eq('tour_id', tourId)
      .order('total_gross', { ascending: false }),
    supabase
      .from('show_summary_view')
      .select('*')
      .eq('tour_id', tourId)
      .order('show_date', { ascending: true }),
    fetchAll<{ show_id: string; qty_sold: number | null; tour_products: any }>((from, to) =>
      supabase
        .from('sales')
        .select('id, show_id, qty_sold, tour_products!inner(full_package_cost), shows!inner(tour_id)')
        .eq('shows.tour_id', tourId)
        .order('id')
        .range(from, to)
    ),
  ]);

  if (productError) {
    console.error('Error fetching product COGS:', productError);
    throw new CogsLoadError('Failed to fetch product COGS data');
  }
  if (showError) {
    console.error('Error fetching show summary:', showError);
    throw new CogsLoadError('Failed to fetch show summary data');
  }

  const totals = {
    total_revenue: 0,
    total_cogs: 0,
    total_margin: 0,
    margin_percentage: 0,
    total_units_sold: 0,
  };
  productData?.forEach((product) => {
    totals.total_revenue += product.total_gross || 0;
    totals.total_cogs += product.total_cogs || 0;
    totals.total_margin += product.gross_margin || 0;
    totals.total_units_sold += product.total_sold || 0;
  });
  totals.margin_percentage =
    totals.total_revenue > 0 ? (totals.total_margin / totals.total_revenue) * 100 : 0;

  // Show-level COGS: the tour's sales grouped by show in memory
  const cogsByShow = new Map<string, number>();
  for (const sale of tourSales) {
    const cost = (sale.qty_sold || 0) * (sale.tour_products?.full_package_cost || 0);
    cogsByShow.set(sale.show_id, (cogsByShow.get(sale.show_id) ?? 0) + cost);
  }

  const shows = (showData || []).map((show) => {
    const showCogsCost = cogsByShow.get(show.show_id) ?? 0;
    return {
      ...show,
      cogs: showCogsCost,
      margin: (show.total_gross || 0) - showCogsCost,
      margin_percentage:
        show.total_gross > 0
          ? (((show.total_gross || 0) - showCogsCost) / (show.total_gross || 0)) * 100
          : 0,
    };
  });

  return { totals, products: productData || [], shows };
}
