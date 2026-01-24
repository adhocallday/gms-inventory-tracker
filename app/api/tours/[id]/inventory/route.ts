import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();

    // Get inventory balances with product details
    const { data: inventoryData, error: inventoryError } = await supabase.rpc(
      'get_inventory_with_products',
      { p_tour_id: params.id }
    );

    // If the RPC doesn't exist, fall back to manual query
    let inventory = inventoryData;
    if (inventoryError || !inventoryData) {
      // Manual join query
      const { data: balances } = await supabase
        .from('inventory_balances')
        .select(
          `
          product_id,
          size,
          total_received,
          total_sold,
          total_comps,
          balance
        `
        )
        .eq('tour_id', params.id);

      // Get product details
      const productIds = Array.from(
        new Set(balances?.map((b) => b.product_id) || [])
      );

      const { data: products } = await supabase
        .from('products')
        .select('id, sku, description, product_type')
        .in('id', productIds);

      // Get tour products for costs
      const { data: tourProducts } = await supabase
        .from('tour_products')
        .select('product_id, size, full_package_cost, suggested_retail')
        .eq('tour_id', params.id);

      // Combine the data
      inventory = (balances || []).map((bal) => {
        const product = products?.find((p) => p.id === bal.product_id);
        const tourProduct = tourProducts?.find(
          (tp) =>
            tp.product_id === bal.product_id && tp.size === bal.size
        );

        return {
          ...bal,
          sku: product?.sku,
          description: product?.description,
          product_type: product?.product_type,
          full_package_cost: tourProduct?.full_package_cost || 0,
          suggested_retail: tourProduct?.suggested_retail || 0,
        };
      });
    }

    // Get stock movements
    const { data: movements } = await supabase
      .from('stock_movement_view')
      .select('*')
      .eq('tour_id', params.id)
      .order('received_date', { ascending: false });

    // Get open PO quantities
    const { data: openPOs } = await supabase
      .from('po_open_qty_view')
      .select('*')
      .eq('tour_id', params.id);

    // Calculate summary statistics
    const summary = {
      total_products: new Set(inventory?.map((i: any) => i.sku)).size,
      total_on_hand: inventory?.reduce((sum: number, i: any) => sum + (i.balance || 0), 0) || 0,
      total_on_order: openPOs?.reduce(
        (sum, po) => sum + (po.open_quantity || 0),
        0
      ) || 0,
      total_sold: inventory?.reduce((sum: number, i: any) => sum + (i.total_sold || 0), 0) || 0,
      total_value: inventory?.reduce(
        (sum: number, i: any) => sum + (i.balance || 0) * (i.full_package_cost || 0),
        0
      ) || 0,
      low_stock_items: inventory?.filter(
        (i: any) => i.balance > 0 && i.balance < 10
      ).length || 0,
      out_of_stock_items: inventory?.filter((i: any) => i.balance === 0).length || 0,
    };

    return NextResponse.json({
      summary,
      inventory: inventory || [],
      movements: movements || [],
      openPOs: openPOs || [],
    });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
