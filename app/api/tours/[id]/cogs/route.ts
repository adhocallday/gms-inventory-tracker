import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();

    // Get product-level COGS data
    const { data: productData, error: productError } = await supabase
      .from('product_summary_view')
      .select('*')
      .eq('tour_id', params.id)
      .order('total_gross', { ascending: false });

    if (productError) {
      console.error('Error fetching product COGS:', productError);
      return NextResponse.json(
        { error: 'Failed to fetch product COGS data' },
        { status: 500 }
      );
    }

    // Get show-level summary data
    const { data: showData, error: showError } = await supabase
      .from('show_summary_view')
      .select('*')
      .eq('tour_id', params.id)
      .order('show_date', { ascending: true });

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

    // Calculate show-level COGS (we need to join with sales to get costs)
    const showCogs = await Promise.all(
      (showData || []).map(async (show) => {
        const { data: showSales } = await supabase
          .from('sales')
          .select(
            `
            qty_sold,
            tour_products!inner(
              full_package_cost
            )
          `
          )
          .eq('show_id', show.show_id);

        const showCogsCost = (showSales || []).reduce((sum, sale) => {
          const cost =
            (sale.qty_sold || 0) *
            ((sale.tour_products as any)?.full_package_cost || 0);
          return sum + cost;
        }, 0);

        return {
          ...show,
          cogs: showCogsCost,
          margin: (show.total_gross || 0) - showCogsCost,
          margin_percentage:
            show.total_gross > 0
              ? (((show.total_gross || 0) - showCogsCost) /
                  (show.total_gross || 0)) *
                100
              : 0,
        };
      })
    );

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
