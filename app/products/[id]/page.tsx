import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/client';

export const revalidate = 0;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const formatNumber = (value: number) => value.toLocaleString();

interface ProductDetailParams {
  params: { id: string };
}

export default async function ProductDetailPage({ params }: ProductDetailParams) {
  const supabase = createServiceClient();
  const productId = params.id;

  // Get product details
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (!product) {
    notFound();
  }

  // Get sales data across all shows
  const { data: salesBySize } = await supabase
    .from('sales')
    .select('size, qty_sold, gross_sales, show_id, shows(show_date, venue_name, city)')
    .eq('product_id', productId)
    .order('show_date', { ascending: false, foreignTable: 'shows' });

  // Get inventory balance by size
  const { data: inventoryBySize } = await supabase
    .from('inventory')
    .select('size, balance, tour_id, tours(name)')
    .eq('product_id', productId);

  // Aggregate sales by size
  const salesAgg = (salesBySize ?? []).reduce((acc: any, row: any) => {
    const size = row.size || 'OS';
    if (!acc[size]) {
      acc[size] = { size, qty_sold: 0, gross_sales: 0 };
    }
    acc[size].qty_sold += Number(row.qty_sold || 0);
    acc[size].gross_sales += Number(row.gross_sales || 0);
    return acc;
  }, {});

  const salesBySizeArray = Object.values(salesAgg).sort((a: any, b: any) => {
    const sizeOrder = ['S', 'M', 'L', 'XL', '2XL', '3XL', 'OS'];
    return sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size);
  });

  // Aggregate inventory by size
  const inventoryAgg = (inventoryBySize ?? []).reduce((acc: any, row: any) => {
    const size = row.size || 'OS';
    if (!acc[size]) {
      acc[size] = { size, balance: 0 };
    }
    acc[size].balance += Number(row.balance || 0);
    return acc;
  }, {});

  const inventoryBySizeArray = Object.values(inventoryAgg);

  // Total stats
  const totalSold = (salesBySize ?? []).reduce((sum, row) => sum + Number(row.qty_sold || 0), 0);
  const totalGross = (salesBySize ?? []).reduce((sum, row) => sum + Number(row.gross_sales || 0), 0);
  const totalInventory = (inventoryBySize ?? []).reduce((sum, row) => sum + Number(row.balance || 0), 0);

  return (
    <div className="g-container py-8">
      <div className="mb-6">
        <Link href="/" className="text-sm text-[var(--g-text-muted)] hover:text-[var(--g-text)] transition">
          ← Back to Tours
        </Link>
      </div>

      <div className="g-card p-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold g-title mb-2">{product.sku}</h1>
            <p className="text-lg text-[var(--g-text-dim)]">{product.description}</p>
            <p className="text-sm text-[var(--g-text-muted)] mt-1 capitalize">{product.product_type}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-8">
          <div>
            <p className="text-sm text-[var(--g-text-muted)] mb-1">Total Sold</p>
            <p className="text-2xl font-semibold">{formatNumber(totalSold)}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--g-text-muted)] mb-1">Total Revenue</p>
            <p className="text-2xl font-semibold">{currencyFormatter.format(totalGross)}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--g-text-muted)] mb-1">Current Inventory</p>
            <p className="text-2xl font-semibold">{formatNumber(totalInventory)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="g-card p-6">
          <h2 className="text-lg font-semibold g-title mb-4">Sales by Size</h2>
          <div className="space-y-3">
            {salesBySizeArray.length === 0 ? (
              <p className="text-sm text-[var(--g-text-muted)]">No sales data yet.</p>
            ) : (
              (salesBySizeArray as any[]).map((row) => (
                <div key={row.size} className="flex items-center justify-between p-3 border border-[var(--g-border)] rounded-lg">
                  <div>
                    <p className="font-medium">{row.size}</p>
                    <p className="text-sm text-[var(--g-text-muted)]">{formatNumber(row.qty_sold)} units</p>
                  </div>
                  <p className="font-semibold">{currencyFormatter.format(row.gross_sales)}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="g-card p-6">
          <h2 className="text-lg font-semibold g-title mb-4">Inventory by Size</h2>
          <div className="space-y-3">
            {inventoryBySizeArray.length === 0 ? (
              <p className="text-sm text-[var(--g-text-muted)]">No inventory data yet.</p>
            ) : (
              (inventoryBySizeArray as any[]).map((row) => (
                <div key={row.size} className="flex items-center justify-between p-3 border border-[var(--g-border)] rounded-lg">
                  <p className="font-medium">{row.size}</p>
                  <p className="font-semibold">{formatNumber(row.balance)} units</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="g-card p-6 mt-8">
        <h2 className="text-lg font-semibold g-title mb-4">Sales by Show</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm g-table">
            <thead className="text-left">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Venue</th>
                <th className="py-2 pr-4">City</th>
                <th className="py-2 pr-4">Size</th>
                <th className="py-2 pr-4 text-right">Qty Sold</th>
                <th className="py-2 pr-4 text-right">Gross Sales</th>
              </tr>
            </thead>
            <tbody>
              {(salesBySize ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-3 text-[var(--g-text-muted)]">
                    No sales data yet.
                  </td>
                </tr>
              ) : (
                (salesBySize ?? []).map((row: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-3 pr-4">
                      {row.shows?.show_date
                        ? new Date(row.shows.show_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="py-3 pr-4">{row.shows?.venue_name ?? '—'}</td>
                    <td className="py-3 pr-4">{row.shows?.city ?? '—'}</td>
                    <td className="py-3 pr-4">{row.size || 'OS'}</td>
                    <td className="py-3 pr-4 text-right">{formatNumber(Number(row.qty_sold || 0))}</td>
                    <td className="py-3 pr-4 text-right">{currencyFormatter.format(Number(row.gross_sales || 0))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
