import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/client';

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

function normalizeProduct(
  product?: { sku: string; description: string } | { sku: string; description: string }[] | null
) {
  if (!product) return null;
  return Array.isArray(product) ? product[0] : product;
}

type ShowDetailParams = {
  params: { id: string; showId: string };
};

type TourProductRow = {
  id: string;
  size: string | null;
  product?: { sku: string; description: string } | { sku: string; description: string }[] | null;
};

type SalesRow = {
  show_id: string;
  qty_sold: number;
  unit_price: number;
  gross_sales: number;
  tour_product: TourProductRow | null;
};

type CompRow = {
  show_id: string;
  comp_type: string;
  quantity: number;
  tour_product: TourProductRow | null;
};

type ReceiptRow = {
  received_date: string | null;
  sku: string;
  size: string | null;
  quantity_received: number;
  delivery_number: string | null;
  vendor: string | null;
};

export default async function ShowDetailPage({ params }: ShowDetailParams) {
  const supabase = createServiceClient();

  const { data: tour } = await supabase
    .from('tours')
    .select('id, name, artist')
    .eq('id', params.id)
    .maybeSingle();

  const { data: show } = await supabase
    .from('shows')
    .select('id, tour_id, show_date, venue_name, city, state, attendance')
    .eq('id', params.showId)
    .maybeSingle();

  if (!tour || !show || show.tour_id !== tour.id) {
    notFound();
  }

  const { data: sales } = await supabase
    .from('sales')
    .select(
      'show_id, qty_sold, unit_price, gross_sales, tour_product:tour_products(id, size, product:products(sku, description))'
    )
    .eq('show_id', params.showId);

  const { data: comps } = await supabase
    .from('comps')
    .select(
      'show_id, comp_type, quantity, tour_product:tour_products(id, size, product:products(sku, description))'
    )
    .eq('show_id', params.showId);

  const { data: tourProducts } = await supabase
    .from('tour_products')
    .select('id, size, product:products(sku, description)')
    .eq('tour_id', params.id);

  const { data: tourShows } = await supabase
    .from('shows')
    .select('id, show_date')
    .eq('tour_id', params.id);

  const { data: receipts } = await supabase
    .from('stock_movement_view')
    .select('received_date, delivery_number, sku, size, quantity_received, vendor')
    .eq('tour_id', params.id);

  const { data: settlementDocs } = await supabase
    .from('parsed_documents')
    .select('id, status, normalized_json, ui_overrides, extracted_json, updated_at')
    .eq('doc_type', 'settlement')
    .eq('show_id', params.showId)
    .order('updated_at', { ascending: false })
    .limit(1);

  const settlementDoc = settlementDocs?.[0];
  const settlementSource =
    settlementDoc?.ui_overrides ??
    settlementDoc?.normalized_json ??
    settlementDoc?.extracted_json ??
    {};

  const salesRows = (sales ?? []) as unknown as SalesRow[];
  const compRows = (comps ?? []) as unknown as CompRow[];
  const tourProductRows = (tourProducts ?? []) as unknown as TourProductRow[];

  const showDate = show.show_date ? new Date(show.show_date) : null;
  const sortedShows = (tourShows ?? [])
    .filter((row) => row.show_date)
    .sort((a, b) => (a.show_date ?? '').localeCompare(b.show_date ?? ''));
  const currentIndex = sortedShows.findIndex((row) => row.id === show.id);
  const previousShowDate =
    currentIndex > 0 ? sortedShows[currentIndex - 1].show_date ?? null : null;

  const showDateMap = new Map<string, string>();
  (tourShows ?? []).forEach((row) => {
    if (row.show_date) showDateMap.set(row.id, row.show_date);
  });

  const currentSold = new Map<string, number>();
  const currentComps = new Map<string, number>();
  const soldBefore = new Map<string, number>();
  const compsBefore = new Map<string, number>();
  const soldUpTo = new Map<string, number>();
  const compsUpTo = new Map<string, number>();

  const allSales = (await supabase
    .from('sales')
    .select('show_id, qty_sold, tour_product_id')
    .in('show_id', (tourShows ?? []).map((row) => row.id))).data ?? [];

  allSales.forEach((row) => {
    const key = row.tour_product_id;
    const showDateValue = showDateMap.get(row.show_id);
    const qty = Number(row.qty_sold ?? 0);
    if (row.show_id === show.id) {
      currentSold.set(key, (currentSold.get(key) ?? 0) + qty);
    }
    if (showDate && showDateValue) {
      const rowDate = new Date(showDateValue);
      if (rowDate < showDate) {
        soldBefore.set(key, (soldBefore.get(key) ?? 0) + qty);
      }
      if (rowDate <= showDate) {
        soldUpTo.set(key, (soldUpTo.get(key) ?? 0) + qty);
      }
    }
  });

  const allComps = (await supabase
    .from('comps')
    .select('show_id, quantity, tour_product_id')
    .in('show_id', (tourShows ?? []).map((row) => row.id))).data ?? [];

  allComps.forEach((row) => {
    const key = row.tour_product_id;
    const showDateValue = showDateMap.get(row.show_id);
    const qty = Number(row.quantity ?? 0);
    if (row.show_id === show.id) {
      currentComps.set(key, (currentComps.get(key) ?? 0) + qty);
    }
    if (showDate && showDateValue) {
      const rowDate = new Date(showDateValue);
      if (rowDate < showDate) {
        compsBefore.set(key, (compsBefore.get(key) ?? 0) + qty);
      }
      if (rowDate <= showDate) {
        compsUpTo.set(key, (compsUpTo.get(key) ?? 0) + qty);
      }
    }
  });

  const receiptsByKey = new Map<string, ReceiptRow[]>();
  (receipts ?? []).forEach((row) => {
    const key = `${row.sku}:${row.size ?? ''}`;
    if (!receiptsByKey.has(key)) receiptsByKey.set(key, []);
    receiptsByKey.get(key)?.push(row);
  });

  const inventoryImpact = tourProductRows.map((tp) => {
    const product = normalizeProduct(tp.product);
    const key = `${product?.sku ?? 'SKU'}:${tp.size ?? ''}`;
    const receiptRows = receiptsByKey.get(key) ?? [];
    const receivedUpToPrev = showDate
      ? receiptRows.reduce((sum, row) => {
          if (!row.received_date) return sum;
          const rowDate = new Date(row.received_date);
          const cutoff = previousShowDate ? new Date(previousShowDate) : showDate;
          return rowDate <= cutoff ? sum + Number(row.quantity_received ?? 0) : sum;
        }, 0)
      : null;
    const receivedUpToCurrent = showDate
      ? receiptRows.reduce((sum, row) => {
          if (!row.received_date) return sum;
          const rowDate = new Date(row.received_date);
          return rowDate <= showDate ? sum + Number(row.quantity_received ?? 0) : sum;
        }, 0)
      : null;

    const soldBeforeQty = soldBefore.get(tp.id) ?? 0;
    const compsBeforeQty = compsBefore.get(tp.id) ?? 0;
    const soldUpToQty = soldUpTo.get(tp.id) ?? 0;
    const compsUpToQty = compsUpTo.get(tp.id) ?? 0;

    const startingBalance =
      receivedUpToPrev === null
        ? null
        : receivedUpToPrev - soldBeforeQty - compsBeforeQty;
    const endingBalance =
      receivedUpToCurrent === null
        ? null
        : receivedUpToCurrent - soldUpToQty - compsUpToQty;

    return {
      sku: product?.sku ?? 'SKU',
      description: product?.description ?? 'Description pending',
      size: tp.size ?? '—',
      soldThisShow: currentSold.get(tp.id) ?? 0,
      compsThisShow: currentComps.get(tp.id) ?? 0,
      startingBalance,
      endingBalance
    };
  });

  const receiptsBetween = (receipts ?? []).filter((row) => {
    if (!showDate || !row.received_date) return false;
    const rowDate = new Date(row.received_date);
    const lowerBound = previousShowDate ? new Date(previousShowDate) : null;
    if (lowerBound && rowDate <= lowerBound) return false;
    return rowDate <= showDate;
  });

  return (
    <div className="g-container py-12">
      <Link href={`/tours/${tour.id}`} className="text-sm font-medium g-link">
        ← Back to tour
      </Link>
      <div className="flex flex-col gap-4 mt-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold g-title">
            {tour.name} · {show.venue_name ?? 'Show Detail'}
          </h1>
          <p className="text-sm text-[var(--g-text-dim)] mt-1">
            {show.city ?? '—'} {show.state ? `, ${show.state}` : ''}
          </p>
          <p className="text-sm text-[var(--g-text-muted)] mt-2">
            {formatDate(show.show_date)} · {show.attendance ?? 0} attendance
          </p>
        </div>
        <div className="g-kicker">{tour.artist}</div>
      </div>

      <section className="g-card p-6 mt-10">
        <h2 className="text-lg font-semibold g-title">Sales lines</h2>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm g-table">
            <thead className="text-left border-b border-white/10">
              <tr>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Size</th>
                <th className="py-2 pr-4 text-right">Qty sold</th>
                <th className="py-2 pr-4 text-right">Unit price</th>
                <th className="py-2 pr-4 text-right">Gross</th>
              </tr>
            </thead>
            <tbody>
              {salesRows.length ? (
                salesRows.map((row, index) => {
                  const product = normalizeProduct(row.tour_product?.product);
                  return (
                    <tr key={`${row.show_id}-${index}`} className="border-b border-white/10">
                      <td className="py-3 pr-4">
                        <div className="font-semibold">{product?.sku ?? 'SKU'}</div>
                        <div className="text-xs text-[var(--g-text-muted)]">
                          {product?.description ?? 'Description pending'}
                        </div>
                      </td>
                      <td className="py-3 pr-4">{row.tour_product?.size ?? '—'}</td>
                      <td className="py-3 pr-4 text-right">{row.qty_sold}</td>
                      <td className="py-3 pr-4 text-right">
                        {currencyFormatter.format(Number(row.unit_price ?? 0))}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {currencyFormatter.format(Number(row.gross_sales ?? 0))}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="py-3" colSpan={5}>
                    No sales recorded for this show.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="g-card p-6 mt-10">
        <h2 className="text-lg font-semibold g-title">Comps</h2>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm g-table">
            <thead className="text-left border-b border-white/10">
              <tr>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Size</th>
                <th className="py-2 pr-4 text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {compRows.length ? (
                compRows.map((row, index) => {
                  const product = normalizeProduct(row.tour_product?.product);
                  return (
                    <tr key={`${row.show_id}-${index}`} className="border-b border-white/10">
                      <td className="py-3 pr-4">{row.comp_type}</td>
                      <td className="py-3 pr-4">{product?.sku ?? 'SKU'}</td>
                      <td className="py-3 pr-4">{row.tour_product?.size ?? '—'}</td>
                      <td className="py-3 pr-4 text-right">{row.quantity}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="py-3" colSpan={4}>
                    No comps recorded for this show.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="g-card p-6 mt-10">
        <h2 className="text-lg font-semibold g-title">Settlement summary</h2>
        {settlementDoc ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
            <div className="border border-white/10 rounded-md p-3">
              <p className="text-xs text-[var(--g-text-muted)]">Gross sales</p>
              <p className="text-lg font-semibold mt-1">
                {currencyFormatter.format(Number(settlementSource.gross_sales_total ?? 0))}
              </p>
            </div>
            <div className="border border-white/10 rounded-md p-3">
              <p className="text-xs text-[var(--g-text-muted)]">Fees</p>
              <p className="text-lg font-semibold mt-1">
                {currencyFormatter.format(Number(settlementSource.other_fees ?? 0))}
              </p>
            </div>
            <div className="border border-white/10 rounded-md p-3">
              <p className="text-xs text-[var(--g-text-muted)]">Net settlement</p>
              <p className="text-lg font-semibold mt-1">
                {currencyFormatter.format(Number(settlementSource.net_settlement_amount ?? 0))}
              </p>
            </div>
            <div className="text-xs text-[var(--g-text-muted)] md:col-span-3">
              Status: {settlementDoc.status}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--g-text-muted)] mt-3">
            No settlement document posted yet.
          </p>
        )}
      </section>

      <section className="g-card p-6 mt-10">
        <h2 className="text-lg font-semibold g-title">Inventory impact</h2>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm g-table">
            <thead className="text-left border-b border-white/10">
              <tr>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Size</th>
                <th className="py-2 pr-4 text-right">Starting</th>
                <th className="py-2 pr-4 text-right">Sold</th>
                <th className="py-2 pr-4 text-right">Comps</th>
                <th className="py-2 pr-4 text-right">Ending</th>
              </tr>
            </thead>
            <tbody>
              {inventoryImpact.map((row) => (
                <tr key={`${row.sku}-${row.size}`} className="border-b border-white/10">
                  <td className="py-3 pr-4">
                    <div className="font-semibold">{row.sku}</div>
                    <div className="text-xs text-[var(--g-text-muted)]">{row.description}</div>
                  </td>
                  <td className="py-3 pr-4">{row.size}</td>
                  <td className="py-3 pr-4 text-right">
                    {row.startingBalance === null ? '—' : row.startingBalance}
                  </td>
                  <td className="py-3 pr-4 text-right">{row.soldThisShow}</td>
                  <td className="py-3 pr-4 text-right">{row.compsThisShow}</td>
                  <td className="py-3 pr-4 text-right">
                    {row.endingBalance === null ? '—' : row.endingBalance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="g-card p-6 mt-10">
        <h2 className="text-lg font-semibold g-title">Receiving context</h2>
        <p className="text-sm text-[var(--g-text-muted)] mt-2">
          Receipts since the previous show.
        </p>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm g-table">
            <thead className="text-left border-b border-white/10">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Delivery</th>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">Size</th>
                <th className="py-2 pr-4 text-right">Received</th>
                <th className="py-2 pr-4">Vendor</th>
              </tr>
            </thead>
            <tbody>
              {receiptsBetween.length === 0 ? (
                <tr>
                  <td className="py-3" colSpan={6}>
                    No receipts between shows.
                  </td>
                </tr>
              ) : (
                receiptsBetween.map((row, index) => (
                  <tr key={`${row.delivery_number ?? 'delivery'}-${index}`} className="border-b border-white/10">
                    <td className="py-3 pr-4">{formatDate(row.received_date)}</td>
                    <td className="py-3 pr-4">{row.delivery_number ?? '—'}</td>
                    <td className="py-3 pr-4">{row.sku}</td>
                    <td className="py-3 pr-4">{row.size ?? '—'}</td>
                    <td className="py-3 pr-4 text-right">{row.quantity_received}</td>
                    <td className="py-3 pr-4">{row.vendor ?? '—'}</td>
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
