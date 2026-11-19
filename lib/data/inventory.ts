import { createServiceClient } from '@/lib/supabase/client';

/**
 * Inventory for one tour: balances per product and size (received − sold −
 * comps), received stock, open PO quantities and the summary tiles.
 * Shared by /tours/[id]/inventory (server-rendered) and
 * GET /api/tours/[id]/inventory.
 */

export interface InventoryLine {
  product_id: string;
  size: string;
  total_received: number;
  total_sold: number;
  total_comps: number;
  balance: number;
  sku: string;
  description: string;
  product_type: string;
  full_package_cost: number;
  suggested_retail: number;
}

export interface TourInventory {
  summary: {
    total_products: number;
    total_on_hand: number;
    total_on_order: number;
    total_sold: number;
    total_value: number;
    low_stock_items: number;
    out_of_stock_items: number;
  };
  inventory: InventoryLine[];
  movements: any[];
  openPOs: any[];
}

export async function loadTourInventory(tourId: string): Promise<TourInventory> {
  const supabase = createServiceClient();

  // Balances, costs, movements and open POs are independent: fetch in parallel
  const [
    { data: balances },
    { data: tourProducts },
    { data: movements },
    { data: openPOs },
  ] = await Promise.all([
    supabase
      .from('inventory_balances')
      .select('product_id, size, total_received, total_sold, total_comps, balance')
      .eq('tour_id', tourId),
    supabase
      .from('tour_products')
      .select('product_id, size, full_package_cost, suggested_retail')
      .eq('tour_id', tourId),
    supabase
      .from('stock_movement_view')
      .select('*')
      .eq('tour_id', tourId)
      .order('received_date', { ascending: false }),
    supabase.from('po_open_qty_view').select('*').eq('tour_id', tourId),
  ]);

  const productIds = Array.from(new Set((balances ?? []).map((b) => b.product_id)));
  const { data: products } = productIds.length
    ? await supabase
        .from('products')
        .select('id, sku, description, product_type')
        .in('id', productIds)
    : { data: [] as { id: string; sku: string; description: string; product_type: string }[] };

  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const tourProductByKey = new Map(
    (tourProducts ?? []).map((tp) => [`${tp.product_id}:${tp.size}`, tp])
  );

  const inventory: InventoryLine[] = (balances ?? []).map((bal) => {
    const product = productById.get(bal.product_id);
    const tourProduct = tourProductByKey.get(`${bal.product_id}:${bal.size}`);
    return {
      ...bal,
      sku: product?.sku,
      description: product?.description,
      product_type: product?.product_type,
      full_package_cost: tourProduct?.full_package_cost || 0,
      suggested_retail: tourProduct?.suggested_retail || 0,
    };
  });

  const summary = {
    total_products: new Set(inventory.map((i) => i.sku)).size,
    total_on_hand: inventory.reduce((sum, i) => sum + (i.balance || 0), 0),
    total_on_order: (openPOs ?? []).reduce((sum, po) => sum + (po.open_quantity || 0), 0),
    total_sold: inventory.reduce((sum, i) => sum + (i.total_sold || 0), 0),
    total_value: inventory.reduce((sum, i) => sum + (i.balance || 0) * (i.full_package_cost || 0), 0),
    low_stock_items: inventory.filter((i) => i.balance > 0 && i.balance < 10).length,
    out_of_stock_items: inventory.filter((i) => i.balance === 0).length,
  };

  return {
    summary,
    inventory,
    movements: movements ?? [],
    openPOs: openPOs ?? [],
  };
}
