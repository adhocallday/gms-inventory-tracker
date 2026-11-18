import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/client';
import { fetchAll } from '@/lib/supabase/fetch-all';
import { SalesLinesTable } from '@/components/shows/SalesLinesTable';
import { CompsTable } from '@/components/shows/CompsTable';
import { InventoryImpactTable } from '@/components/shows/InventoryImpactTable';
import { ReceivingContextTable } from '@/components/shows/ReceivingContextTable';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatDate as formatDay } from '@/lib/format';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

function formatDate(value?: string | null) {
  return formatDay(value, undefined, 'date not set');
}

/** Settlement documents, best first: a posted one is the settlement of record. */
const SETTLEMENT_STATUS_RANK: Record<string, number> = { posted: 0, approved: 1, draft: 2, error: 3, rejected: 4 };

/** A settlement figure, or null when the document does not contain it. */
function settlementValue(source: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const raw = source[key];
    if (raw === null || raw === undefined || raw === '') continue;
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return null;
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

// Cached for 30s; posting a document refreshes it immediately (lib/cache/revalidate.ts)
export const revalidate = 30;

export default async function ShowDetailPage({ params }: ShowDetailParams) {
  const supabase = createServiceClient();

  // Independent queries run in parallel
  const [
    { data: tour },
    { data: show },
    { data: sales },
    { data: comps },
    { data: tourProducts },
    { data: tourShows },
    { data: receipts },
    { data: settlementDocs },
  ] = await Promise.all([
    supabase
      .from('tours')
      .select('id, name, artist')
      .eq('id', params.id)
      .maybeSingle(),
    supabase
      .from('shows')
      .select('id, tour_id, show_date, venue_name, city, state, attendance')
      .eq('id', params.showId)
      .maybeSingle(),
    supabase
      .from('sales')
      .select(
        'show_id, qty_sold, unit_price, gross_sales, tour_product:tour_products(id, size, product:products(sku, description))'
      )
      .eq('show_id', params.showId),
    supabase
      .from('comps')
      .select(
        'show_id, comp_type, quantity, tour_product:tour_products(id, size, product:products(sku, description))'
      )
      .eq('show_id', params.showId),
    supabase
      .from('tour_products')
      .select('id, size, product:products(sku, description)')
      .eq('tour_id', params.id),
    supabase
      .from('shows')
      .select('id, show_date')
      .eq('tour_id', params.id),
    supabase
      .from('stock_movement_view')
      .select('received_date, delivery_number, sku, size, quantity_received, vendor')
      .eq('tour_id', params.id),
    supabase
      .from('parsed_documents')
      .select('id, status, normalized_json, ui_overrides, extracted_json, updated_at')
      .eq('doc_type', 'settlement')
      .eq('show_id', params.showId)
      .order('updated_at', { ascending: false })
      .limit(10),
  ]);

  if (!tour || !show || show.tour_id !== tour.id) {
    notFound();
  }

  // Tour-wide sales and comps (for before/after balances) depend on the show list
  const tourShowIds = (tourShows ?? []).map((row) => row.id);
  // A tour easily has more than 1000 sales rows, so page through them.
  const [allSalesData, allCompsData] = await Promise.all([
    fetchAll<{ show_id: string; qty_sold: number | null; tour_product_id: string }>((from, to) =>
      supabase
        .from('sales')
        .select('show_id, qty_sold, tour_product_id')
        .in('show_id', tourShowIds)
        .order('id')
        .range(from, to)
    ),
    fetchAll<{ show_id: string; quantity: number | null; tour_product_id: string }>((from, to) =>
      supabase
        .from('comps')
        .select('show_id, quantity, tour_product_id')
        .in('show_id', tourShowIds)
        .order('id')
        .range(from, to)
    ),
  ]);

  // Prefer the posted settlement; fall back to the newest draft, and only
  // then to a rejected one, which is labelled as such below.
  const settlementDoc = [...(settlementDocs ?? [])].sort(
    (a, b) => (SETTLEMENT_STATUS_RANK[a.status] ?? 9) - (SETTLEMENT_STATUS_RANK[b.status] ?? 9)
  )[0];
  const settlementSource = (settlementDoc?.ui_overrides ??
    settlementDoc?.normalized_json ??
    settlementDoc?.extracted_json ??
    {}) as Record<string, unknown>;
  // Normalised keys first, then the parser's raw names.
  const settlementFigures = [
    { label: 'Gross sales', value: settlementValue(settlementSource, 'gross_sales_total', 'grossSales') },
    { label: 'Sales tax', value: settlementValue(settlementSource, 'sales_tax_total', 'salesTax') },
    { label: 'Card fees', value: settlementValue(settlementSource, 'credit_card_fees', 'ccFees') },
    { label: 'Other fees', value: settlementValue(settlementSource, 'other_fees', 'otherFees') },
    { label: 'Net settlement', value: settlementValue(settlementSource, 'net_settlement_amount', 'netSettlement') },
  ];

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

  const allSales = allSalesData ?? [];

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

  const allComps = allCompsData ?? [];

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
      description: product?.description ?? 'No description',
      size: tp.size ?? '—',
      soldThisShow: currentSold.get(tp.id) ?? 0,
      compsThisShow: currentComps.get(tp.id) ?? 0,
      startingBalance,
      endingBalance,
      noReceipts: receivedUpToCurrent === 0,
    };
  });

  const receiptsBetween = (receipts ?? []).filter((row) => {
    if (!showDate || !row.received_date) return false;
    const rowDate = new Date(row.received_date);
    const lowerBound = previousShowDate ? new Date(previousShowDate) : null;
    if (lowerBound && rowDate <= lowerBound) return false;
    return rowDate <= showDate;
  });

  const settlementIsRecord = settlementDoc?.status === 'posted' || settlementDoc?.status === 'approved';

  return (
    <div className="g-container py-6">
      <Link href={`/tours/${tour.id}`} className="text-sm font-medium g-link">
        <ArrowLeft className="inline-block h-4 w-4 align-[-0.125em] mr-1" aria-hidden="true" />
        {tour.name}
      </Link>
      <div className="mt-3">
        <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px] lg:leading-9">
          {show.venue_name ?? 'Venue not set'}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)] tabular-nums">
          {[show.city, show.state].filter(Boolean).join(', ') || 'City not set'} · {formatDate(show.show_date)} ·{' '}
          {show.attendance === null || show.attendance === undefined
            ? 'attendance not recorded'
            : `${Number(show.attendance).toLocaleString()} attendance`}{' '}
          · {tour.artist}
        </p>
      </div>

      <section data-tour="show-sales" className="g-card p-5 mt-6">
        <h2 className="text-lg font-semibold mb-4">Sales lines</h2>
        <SalesLinesTable
          data={salesRows.map((row) => {
            const product = normalizeProduct(row.tour_product?.product);
            return {
              sku: product?.sku ?? 'SKU',
              description: product?.description ?? 'No description',
              size: row.tour_product?.size ?? '',
              qty_sold: row.qty_sold,
              unit_price: Number(row.unit_price ?? 0),
              gross_sales: Number(row.gross_sales ?? 0),
            };
          })}
        />
      </section>

      <section data-tour="show-comps" className="g-card p-5 mt-6">
        <h2 className="text-lg font-semibold mb-4">Comps</h2>
        <CompsTable
          data={compRows.map((row) => {
            const product = normalizeProduct(row.tour_product?.product);
            return {
              comp_type: row.comp_type,
              sku: product?.sku ?? 'SKU',
              size: row.tour_product?.size ?? '',
              quantity: row.quantity,
            };
          })}
        />
      </section>

      <section data-tour="show-settlement" className="g-card p-5 mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Settlement</h2>
          {settlementDoc && (
            <div className="flex items-center gap-3 text-sm">
              <Badge variant={settlementDoc.status as never} size="sm">
                {settlementDoc.status}
              </Badge>
              <Link href={`/dashboard/parsed-documents/${settlementDoc.id}`} className="g-link font-medium">
                Open document
              </Link>
            </div>
          )}
        </div>
        {settlementDoc ? (
          <>
            {!settlementIsRecord && (
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {settlementDoc.status === 'rejected'
                  ? 'Only a rejected settlement document exists for this show. These figures were read from it and are not posted.'
                  : 'This settlement has not been posted yet. Figures are from the parsed draft.'}
              </p>
            )}
            <dl className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 text-sm">
              {settlementFigures.map((figure) => (
                <div key={figure.label} className="rounded-md border border-[var(--color-bg-border)] p-3">
                  <dt className="text-xs font-medium text-[var(--color-text-secondary)]">{figure.label}</dt>
                  {figure.value === null ? (
                    <dd className="mt-1 text-sm text-[var(--color-text-secondary)]">Not in settlement</dd>
                  ) : (
                    <dd className="mt-1 text-lg font-semibold tabular-nums">{currencyFormatter.format(figure.value)}</dd>
                  )}
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            No settlement document for this show yet. Upload the venue settlement to see gross, tax, fees and net.
          </p>
        )}
      </section>

      <section data-tour="show-inventory" className="g-card p-5 mt-6">
        <h2 className="text-lg font-semibold">Inventory impact</h2>
        <p className="mt-1 mb-4 text-sm text-[var(--color-text-secondary)]">
          Starting: stock received up to the previous show, less earlier sales and comps. Ending: stock received up to this show, less sales and comps up to and including it.
        </p>
        <InventoryImpactTable data={inventoryImpact} />
      </section>

      <section className="g-card p-5 mt-6">
        <h2 className="text-lg font-semibold mb-1">Stock received</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          Deliveries received after the previous show, up to this one.
        </p>
        <ReceivingContextTable data={receiptsBetween} />
      </section>
    </div>
  );
}
