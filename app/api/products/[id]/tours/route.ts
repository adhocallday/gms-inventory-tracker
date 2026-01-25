import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

interface RouteParams {
  params: { id: string };
}

// GET /api/products/[id]/tours - Get all tours that use this product
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServiceClient();
    const productId = params.id;

    // Get tour products with tour details
    const { data: tourProducts, error } = await supabase
      .from('tour_products')
      .select(`
        id,
        tour_id,
        size,
        blank_unit_cost,
        print_unit_cost,
        full_package_cost,
        suggested_retail,
        is_active,
        tours:tour_id (
          id,
          name,
          artist,
          status,
          start_date,
          end_date
        )
      `)
      .eq('product_id', productId)
      .order('tour_id');

    if (error) {
      console.error('Error fetching product tours:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by tour and aggregate sizes
    const tourMap = new Map<string, {
      tour: any;
      sizes: Array<{
        size: string | null;
        costs: {
          blank_unit_cost: number | null;
          print_unit_cost: number | null;
          full_package_cost: number | null;
          suggested_retail: number | null;
        };
        is_active: boolean;
      }>;
    }>();

    (tourProducts || []).forEach((tp: any) => {
      const tourId = tp.tour_id;
      const tour = tp.tours;

      if (!tourMap.has(tourId)) {
        tourMap.set(tourId, {
          tour,
          sizes: [],
        });
      }

      tourMap.get(tourId)!.sizes.push({
        size: tp.size,
        costs: {
          blank_unit_cost: tp.blank_unit_cost,
          print_unit_cost: tp.print_unit_cost,
          full_package_cost: tp.full_package_cost,
          suggested_retail: tp.suggested_retail,
        },
        is_active: tp.is_active,
      });
    });

    // Get inventory and sales for each tour
    const tourIds = Array.from(tourMap.keys());

    // Get inventory balances
    const { data: inventoryData } = await supabase
      .from('inventory_balances')
      .select('tour_id, balance')
      .eq('product_id', productId)
      .in('tour_id', tourIds);

    // Get sales totals per tour through shows
    const { data: showsForTours } = await supabase
      .from('shows')
      .select('id, tour_id')
      .in('tour_id', tourIds);

    const showIds = showsForTours?.map(s => s.id) || [];
    const showToTour = new Map(showsForTours?.map(s => [s.id, s.tour_id]) || []);

    const { data: salesData } = showIds.length > 0
      ? await supabase
          .from('sales')
          .select('show_id, qty_sold, gross_sales')
          .eq('product_id', productId)
          .in('show_id', showIds)
      : { data: [] };

    // Aggregate by tour
    const inventoryByTour = new Map<string, number>();
    (inventoryData || []).forEach(inv => {
      inventoryByTour.set(
        inv.tour_id,
        (inventoryByTour.get(inv.tour_id) || 0) + Number(inv.balance || 0)
      );
    });

    const salesByTour = new Map<string, { qty: number; gross: number }>();
    (salesData || []).forEach(sale => {
      const tourId = showToTour.get(sale.show_id);
      if (tourId) {
        const current = salesByTour.get(tourId) || { qty: 0, gross: 0 };
        salesByTour.set(tourId, {
          qty: current.qty + Number(sale.qty_sold || 0),
          gross: current.gross + Number(sale.gross_sales || 0),
        });
      }
    });

    // Build response
    const tours = Array.from(tourMap.entries()).map(([tourId, data]) => ({
      ...data.tour,
      sizes: data.sizes,
      totalBalance: inventoryByTour.get(tourId) || 0,
      totalSold: salesByTour.get(tourId)?.qty || 0,
      totalGross: salesByTour.get(tourId)?.gross || 0,
    }));

    return NextResponse.json({ tours });
  } catch (err) {
    console.error('Error in GET /api/products/[id]/tours:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
