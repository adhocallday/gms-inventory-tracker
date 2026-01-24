import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

function formatDate(value?: string | null) {
  if (!value) return 'TBD';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

type TourDetailParams = {
  params: { id: string };
};

type ProductRow = {
  id: string;
  sku: string;
  description: string;
};

export default async function TourDetailPage({ params }: TourDetailParams) {
  const { data: tour } = await supabase
    .from('tours')
    .select('id, name, artist, start_date, end_date, status')
    .eq('id', params.id)
    .maybeSingle();

  if (!tour) {
    notFound();
  }

  const { data: showSales } = await supabase
    .from('show_sales_per_head')
    .select('total_gross, attendance')
    .eq('tour_id', params.id);

  const totalGross = (showSales ?? []).reduce(
    (sum, row) => sum + Number(row.total_gross ?? 0),
    0
  );
  const totalAttendance = (showSales ?? []).reduce(
    (sum, row) => sum + Number(row.attendance ?? 0),
    0
  );
  const perHead = totalAttendance ? totalGross / totalAttendance : 0;

  const { data: inventory } = await supabase
    .from('inventory_balances')
    .select('product_id, size, total_received, total_sold, total_comps, balance')
    .eq('tour_id', params.id);

  const { data: cogs } = await supabase
    .from('cogs_summary')
    .select(
      'product_id, size, total_sold, total_gross, total_cogs, gross_margin, full_package_cost'
    )
    .eq('tour_id', params.id);

  const productIds = Array.from(
    new Set(
      [...(inventory ?? []), ...(cogs ?? [])]
        .map((row) => row.product_id)
        .filter(Boolean)
    )
  ) as string[];

  const { data: products } = productIds.length
    ? await supabase
        .from('products')
        .select('id, sku, description')
        .in('id', productIds)
    : { data: [] as ProductRow[] };

  const productMap = new Map(
    (products ?? []).map((product) => [product.id, product])
  );

  const { data: shows } = await supabase
    .from('shows')
    .select('id')
    .eq('tour_id', params.id);

  let designAssets: any[] = [];
  const { data: designs, error: designError } = await supabase
    .from('design_assets')
    .select('id, tour_id, product_id, sku, storage_path, asset_type, is_primary')
    .eq('tour_id', params.id);

  if (!designError) {
    designAssets = designs ?? [];
  }

  const totalBalance = (inventory ?? []).reduce(
    (sum, row) => sum + Number(row.balance ?? 0),
    0
  );

  const cogsSorted = [...(cogs ?? [])].sort(
    (a, b) => Number(b.total_gross ?? 0) - Number(a.total_gross ?? 0)
  );

  const inventorySorted = [...(inventory ?? [])].sort(
    (a, b) => Number(b.balance ?? 0) - Number(a.balance ?? 0)
  );

  const topSellers = cogsSorted.slice(0, 5);

  return (
    <div className="g-container py-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/"
            className="text-sm font-medium g-link"
          >
            ← Back to dashboard
          </Link>
          <h1 className="text-3xl font-semibold g-title mt-3">
            {tour.name}
          </h1>
          <p className="text-sm text-[var(--g-text-dim)] mt-1">
            {tour.artist}
          </p>
          <p className="text-sm text-[var(--g-text-muted)] mt-2">
            {formatDate(tour.start_date)} — {formatDate(tour.end_date)}
          </p>
        </div>
        <div className="g-kicker">
          {tour.status}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <div className="g-card p-4">
          <p className="text-xs text-[var(--g-text-muted)]">Total gross</p>
          <p className="text-2xl font-semibold mt-2">
            {currencyFormatter.format(totalGross)}
          </p>
        </div>
        <div className="g-card p-4">
          <p className="text-xs text-[var(--g-text-muted)]">Per-head</p>
          <p className="text-2xl font-semibold mt-2">
            {currencyFormatter.format(perHead)}
          </p>
        </div>
        <div className="g-card p-4">
          <p className="text-xs text-[var(--g-text-muted)]">Shows logged</p>
          <p className="text-2xl font-semibold mt-2">
            {shows?.length ?? 0}
          </p>
        </div>
        <div className="g-card p-4">
          <p className="text-xs text-[var(--g-text-muted)]">Inventory balance</p>
          <p className="text-2xl font-semibold mt-2">
            {formatNumber(totalBalance)} units
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-10">
        <section className="g-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold g-title">Top sellers</h2>
            <Link
              href="/upload/sales-report"
              className="text-sm font-medium g-link"
            >
              Add sales
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            {topSellers.length === 0 ? (
              <p className="text-sm text-[var(--g-text-muted)]">
                No sales data yet. Upload a sales report to populate insights.
              </p>
            ) : (
              topSellers.map((row) => {
                const product = productMap.get(row.product_id);
                return (
                  <div
                    key={`${row.product_id}-${row.size}`}
                    className="border border-white/10 rounded-md p-3"
                  >
                    <p className="text-sm font-semibold">
                      {product?.sku ?? 'SKU'} · {row.size}
                    </p>
                    <p className="text-xs text-[var(--g-text-muted)]">
                      {product?.description ?? 'Description pending'}
                    </p>
                    <div className="flex items-center justify-between text-sm text-[var(--g-text-dim)] mt-2">
                      <span>{formatNumber(Number(row.total_sold ?? 0))} sold</span>
                      <span className="font-medium text-white">
                        {currencyFormatter.format(Number(row.total_gross ?? 0))}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="g-card p-6">
          <h2 className="text-lg font-semibold g-title">Projections</h2>
          <p className="text-sm text-[var(--g-text-muted)] mt-2">
            Forecast scenarios will live here once you define per-head rates,
            product mix ratios, and size curves.
          </p>
          <div className="mt-4 p-4 border border-dashed border-white/10 rounded-md text-sm text-[var(--g-text-muted)]">
            No projection scenarios yet. Add a scenario to compare forecasted
            units and revenue against actuals.
          </div>
        </section>

        <section className="g-card p-6">
          <h2 className="text-lg font-semibold g-title">Grab sheet</h2>
          <p className="text-sm text-[var(--g-text-muted)] mt-2">
            Add design assets to quickly preview merch layouts for this tour.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {designAssets.length === 0 ? (
              <div className="col-span-2 text-sm text-[var(--g-text-muted)] border border-dashed border-white/10 rounded-md p-4">
                No design assets uploaded yet.
              </div>
            ) : (
              designAssets.slice(0, 4).map((asset) => {
                const product = productMap.get(asset.product_id);
                return (
                  <div
                    key={asset.id}
                    className="border border-white/10 rounded-md overflow-hidden"
                  >
                    <div className="h-28 bg-black/40 flex items-center justify-center text-xs text-[var(--g-text-muted)]">
                      {asset.storage_path}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-semibold">
                        {product?.sku ?? asset.sku ?? 'SKU'}
                      </p>
                      <p className="text-[11px] text-[var(--g-text-muted)]">
                        {asset.asset_type ?? 'asset'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <section className="g-card p-6 mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold g-title">COGS report</h2>
          <Link
            href="/upload/po"
            className="text-sm font-medium g-link"
          >
            Upload PO
          </Link>
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm g-table">
            <thead className="text-left border-b border-white/10">
              <tr>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Size</th>
                <th className="py-2 pr-4">Units sold</th>
                <th className="py-2 pr-4">Gross</th>
                <th className="py-2 pr-4">COGS</th>
                <th className="py-2 pr-4">Margin</th>
              </tr>
            </thead>
            <tbody>
              {cogsSorted.length === 0 ? (
                <tr>
                  <td className="py-3" colSpan={6}>
                    No COGS data yet. Upload sales and cost data.
                  </td>
                </tr>
              ) : (
                cogsSorted.slice(0, 20).map((row) => {
                  const product = productMap.get(row.product_id);
                  return (
                    <tr
                      key={`${row.product_id}-${row.size}`}
                      className="border-b border-white/10"
                    >
                      <td className="py-3 pr-4">
                        <div className="font-semibold">
                          {product?.sku ?? 'SKU'}
                        </div>
                        <div className="text-xs text-[var(--g-text-muted)]">
                          {product?.description ?? 'Description pending'}
                        </div>
                      </td>
                      <td className="py-3 pr-4">{row.size}</td>
                      <td className="py-3 pr-4">
                        {formatNumber(Number(row.total_sold ?? 0))}
                      </td>
                      <td className="py-3 pr-4">
                        {currencyFormatter.format(Number(row.total_gross ?? 0))}
                      </td>
                      <td className="py-3 pr-4">
                        {currencyFormatter.format(Number(row.total_cogs ?? 0))}
                      </td>
                      <td className="py-3 pr-4">
                        {currencyFormatter.format(Number(row.gross_margin ?? 0))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="g-card p-6 mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold g-title">Inventory balances</h2>
          <Link
            href="/upload/packing-list"
            className="text-sm font-medium g-link"
          >
            Upload packing list
          </Link>
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm g-table">
            <thead className="text-left border-b border-white/10">
              <tr>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Size</th>
                <th className="py-2 pr-4">Received</th>
                <th className="py-2 pr-4">Sold</th>
                <th className="py-2 pr-4">Comps</th>
                <th className="py-2 pr-4">Balance</th>
              </tr>
            </thead>
            <tbody>
              {inventorySorted.length === 0 ? (
                <tr>
                  <td className="py-3" colSpan={6}>
                    No inventory data yet.
                  </td>
                </tr>
              ) : (
                inventorySorted.slice(0, 20).map((row) => {
                  const product = productMap.get(row.product_id);
                  return (
                    <tr
                      key={`${row.product_id}-${row.size}`}
                      className="border-b border-white/10"
                    >
                      <td className="py-3 pr-4">
                        <div className="font-semibold">
                          {product?.sku ?? 'SKU'}
                        </div>
                        <div className="text-xs text-[var(--g-text-muted)]">
                          {product?.description ?? 'Description pending'}
                        </div>
                      </td>
                      <td className="py-3 pr-4">{row.size}</td>
                      <td className="py-3 pr-4">
                        {formatNumber(Number(row.total_received ?? 0))}
                      </td>
                      <td className="py-3 pr-4">
                        {formatNumber(Number(row.total_sold ?? 0))}
                      </td>
                      <td className="py-3 pr-4">
                        {formatNumber(Number(row.total_comps ?? 0))}
                      </td>
                      <td className="py-3 pr-4 font-semibold">
                        {formatNumber(Number(row.balance ?? 0))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
