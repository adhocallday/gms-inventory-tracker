import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/client';
import { PurchaseOrdersPanel } from '@/components/tours/PurchaseOrdersPanel';
import { StockMovementPanel } from '@/components/tours/StockMovementPanel';
import { NeedsReviewPanel } from '@/components/tours/NeedsReviewPanel';
import ProductGrid, { ProductCardData } from '@/components/tours/ProductGrid';
import ShowsTable, { ShowSummaryRow } from '@/components/tours/ShowsTable';
import TopSellersPanel from '@/components/tours/TopSellersPanel';
import { CogsTable, type CogsRow } from '@/components/tours/CogsTable';
import { InventoryTable } from '@/components/tours/InventoryTable';
import { Badge } from '@/components/ui/Badge';
import { formatDate as formatDay } from '@/lib/format';
import { ArrowLeft, ArrowRight, BarChart3, DollarSign, Package, SettingsIcon, Tag, TrendingUp } from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

function formatDate(value?: string | null) {
  return formatDay(value, undefined, 'not set');
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

const tabClass =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]';

type TourDetailParams = {
  params: { id: string };
};

type ProductRow = {
  id: string;
  sku: string;
  description: string;
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

// Cached for 30s; posting a document refreshes it immediately (lib/cache/revalidate.ts)
export const revalidate = 30;

export default async function TourDetailPage({ params }: TourDetailParams) {
  const supabase = createServiceClient();

  // Independent queries run in parallel (they used to run one after another)
  const [
    { data: tour },
    { data: showSummary },
    { data: inventory },
    { data: cogs },
    { data: tourProducts },
    { data: purchaseOrders },
    { data: openQuantities },
    { data: stockMovement },
    { data: needsReview },
    { data: baselineScenario },
    { data: designs, error: designError },
  ] = await Promise.all([
    supabase
      .from('tours')
      .select('id, name, artist, start_date, end_date, status')
      .eq('id', params.id)
      .maybeSingle(),
    supabase
      .from('show_summary_view')
      .select(
        'show_id, show_date, venue_name, city, state, total_gross, attendance, per_head, total_comps'
      )
      .eq('tour_id', params.id)
      .order('show_date', { ascending: true }),
    supabase
      .from('inventory_balances')
      .select('product_id, size, total_received, total_sold, total_comps, balance')
      .eq('tour_id', params.id),
    supabase
      .from('product_summary_view')
      .select(
        'product_id, sku, description, size, total_sold, total_gross, total_cogs, gross_margin, full_package_cost'
      )
      .eq('tour_id', params.id),
    supabase
      .from('tour_products')
      .select('product_id, size, full_package_cost, suggested_retail')
      .eq('tour_id', params.id),
    supabase
      .from('purchase_orders')
      .select('id, po_number, vendor, status, order_date, expected_delivery, total_amount')
      .eq('tour_id', params.id)
      .order('order_date', { ascending: false }),
    supabase
      .from('po_open_qty_view')
      .select(
        'po_id, po_line_item_id, sku, description, size, quantity_ordered, quantity_received, open_quantity'
      )
      .eq('tour_id', params.id),
    supabase
      .from('stock_movement_view')
      .select('received_date, delivery_number, sku, size, quantity_received, vendor')
      .eq('tour_id', params.id)
      .order('received_date', { ascending: false }),
    supabase
      .from('parsed_documents')
      .select('id, doc_type, status, source_filename, updated_at')
      .eq('tour_id', params.id)
      .in('status', ['draft', 'error', 'approved'])
      .order('updated_at', { ascending: false }),
    supabase
      .from('forecast_scenarios')
      .select('id, name, is_baseline')
      .eq('tour_id', params.id)
      .eq('is_baseline', true)
      .maybeSingle(),
    supabase
      .from('design_assets')
      .select('id, tour_id, product_id, sku, storage_path, asset_type, is_primary')
      .eq('tour_id', params.id),
  ]);

  if (!tour) {
    notFound();
  }

  const designAssets: any[] = designError ? [] : designs ?? [];



  const totalGross = (showSummary ?? []).reduce(
    (sum, row) => sum + Number(row.total_gross ?? 0),
    0
  );
  const totalAttendance = (showSummary ?? []).reduce(
    (sum, row) => sum + Number(row.attendance ?? 0),
    0
  );
  const perHead = totalAttendance ? totalGross / totalAttendance : 0;
  const showsWithSales = (showSummary ?? []).filter((row) => Number(row.total_gross ?? 0) > 0).length;



  const productIds = Array.from(
    new Set(
      [...(inventory ?? []), ...(cogs ?? [])]
        .map((row) => row.product_id)
        .filter(Boolean)
    )
  ) as string[];



  // Second wave: queries that depend on the first wave's results
  const [{ data: products }, { data: forecastOverrides }] = await Promise.all([
    productIds.length
      ? supabase
          .from('products')
          .select('id, sku, description')
          .in('id', productIds)
      : Promise.resolve({ data: [] as ProductRow[] }),
    baselineScenario
      ? supabase
          .from('forecast_overrides')
          .select('sku, size, bucket, override_units')
          .eq('scenario_id', baselineScenario.id)
      : Promise.resolve({ data: [] as ForecastOverrideRow[] }),
  ]);

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

  const inventoryMap = new Map<string, number>();
  (inventory ?? []).forEach((row) => {
    const key = `${row.product_id}:${row.size ?? ''}`;
    inventoryMap.set(key, Number(row.balance ?? 0));
  });

  const productCards: ProductCardData[] = (cogs ?? []).map((row) => {
    const key = `${row.product_id}:${row.size ?? ''}`;
    const balance = inventoryMap.get(key) ?? 0;
    const unitValue = row.full_package_cost ? Number(row.full_package_cost) : null;
    return {
      product_id: row.product_id,
      sku: row.sku,
      description: row.description,
      size: row.size,
      total_sold: Number(row.total_sold ?? 0),
      total_gross: Number(row.total_gross ?? 0),
      gross_margin: row.gross_margin ?? null,
      full_package_cost: row.full_package_cost ?? null,
      balance,
      unit_value: unitValue
    };
  });








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
    <div className="g-container py-6">
      <div>
        <Link href="/" className="text-sm font-medium g-link">
          <ArrowLeft className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" />
          Tours
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px] lg:leading-9">{tour.name}</h1>
          <Badge variant={tour.status as never}>{tour.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)] tabular-nums">
          {tour.artist} · {formatDate(tour.start_date)} – {formatDate(tour.end_date)}
        </p>
      </div>

      {/* Navigation Tabs */}
      <nav data-tour="tour-tabs" aria-label="Tour pages" className="flex gap-1 mt-6 border-b border-[var(--color-bg-border)] pb-2 overflow-x-auto">
        <Link
          href={`/tours/${tour.id}/projections`}
          data-tour="tab-projections"
          className={tabClass}
        >
          <BarChart3 className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" /> Projections
        </Link>
        <Link
          href={`/tours/${tour.id}/reports`}
          data-tour="tab-reports"
          className={tabClass}
        >
          <TrendingUp className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" /> Reports
        </Link>
        <Link
          href={`/tours/${tour.id}/inventory`}
          data-tour="inventory"
          className={tabClass}
        >
          <Package className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" /> Inventory
        </Link>
        <Link
          href={`/tours/${tour.id}/cogs`}
          data-tour="tab-cogs"
          className={tabClass}
        >
          <DollarSign className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" /> COGS
        </Link>
        <Link
          href={`/admin/tours/${tour.id}/products`}
          className={tabClass}
        >
          <Tag className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" /> Product costs
        </Link>
        <Link
          href={`/tours/${tour.id}/settings/warehouses`}
          className={tabClass}
        >
          <SettingsIcon className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" /> Warehouses
        </Link>
      </nav>

      <div data-tour="tour-kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        <div className="g-card p-4">
          <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">Gross sales</p>
          <p className="text-xl sm:text-2xl font-semibold mt-1 tabular-nums">
            {currencyFormatter.format(totalGross)}
          </p>
        </div>
        <div className="g-card p-4">
          <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">Per head</p>
          <p className="text-xl sm:text-2xl font-semibold mt-1 tabular-nums">
            {currencyFormatter.format(perHead)}
          </p>
        </div>
        <div className="g-card p-4">
          <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">Shows with sales</p>
          <p className="text-xl sm:text-2xl font-semibold mt-1 tabular-nums">
            {showsWithSales}
            <span className="ml-1 text-sm font-normal text-[var(--color-text-secondary)]">of {showSummary?.length ?? 0}</span>
          </p>
        </div>
        <div className="g-card p-4">
          <p className="text-[13px] font-medium text-[var(--color-text-secondary)]">Units on hand</p>
          <p className="text-xl sm:text-2xl font-semibold mt-1 tabular-nums">
            {formatNumber(totalBalance)}
          </p>
        </div>
      </div>

      <div data-tour="tour-shows">
        <ShowsTable tourId={tour.id} shows={showSummary as ShowSummaryRow[]} />
      </div>

      <div data-tour="tour-products">
        <ProductGrid tourId={tour.id} products={productCards} />
      </div>

      {/* Business Insights Section */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-4">Sales and planning</h2>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <TopSellersPanel tourId={tour.id} topSellers={cogsSorted} productMap={productMap} />

        <section className="g-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Projections</h2>
            <Link
              href={`/tours/${tour.id}/projections`}
              className="text-sm font-medium g-link"
            >
              Open sheet
            </Link>
          </div>
          {baselineScenario ? (
            <div className="mt-4 space-y-3 text-sm">
              <p className="text-[var(--color-text-secondary)]">
                Baseline scenario: <span className="text-[var(--color-text-primary)]">{baselineScenario.name}</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-[var(--color-bg-border)] rounded-md p-3">
                  <p className="text-xs text-[var(--color-text-secondary)]">Forecast units</p>
                  <p className="text-lg font-semibold mt-1 tabular-nums">{formatNumber(forecastUnits)}</p>
                </div>
                <div className="border border-[var(--color-bg-border)] rounded-md p-3">
                  <p className="text-xs text-[var(--color-text-secondary)]">Forecast gross</p>
                  {forecastGross === 0 && forecastUnits > 0 ? (
                    <p className="text-sm font-medium mt-1 text-[var(--color-text-secondary)]">
                      No retail prices set
                    </p>
                  ) : (
                    <p className="text-lg font-semibold mt-1 tabular-nums">
                      {currencyFormatter.format(forecastGross)}
                    </p>
                  )}
                </div>
              </div>
              {topForecasted.length === 0 ? (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  No overrides saved yet. Open the sheet to plan units.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--color-text-secondary)]">Top forecasted SKUs</p>
                  {topForecasted.map(([sku, units]) => (
                    <div key={sku} className="flex items-center justify-between">
                      <span className="text-sm">{sku}</span>
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        {formatNumber(units)} units
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 p-4 border border-dashed border-[var(--color-bg-border)] rounded-md text-sm text-[var(--color-text-secondary)]">
              No projection scenario yet. Open the sheet to create one.
            </div>
          )}
        </section>

        <section className="g-card p-5">
          <h2 className="text-base font-semibold">Grab sheet</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            Design images for this tour&apos;s products.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {designAssets.length === 0 ? (
              <div className="sm:col-span-2 text-sm text-[var(--color-text-secondary)] border border-dashed border-[var(--color-bg-border)] rounded-md p-4">
                No design images uploaded for this tour.
              </div>
            ) : (
              designAssets.slice(0, 4).map((asset) => {
                const product = productMap.get(asset.product_id);
                return (
                  <div
                    key={asset.id}
                    className="border border-[var(--color-bg-border)] rounded-md overflow-hidden"
                  >
                    <div className="h-28 bg-[var(--color-bg-elevated)] flex items-center justify-center text-xs text-[var(--color-text-secondary)]">
                      {asset.storage_path}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-semibold">
                        {product?.sku ?? asset.sku ?? 'SKU'}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-secondary)]">
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
      </section>

      {/* Detailed Data Section */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-4">Top 10 by gross and by stock</h2>

        <div className="g-card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">COGS, top 10 by gross</h3>
            <Link href={`/tours/${tour.id}/cogs`} className="text-sm font-medium g-link">
              All products <ArrowRight className="inline-block h-4 w-4 align-[-0.125em] ml-1" aria-hidden="true" />
            </Link>
          </div>
          <CogsTable data={cogsSorted.slice(0, 10) as CogsRow[]} />
        </div>

        <div className="g-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Inventory, top 10 by units on hand</h3>
            <Link href={`/tours/${tour.id}/inventory`} className="text-sm font-medium g-link">
              All products <ArrowRight className="inline-block h-4 w-4 align-[-0.125em] ml-1" aria-hidden="true" />
            </Link>
          </div>
          <InventoryTable
            data={inventorySorted.slice(0, 10).map((row) => {
              const product = productMap.get(row.product_id);
              const costKey = `${row.product_id}:${row.size ?? ''}`;
              const unitCost = costByKey.get(costKey) ?? 0;
              const inventoryValue = Number(row.balance ?? 0) * unitCost;
              return {
                ...row,
                sku: product?.sku ?? 'SKU',
                description: product?.description ?? 'No description',
                unit_cost: unitCost,
                inventory_value: inventoryValue,
              };
            })}
          />
        </div>
      </section>

      {/* Operations Section */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-4">Purchasing and receiving</h2>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <PurchaseOrdersPanel
            purchaseOrders={(purchaseOrders ?? []) as PurchaseOrderRow[]}
            openQuantities={(openQuantities ?? []) as OpenQtyRow[]}
          />
          <StockMovementPanel rows={(stockMovement ?? []) as StockMovementRow[]} />
          <NeedsReviewPanel documents={(needsReview ?? []) as ParsedDocumentRow[]} />
        </div>
      </section>
    </div>
  );
}
