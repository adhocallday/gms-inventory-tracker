import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { fetchAll } from '@/lib/supabase/fetch-all';

type Balance = {
  tour_id: string;
  product_id: string;
  size: string;
  total_received: number;
  total_sold: number;
  total_comps: number;
  balance: number;
};

/**
 * GET /api/admin/inventory
 * Cross-tour inventory balances joined with tour and product details.
 */
export async function GET() {
  try {
    const supabase = createServiceClient();

    const [{ data: tours, error: toursError }, balances, products, tourProducts] = await Promise.all([
      supabase.from('tours').select('id, name, artist, status').order('name'),
      fetchAll<Balance>((from, to) =>
        supabase
          .from('inventory_balances')
          .select('tour_id, product_id, size, total_received, total_sold, total_comps, balance')
          .order('tour_id')
          .order('product_id')
          .order('size')
          .range(from, to)
      ),
      fetchAll<{ id: string; sku: string; description: string; product_type: string }>((from, to) =>
        supabase.from('products').select('id, sku, description, product_type').order('id').range(from, to)
      ),
      // Unit cost lives on tour_products (per tour, product and size), not products
      fetchAll<{ tour_id: string; product_id: string; size: string; full_package_cost: number | null }>((from, to) =>
        supabase
          .from('tour_products')
          .select('tour_id, product_id, size, full_package_cost')
          .order('id')
          .range(from, to)
      ),
    ]);

    if (toursError) throw toursError;

    const tourById = new Map((tours ?? []).map((t) => [t.id, t]));
    const productById = new Map(products.map((p) => [p.id, p]));
    const costByKey = new Map(
      tourProducts.map((tp) => [`${tp.tour_id}:${tp.product_id}:${tp.size}`, Number(tp.full_package_cost ?? 0)])
    );

    const inventory = balances.flatMap((item) => {
      const tour = tourById.get(item.tour_id);
      const product = productById.get(item.product_id);
      if (!tour || !product) return [];
      return [{
        tour_id: item.tour_id,
        tour_name: tour.name,
        artist: tour.artist,
        product_id: item.product_id,
        sku: product.sku,
        description: product.description,
        size: item.size,
        product_type: product.product_type,
        total_received: item.total_received,
        total_sold: item.total_sold,
        total_comps: item.total_comps,
        balance: item.balance,
        full_package_cost: costByKey.get(`${item.tour_id}:${item.product_id}:${item.size}`) ?? 0,
      }];
    });

    return NextResponse.json({ tours: tours ?? [], inventory });
  } catch (err: any) {
    console.error('[admin/inventory] Error:', err);
    return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 });
  }
}
