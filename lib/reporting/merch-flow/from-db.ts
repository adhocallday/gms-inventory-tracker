import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAll } from '../../supabase/fetch-all';
import { baseSku } from '@/lib/merch-flow-report/normalize/sku';
import { gms } from '@/lib/merch-flow-report/brand/tokens';
import type { TrackerData } from '@/lib/merch-flow-report/parse/tracker';
import type { PopItem } from '@/lib/merch-flow-report/parse/pop';
import {
  DEFAULT_OPTIONS,
  FULL_SECTIONS,
  type Product,
  type Show,
  type TourReport,
} from '@/lib/merch-flow-report/report/types';
import { buildMatchRows, buildReport, type MatchRow } from '@/lib/merch-flow-report/report/build';
import { findIssues, type Issue } from '@/lib/merch-flow-report/report/issues';
import { inferTourStart } from '@/lib/merch-flow-report/report/derive';

/**
 * Builds MerchFlow Charts' report from the tracker database for one tour.
 *
 * Charts reads a tracker workbook (or this app's /api/tours/[id]/merch-flow-data);
 * here the same TrackerData is assembled from shows, sales, tour_products/
 * products and the show_sales_per_head view, then turned into a TourReport by
 * the engine vendored from Charts (lib/merch-flow-report), the same way the
 * Charts wizard does it. mapTourData and assembleReport are pure so they can be
 * tested without a database; loadTourReport does the I/O.
 */

// ---------------------------------------------------------------- raw rows

export type DbTour = {
  id: string;
  name: string;
  artist: string;
  start_date: string | null;
  end_date: string | null;
};

/** Row of the show_sales_per_head view (002_tracker_views / 001_initial_schema). */
export type DbShowSalesRow = {
  show_id: string;
  show_date: string;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  total_gross: number | string | null;
  attendance: number | null;
  per_head: number | string | null;
};

/** PostgREST embeds a many-to-one relation as an object; untyped clients type it as an array. */
type Embedded<T> = T | T[] | null;

const one = <T>(value: Embedded<T> | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

export type DbProductRow = {
  id: string;
  sku: string;
  description: string;
  product_type: string | null;
  category?: Embedded<{ name: string }>;
};

export type DbTourProductRow = {
  id: string;
  size: string | null;
  full_package_cost: number | string | null;
  product: Embedded<DbProductRow>;
};

export type DbSaleRow = {
  show_id: string;
  tour_product_id: string;
  qty_sold: number | null;
  gross_sales: number | string | null;
};

export type DbCompRow = {
  show_id: string;
  tour_product_id: string;
  quantity: number | null;
};

/** Row of product_images_detail (product_images joined to products). */
export type DbProductImageRow = {
  sku: string | null;
  product_description: string | null;
  file_url: string | null;
  is_primary?: boolean | null;
  display_order?: number | null;
};

export type RawTourData = {
  tour: DbTour;
  shows: DbShowSalesRow[];
  tourProducts: DbTourProductRow[];
  sales: DbSaleRow[];
  comps: DbCompRow[];
  images: DbProductImageRow[];
};

// ---------------------------------------------------------------- mapping

/** Something the report cannot show for this tour because the database lacks it. */
export type DataGap = {
  field: 'attendance' | 'sales' | 'gross' | 'cost' | 'comps';
  message: string;
};

/** A product photo, in the shape Charts' buildMatchRows takes from POP files. */
export type Photo = PopItem & { imageKey: string };

export type TourInput = {
  /** Exactly Charts' TrackerData: no tracker-only fields. */
  tracker: TrackerData;
  photos: Photo[];
  gaps: DataGap[];
};

const num = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const formatRange = (start: string | null, end: string | null) => {
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return start ? fmt(start) : end ? fmt(end) : '';
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function mapTourData(raw: RawTourData): TourInput {
  const gaps: DataGap[] = [];

  // Products: one row per base SKU, sizes summed (the tracker workbook reports at SKU level).
  type Acc = { product: Product; gross: number; costWeighted: number; costUnits: number; anyCost: number };
  const bySku = new Map<string, Acc>();
  const skuByTourProduct = new Map<string, string>();

  for (const tp of raw.tourProducts) {
    const product = one(tp.product);
    if (!product) continue;
    const sku = baseSku(product.sku);
    skuByTourProduct.set(tp.id, sku);
    if (bySku.has(sku)) continue;
    bySku.set(sku, {
      product: { sku, name: product.description.trim(), unitsSold: 0, shareOfGross: 0 },
      gross: 0,
      costWeighted: 0,
      costUnits: 0,
      anyCost: 0,
    });
  }

  const costByTourProduct = new Map(raw.tourProducts.map((tp) => [tp.id, num(tp.full_package_cost)]));
  for (const tp of raw.tourProducts) {
    const sku = skuByTourProduct.get(tp.id);
    const cost = num(tp.full_package_cost);
    if (sku && cost > 0) bySku.get(sku)!.anyCost = cost;
  }

  // Shows with no sales yet (future dates, unposted reports) stay out of the report.
  const reportedShowIds = new Set<string>();
  let salesWithoutGross = 0;
  let salesWithUnits = 0;
  for (const sale of raw.sales) {
    const sku = skuByTourProduct.get(sale.tour_product_id);
    if (!sku) continue;
    const acc = bySku.get(sku)!;
    const qty = num(sale.qty_sold);
    const gross = num(sale.gross_sales);
    if (qty > 0) {
      salesWithUnits += 1;
      if (gross <= 0) salesWithoutGross += 1;
    }
    acc.product.unitsSold += qty;
    acc.gross += gross;
    const cost = costByTourProduct.get(sale.tour_product_id) ?? 0;
    if (cost > 0) {
      acc.costWeighted += cost * qty;
      acc.costUnits += qty;
    }
    if (qty > 0 || gross > 0) reportedShowIds.add(sale.show_id);
  }

  const compUnits = raw.comps
    .filter((c) => skuByTourProduct.has(c.tour_product_id))
    .reduce((sum, c) => sum + num(c.quantity), 0);

  const productGross = Array.from(bySku.values()).reduce((sum, a) => sum + a.gross, 0);
  let missingCost = 0;
  const products: Product[] = Array.from(bySku.values())
    .map(({ product, gross, costWeighted, costUnits, anyCost }) => {
      const unitCost = costUnits > 0 ? costWeighted / costUnits : anyCost || undefined;
      if (product.unitsSold > 0 && !unitCost) missingCost += 1;
      return {
        ...product,
        shareOfGross: productGross > 0 ? gross / productGross : 0,
        unitCost,
      };
    })
    .sort((a, b) => b.unitsSold - a.unitsSold || a.sku.localeCompare(b.sku));

  const sortedShows = [...raw.shows].sort(
    (a, b) => a.show_date.localeCompare(b.show_date) || a.show_id.localeCompare(b.show_id),
  );
  const unreported = sortedShows.filter((s) => !reportedShowIds.has(s.show_id));
  let attendance = 0;
  let noAttendance = 0;
  const shows: Show[] = sortedShows
    .filter((s) => reportedShowIds.has(s.show_id))
    .map((s) => {
      const showAttendance = s.attendance && s.attendance > 0 ? s.attendance : 0;
      attendance += showAttendance;
      if (!showAttendance) noAttendance += 1;
      const gross = num(s.total_gross);
      // The workbook's Tour P-Heads tab: only shows with a head count have one.
      const perHead = showAttendance
        ? s.per_head !== null && s.per_head !== undefined
          ? num(s.per_head)
          : gross / showAttendance
        : undefined;
      return {
        date: s.show_date.slice(0, 10),
        city: (s.city || s.venue_name || 'Unknown').trim(),
        grossUsd: gross,
        perHeadUsd: perHead,
      };
    });

  if (unreported.length) {
    gaps.push({
      field: 'sales',
      message: `${unreported.length} ${plural(unreported.length, 'show has', 'shows have')} no sales posted and ${plural(unreported.length, 'is', 'are')} left out.`,
    });
  }
  if (salesWithoutGross) {
    gaps.push({
      field: 'gross',
      message: `${salesWithoutGross} of ${salesWithUnits} sales lines with units have no gross_sales, so share of gross and gross rank undercount those products.`,
    });
  }
  if (noAttendance) {
    gaps.push({
      field: 'attendance',
      message: `shows.attendance is empty for ${noAttendance} of ${shows.length} reported shows. Per head averages only the shows that have it; total attendance and the 1-in-N ratios count only those shows' attendance against all units sold.`,
    });
  }
  if (missingCost) {
    gaps.push({
      field: 'cost',
      message: `${missingCost} selling ${plural(missingCost, 'product has', 'products have')} no full_package_cost.`,
    });
  }
  if (compUnits) {
    gaps.push({
      field: 'comps',
      message: `${compUnits.toLocaleString('en-US')} comped ${plural(compUnits, 'unit is', 'units are')} not in units sold, as on the tracker workbook.`,
    });
  }

  // One photo per SKU: the primary one, else the first by display order.
  const photos: Photo[] = [];
  const seenPhoto = new Set<string>();
  const images = raw.images
    .map((image, i) => ({ image, i }))
    .sort(
      (a, b) =>
        Number(Boolean(b.image.is_primary)) - Number(Boolean(a.image.is_primary)) ||
        (a.image.display_order ?? 0) - (b.image.display_order ?? 0) ||
        a.i - b.i,
    );
  for (const { image } of images) {
    if (!image.sku || !image.file_url) continue;
    const sku = baseSku(image.sku);
    if (seenPhoto.has(sku)) continue;
    seenPhoto.add(sku);
    photos.push({ sku, itemName: image.product_description ?? sku, imageKey: image.file_url });
  }

  return {
    tracker: {
      artist: raw.tour.artist,
      tourDates: formatRange(raw.tour.start_date, raw.tour.end_date),
      products,
      shows,
      attendance,
    },
    photos,
    gaps,
  };
}

// ---------------------------------------------------------------- report

export type AssembledReport = {
  /** As Charts publishes it: imageKey stripped, photos in imageUrls. */
  report: TourReport;
  /** Product photo URLs keyed by SKU, as Charts' loadReport returns them. */
  imageUrls: Record<string, string>;
  rows: MatchRow[];
  /** The wizard's review-step issues. */
  issues: Issue[];
};

/**
 * TrackerData → TourReport, mirroring MerchFlow Charts' wizard with its
 * defaults: app/new/Wizard.tsx runParse() builds the match rows, publish()
 * builds the report, and /api/publish moves the photos out of it into
 * imageUrls. The tour name comes from the tour, as tracker-link.ts does.
 */
export function assembleReport(tourName: string, tracker: TrackerData, photos: Photo[] = []): AssembledReport {
  const rows = buildMatchRows(tracker.products, photos);
  // Wizard: attendance is prefilled from the tracker and kept as a string.
  const attendance = Number(tracker.attendance ? String(tracker.attendance) : '') || 0;

  const built = buildReport({
    tracker: {
      artist: tracker.artist,
      tourDates: tracker.tourDates,
      products: tracker.products,
      shows: tracker.shows,
      attendance,
    },
    rows,
    artist: tracker.artist,
    tourName: tourName || tracker.artist,
    dateRange: tracker.tourDates,
    attendance,
    artistAccent: gms.red,
    sections: [...FULL_SECTIONS],
    options: { ...DEFAULT_OPTIONS },
    cityOverrides: {},
  });

  const imageUrls = Object.fromEntries(
    rows.filter((r) => r.imageKey).map((r) => [r.sku, r.imageKey!]),
  );
  const report: TourReport = {
    ...built,
    products: built.products.map((p) => ({ ...p, imageKey: undefined })),
  };

  const issues = findIssues({ rows, shows: tracker.shows, tourStart: inferTourStart(tracker.shows) });

  return { report, imageUrls, rows, issues };
}

// ---------------------------------------------------------------- I/O

export type MerchFlowData = TourInput & AssembledReport & { tour: DbTour };

/** Reads one tour from the database; null if the tour is unknown. */
export async function loadTourData(
  supabase: SupabaseClient,
  tourId: string,
): Promise<(TourInput & { tour: DbTour }) | null> {
  const [tourResult, shows, tourProducts, sales, comps, images] = await Promise.all([
    supabase
      .from('tours')
      .select('id, name, artist, start_date, end_date')
      .eq('id', tourId)
      .maybeSingle(),
    fetchAll<DbShowSalesRow>((from, to) =>
      supabase
        .from('show_sales_per_head')
        .select('show_id, show_date, venue_name, city, state, total_gross, attendance, per_head')
        .eq('tour_id', tourId)
        .order('show_date')
        .order('show_id')
        .range(from, to),
    ),
    fetchAll<DbTourProductRow>((from, to) =>
      supabase
        .from('tour_products')
        .select('id, size, full_package_cost, product:products(id, sku, description, product_type)')
        .eq('tour_id', tourId)
        .order('id')
        .range(from, to),
    ),
    fetchAll<DbSaleRow>((from, to) =>
      supabase
        .from('sales')
        .select('id, show_id, tour_product_id, qty_sold, gross_sales, tour_products!inner(tour_id)')
        .eq('tour_products.tour_id', tourId)
        .order('id')
        .range(from, to),
    ),
    fetchAll<DbCompRow>((from, to) =>
      supabase
        .from('comps')
        .select('id, show_id, tour_product_id, quantity, tour_products!inner(tour_id)')
        .eq('tour_products.tour_id', tourId)
        .order('id')
        .range(from, to),
    ),
    fetchAll<DbProductImageRow>((from, to) =>
      supabase
        .from('product_images_detail')
        .select('id, sku, product_description, file_url, is_primary, display_order')
        .eq('tour_id', tourId)
        .order('id')
        .range(from, to),
    ),
  ]);

  if (tourResult.error) throw tourResult.error;
  const tour = tourResult.data as DbTour | null;
  if (!tour) return null;

  return { ...mapTourData({ tour, shows, tourProducts, sales, comps, images }), tour };
}

/** Reads one tour and builds its report; null if the tour is unknown. */
export async function loadTourReport(
  supabase: SupabaseClient,
  tourId: string,
): Promise<MerchFlowData | null> {
  const data = await loadTourData(supabase, tourId);
  if (!data) return null;
  return { ...data, ...assembleReport(data.tour.name, data.tracker, data.photos) };
}
