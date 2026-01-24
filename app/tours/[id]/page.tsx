import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { PurchaseOrdersPanel } from '@/components/tours/PurchaseOrdersPanel';
import { StockMovementPanel } from '@/components/tours/StockMovementPanel';
import { NeedsReviewPanel } from '@/components/tours/NeedsReviewPanel';

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

type ShowSummaryRow = {
  show_id: string;
  show_date: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  total_gross: number | null;
  attendance: number | null;
  per_head: number | null;
  total_comps: number | null;
};

type ProductSummaryRow = {
  product_id: string;
  sku: string;
  description: string;
  size: string | null;
  total_sold: number | null;
  total_gross: number | null;
  total_cogs: number | null;
  gross_margin: number | null;
  full_package_cost: number | null;
};

type PurchaseOrderRow = {
  id: string;
  po_number: string;
  vendor: string;
  status: string;
  order_date: string | null;
  expected_delivery: string | null;
  total_amount: number | null;
};

type OpenQtyRow = {
  po_id: string;
  po_line_item_id: string;
  sku: string;
  description: string;
  size: string | null;
  quantity_ordered: number;
  quantity_received: number;
  open_quantity: number;
};

type StockMovementRow = {
  received_date: string | null;
  delivery_number: string | null;
  sku: string;
  size: string | null;
  quantity_received: number;
  vendor: string | null;
};

type ParsedDocumentRow = {
  id: string;
  doc_type: string;
  status: string;
  source_filename: string | null;
  updated_at: string | null;
};

type ForecastOverrideRow = {
  sku: string;
  size: string | null;
  bucket: string | null;
  override_units: number | null;
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

  const { data: showSummary } = await supabase
    .from('show_summary_view')
    .select(
      'show_id, show_date, venue_name, city, state, total_gross, attendance, per_head, total_comps'
    )
    .eq('tour_id', params.id)
    .order('show_date', { ascending: true });

  const totalGross = (showSummary ?? []).reduce(
    (sum, row) => sum + Number(row.total_gross ?? 0),
    0
  );
  const totalAttendance = (showSummary ?? []).reduce(
    (sum, row) => sum + Number(row.attendance ?? 0),
    0
  );
  const perHead = totalAttendance ? totalGross / totalAttendance : 0;

  const { data: inventory } = await supabase
    .from('inventory_balances')
    .select('product_id, size, total_received, total_sold, total_comps, balance')
    .eq('tour_id', params.id);

  const { data: cogs } = await supabase
    .from('product_summary_view')
    .select(
      'product_id, sku, description, size, total_sold, total_gross, total_cogs, gross_margin, full_package_cost'
    )
    .eq('tour_id', params.id);

  const productIds = Array.from(
    new Set(
      [...(inventory ?? []), ...(cogs ?? [])]
        .map((row) => row.product_id)
        .filter(Boolean)
    )
  ) as string[];

  const { data: tourProducts } = await supabase
    .from('tour_products')
    .select('product_id, size, full_package_cost, suggested_retail')
    .eq('tour_id', params.id);

  const { data: products } = productIds.length
    ? await supabase
        .from('products')
        .select('id, sku, description')
        .in('id', productIds)
    : { data: [] as ProductRow[] };

  const productMap = new Map(
    (products ?? []).map((product) => [product.id, product])
  );

  const skuToProductId = new Map(
    (products ?? []).map((product) => [product.sku, product.id])
  );

  const costByKey = new Map<string, number>();
  const retailByKey = new Map<string, number>();
  const retailByProduct = new Map<string, number>();

  (tourProducts ?? []).forEach((row) => {
    const key = `${row.product_id}:${row.size ?? ''}`;
    if (row.full_package_cost !== null) {
      costByKey.set(key, Number(row.full_package_cost));
    }
    if (row.suggested_retail !== null) {
      retailByKey.set(key, Number(row.suggested_retail));
      if (!retailByProduct.has(row.product_id)) {
        retailByProduct.set(row.product_id, Number(row.suggested_retail));
      }
    }
  });

  const { data: purchaseOrders } = await supabase
    .from('purchase_orders')
    .select('id, po_number, vendor, status, order_date, expected_delivery, total_amount')
    .eq('tour_id', params.id)
    .order('order_date', { ascending: false });

  const { data: openQuantities } = await supabase
    .from('po_open_qty_view')
    .select(
      'po_id, po_line_item_id, sku, description, size, quantity_ordered, quantity_received, open_quantity'
    )
    .eq('tour_id', params.id);

  const { data: stockMovement } = await supabase
    .from('stock_movement_view')
    .select('received_date, delivery_number, sku, size, quantity_received, vendor')
    .eq('tour_id', params.id)
    .order('received_date', { ascending: false });

  const { data: needsReview } = await supabase
    .from('parsed_documents')
    .select('id, doc_type, status, source_filename, updated_at')
    .eq('tour_id', params.id)
    .in('status', ['draft', 'error', 'approved'])
    .order('updated_at', { ascending: false });

  const { data: baselineScenario } = await supabase
    .from('forecast_scenarios')
    .select('id, name, is_baseline')
    .eq('tour_id', params.id)
    .eq('is_baseline', true)
    .maybeSingle();

  const { data: forecastOverrides } = baselineScenario
    ? await supabase
        .from('forecast_overrides')
        .select('sku, size, bucket, override_units')
        .eq('scenario_id', baselineScenario.id)
    : { data: [] as ForecastOverrideRow[] };

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

  const forecastUnits = (forecastOverrides ?? []).reduce((sum, row) => {
    if (row.bucket) return sum;
    return sum + Number(row.override_units ?? 0);
  }, 0);

  const forecastGross = (forecastOverrides ?? []).reduce((sum, row) => {
    if (row.bucket) return sum;
    const productId = skuToProductId.get(row.sku);
    if (!productId) return sum;
    const sizeKey = `${productId}:${row.size ?? ''}`;
    const price =
      (row.size ? retailByKey.get(sizeKey) : undefined) ??
      retailByProduct.get(productId) ??
      0;
    return sum + Number(row.override_units ?? 0) * price;
  }, 0);

  const forecastBySku = new Map<string, number>();
  (forecastOverrides ?? []).forEach((row) => {
    if (row.bucket) return;
    forecastBySku.set(
      row.sku,
      (forecastBySku.get(row.sku) ?? 0) + Number(row.override_units ?? 0)
    );
  });

  const topForecasted = Array.from(forecastBySku.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

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
            {showSummary?.length ?? 0}
          </p>
        </div>
        <div className="g-card p-4">
          <p className="text-xs text-[var(--g-text-muted)]">Inventory balance</p>
          <p className="text-2xl font-semibold mt-2">
            {formatNumber(totalBalance)} units
          </p>
        </div>
      </div>

      <section className="g-card p-6 mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold g-title">Shows</h2>
          <Link href="/upload/sales-report" className="text-sm font-medium g-link">
            Add show sales
          </Link>
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm g-table">
            <thead className="text-left border-b border-white/10">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Venue</th>
                <th className="py-2 pr-4">City</th>
                <th className="py-2 pr-4 text-right">Gross</th>
                <th className="py-2 pr-4 text-right">Per-head</th>
                <th className="py-2 pr-4 text-right">Comps</th>
              </tr>
            </thead>
            <tbody>
              {(showSummary ?? []).length === 0 ? (
                <tr>
                  <td className="py-3" colSpan={6}>
                    No shows logged yet.
                  </td>
                </tr>
              ) : (
                (showSummary as ShowSummaryRow[]).map((show) => (
                  <tr key={show.show_id} className="border-b border-white/10">
                    <td className="py-3 pr-4">
                      <Link
                        className="g-link"
                        href={`/tours/${tour.id}/shows/${show.show_id}`}
                      >
                        {formatDate(show.show_date)}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">{show.venue_name ?? 'TBD'}</td>
                    <td className="py-3 pr-4">
                      {show.city ?? '—'}
                      {show.state ? `, ${show.state}` : ''}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {currencyFormatter.format(Number(show.total_gross ?? 0))}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {currencyFormatter.format(Number(show.per_head ?? 0))}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {formatNumber(Number(show.total_comps ?? 0))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold g-title">Projections</h2>
            <Link
              href={`/tours/${tour.id}/projections`}
              className="text-sm font-medium g-link"
            >
              Open sheet
            </Link>
          </div>
          {baselineScenario ? (
            <div className="mt-4 space-y-3 text-sm">
              <p className="text-[var(--g-text-muted)]">
                Baseline scenario: <span className="text-white">{baselineScenario.name}</span>
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-white/10 rounded-md p-3">
                  <p className="text-xs text-[var(--g-text-muted)]">Forecast units</p>
                  <p className="text-lg font-semibold mt-1">{formatNumber(forecastUnits)}</p>
                </div>
                <div className="border border-white/10 rounded-md p-3">
                  <p className="text-xs text-[var(--g-text-muted)]">Forecast gross</p>
                  <p className="text-lg font-semibold mt-1">
                    {currencyFormatter.format(forecastGross)}
                  </p>
                </div>
              </div>
              {topForecasted.length === 0 ? (
                <p className="text-xs text-[var(--g-text-muted)]">
                  No overrides saved yet. Open the sheet to plan units.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--g-text-muted)]">Top forecasted SKUs</p>
                  {topForecasted.map(([sku, units]) => (
                    <div key={sku} className="flex items-center justify-between">
                      <span className="text-sm">{sku}</span>
                      <span className="text-sm text-[var(--g-text-dim)]">
                        {formatNumber(units)} units
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 p-4 border border-dashed border-white/10 rounded-md text-sm text-[var(--g-text-muted)]">
              No projection scenarios yet. Add a scenario to compare forecasted units and revenue.
            </div>
          )}
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-10">
        <PurchaseOrdersPanel
          purchaseOrders={(purchaseOrders ?? []) as PurchaseOrderRow[]}
          openQuantities={(openQuantities ?? []) as OpenQtyRow[]}
        />
        <StockMovementPanel rows={(stockMovement ?? []) as StockMovementRow[]} />
        <NeedsReviewPanel documents={(needsReview ?? []) as ParsedDocumentRow[]} />
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
                (cogsSorted as ProductSummaryRow[]).slice(0, 20).map((row) => {
                  const product = productMap.get(row.product_id);
                  return (
                    <tr
                      key={`${row.product_id}-${row.size}`}
                      className="border-b border-white/10"
                    >
                      <td className="py-3 pr-4">
                        <div className="font-semibold">
                          {row.sku ?? product?.sku ?? 'SKU'}
                        </div>
                        <div className="text-xs text-[var(--g-text-muted)]">
                          {row.description ?? product?.description ?? 'Description pending'}
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
                <th className="py-2 pr-4">Unit cost</th>
                <th className="py-2 pr-4">Inventory value</th>
              </tr>
            </thead>
            <tbody>
              {inventorySorted.length === 0 ? (
                <tr>
                  <td className="py-3" colSpan={8}>
                    No inventory data yet.
                  </td>
                </tr>
              ) : (
                inventorySorted.slice(0, 20).map((row) => {
                  const product = productMap.get(row.product_id);
                  const costKey = `${row.product_id}:${row.size ?? ''}`;
                  const unitCost = costByKey.get(costKey) ?? 0;
                  const inventoryValue = Number(row.balance ?? 0) * unitCost;
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
                      <td className="py-3 pr-4">
                        {unitCost ? currencyFormatter.format(unitCost) : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        {unitCost ? currencyFormatter.format(inventoryValue) : '—'}
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
