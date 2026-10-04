import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { fetchAll } from '@/lib/supabase/fetch-all';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();

    const showIdsQuery = supabase.from('shows').select('id').eq('tour_id', params.id);

    // Product summary, show summary and all sales for the tour, in parallel
    const [
      { data: productData, error: productError },
      { data: showData, error: showError },
      { data: tourShows },
    ] = await Promise.all([
      supabase
        .from('product_summary_view')
        .select('*')
        .eq('tour_id', params.id)
        .order('total_gross', { ascending: false }),
      supabase
        .from('show_summary_view')
        .select('*')
        .eq('tour_id', params.id)
        .order('show_date', { ascending: true }),
      showIdsQuery,
    ]);

    if (productError) {
      console.error('Error fetching product COGS:', productError);
      return NextResponse.json(
        { error: 'Failed to fetch product COGS data' },
        { status: 500 }
      );
    }

    if (showError) {
      console.error('Error fetching show summary:', showError);
      return NextResponse.json(
        { error: 'Failed to fetch show summary data' },
        { status: 500 }
      );
    }

    // Calculate tour-level totals
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
      totals.total_revenue > 0
        ? (totals.total_margin / totals.total_revenue) * 100
        : 0;

    // Show-level COGS: one query for every sale on the tour, grouped in memory
    // (previously one query per show)
    const showIds = (tourShows ?? []).map((row) => row.id);
    const tourSales = showIds.length
      ? await fetchAll<{ show_id: string; qty_sold: number | null; tour_products: any }>((from, to) =>
          supabase
            .from('sales')
            .select('id, show_id, qty_sold, tour_products!inner(full_package_cost)')
            .in('show_id', showIds)
            .order('id')
            .range(from, to)
        )
      : [];

    const cogsByShow = new Map<string, number>();
    for (const sale of tourSales) {
      const cost = (sale.qty_sold || 0) * (sale.tour_products?.full_package_cost || 0);
      cogsByShow.set(sale.show_id, (cogsByShow.get(sale.show_id) ?? 0) + cost);
    }

    const showCogs = (showData || []).map((show) => {
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

    return NextResponse.json({
      totals,
      products: productData || [],
      shows: showCogs,
    });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
