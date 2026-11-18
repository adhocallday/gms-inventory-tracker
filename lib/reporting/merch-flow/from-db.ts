import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAll } from '../../supabase/fetch-all';
import { baseSku } from './sku';
import { categoryOf } from './derive';
import { buildMatchRows, buildReport, type MatchRow, type PhotoSource } from './build';
import type { Category, Product, Show, TourReport, TrackerData } from './types';

/**
 * Builds the MerchFlow Charts input from the tracker database for one tour.
 *
 * The Charts app reads a tracker workbook; here the same TrackerData shape is
 * assembled from shows, sales, tour_products/products, comps and the
 * show_sales_per_head view. The mapping is pure (mapTourData) so it can be
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
  category: Embedded<{ name: string }>;
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

export type DbProductImageRow = {
  sku: string | null;
  product_description: string | null;
  file_url: string | null;
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

/** A column the charts logic wants that the database does not supply for this tour. */
export type DataGap = {
  field: 'attendance' | 'category' | 'sales' | 'gross' | 'cost';
  message: string;
};

export type TourInput = {
  tracker: TrackerData;
  photos: PhotoSource[];
  totalComps: number;
  /**
   * Units per SKU sold at shows that have an attendance figure. 1-in-N ratios
   * divide by these so a partly-entered attendance column does not skew them.
   */
  unitsAtCountedShows: Record<string, number>;
  gaps: DataGap[];
};

const num = (value: number | string | null | undefined) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Maps a free-form DB category name onto the Charts taxonomy. Generic names
 * ("Apparel", "Event Tees") fall through to name-based inference.
 */
export function categoryFromDb(name: string | null | undefined): Category | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase();
  if (/hood|jersey|outerwear|jacket/.test(n)) return 'Hoodies & jerseys';
  if (/hat|head|cap|beanie/.test(n)) return 'Headwear';
  if (/tee|shirt/.test(n)) return 'Tees';
  if (/accessor|paper|media|poster|flag|bandana|pin/.test(n)) return 'Accessories';
  return undefined;
}

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

export function mapTourData(raw: RawTourData): TourInput {
  const gaps: DataGap[] = [];

  // Products: one row per base SKU, sizes summed (the tracker reports at SKU level).
  type Acc = Product & { costWeighted: number; costUnits: number; anyCost: number };
  const bySku = new Map<string, Acc>();
  const skuByTourProduct = new Map<string, string>();
  let uncategorised = 0;

  for (const tp of raw.tourProducts) {
    const product = one(tp.product);
    if (!product) continue;
    const sku = baseSku(product.sku);
    skuByTourProduct.set(tp.id, sku);
    if (bySku.has(sku)) continue;
    const name = product.description.trim();
    const dbCategory = categoryFromDb(one(product.category)?.name);
    if (!dbCategory) uncategorised += 1;
    bySku.set(sku, {
      sku,
      name,
      category: dbCategory ?? categoryOf({ name, sku }),
      unitsSold: 0,
      shareOfGross: 0,
      grossUsd: 0,
      compUnits: 0,
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

  const countedShowIds = new Set(
    raw.shows.filter((s) => (s.attendance ?? 0) > 0).map((s) => s.show_id),
  );
  const unitsAtCountedShows: Record<string, number> = {};

  // Shows with no sales yet (future dates, unposted reports) stay out of the report.
  const reportedShowIds = new Set<string>();
  let salesWithoutGross = 0;
  let salesWithUnits = 0;
  for (const sale of raw.sales) {
    const sku = skuByTourProduct.get(sale.tour_product_id);
    if (!sku) continue;
    const product = bySku.get(sku)!;
    const qty = num(sale.qty_sold);
    if (qty > 0) {
      salesWithUnits += 1;
      if (num(sale.gross_sales) <= 0) salesWithoutGross += 1;
    }
    product.unitsSold += qty;
    product.grossUsd = (product.grossUsd ?? 0) + num(sale.gross_sales);
    const cost = costByTourProduct.get(sale.tour_product_id) ?? 0;
    if (cost > 0) {
      product.costWeighted += cost * qty;
      product.costUnits += qty;
    }
    if (qty > 0 || num(sale.gross_sales) > 0) reportedShowIds.add(sale.show_id);
    if (countedShowIds.has(sale.show_id)) {
      unitsAtCountedShows[sku] = (unitsAtCountedShows[sku] ?? 0) + qty;
    }
  }

  let totalComps = 0;
  for (const comp of raw.comps) {
    const sku = skuByTourProduct.get(comp.tour_product_id);
    const qty = num(comp.quantity);
    totalComps += qty;
    if (sku) bySku.get(sku)!.compUnits = (bySku.get(sku)!.compUnits ?? 0) + qty;
  }

  const productGross = Array.from(bySku.values()).reduce((sum, p) => sum + (p.grossUsd ?? 0), 0);
  let missingCost = 0;
  const products: Product[] = Array.from(bySku.values())
    .map(({ costWeighted, costUnits, anyCost, ...p }) => {
      const unitCost = costUnits > 0 ? costWeighted / costUnits : anyCost || undefined;
      if (p.unitsSold > 0 && !unitCost) missingCost += 1;
      return {
        ...p,
        shareOfGross: productGross > 0 ? (p.grossUsd ?? 0) / productGross : 0,
        unitCost,
        compUnits: p.compUnits || undefined,
      };
    })
    .sort((a, b) => b.unitsSold - a.unitsSold || a.sku.localeCompare(b.sku));

  const sortedShows = [...raw.shows].sort(
    (a, b) => a.show_date.localeCompare(b.show_date) || a.show_id.localeCompare(b.show_id),
  );
  const unreported = sortedShows.filter((s) => !reportedShowIds.has(s.show_id));
  const shows: Show[] = sortedShows
    .filter((s) => reportedShowIds.has(s.show_id))
    .map((s) => {
      const attendance = s.attendance && s.attendance > 0 ? s.attendance : undefined;
      const gross = num(s.total_gross);
      const perHead =
        s.per_head !== null && s.per_head !== undefined && attendance
          ? num(s.per_head)
          : attendance
            ? gross / attendance
            : undefined;
      return {
        date: s.show_date.slice(0, 10),
        city: (s.city || s.venue_name || 'Unknown').trim(),
        grossUsd: gross,
        attendance,
        perHeadUsd: perHead,
      };
    });

  const attendance = shows.reduce((sum, s) => sum + (s.attendance ?? 0), 0);
  const noAttendance = shows.filter((s) => s.attendance === undefined).length;

  if (unreported.length) {
    gaps.push({
      field: 'sales',
      message: `${unreported.length} show${unreported.length === 1 ? ' has' : 's have'} no sales posted and ${unreported.length === 1 ? 'is' : 'are'} left out.`,
    });
  }
  if (salesWithoutGross) {
    gaps.push({
      field: 'gross',
      message: `${salesWithoutGross} of ${salesWithUnits} sales lines with units have no gross_sales, so gross, share of gross and gross rank undercount those products.`,
    });
  }
  if (noAttendance) {
    gaps.push({
      field: 'attendance',
      message: `shows.attendance is empty for ${noAttendance} of ${shows.length} reported shows, so per head, total attendance and 1-in-N ratios cover only the shows that have it.`,
    });
  }
  if (uncategorised) {
    gaps.push({
      field: 'category',
      message: `${uncategorised} product${uncategorised === 1 ? ' has' : 's have'} no usable products.category_id; the category is inferred from the name and SKU.`,
    });
  }
  if (missingCost) {
    gaps.push({
      field: 'cost',
      message: `${missingCost} selling product${missingCost === 1 ? ' has' : 's have'} no full_package_cost.`,
    });
  }

  const photos: PhotoSource[] = [];
  const seenPhoto = new Set<string>();
  for (const image of raw.images) {
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
    totalComps,
    unitsAtCountedShows,
    gaps,
  };
}

// ---------------------------------------------------------------- I/O

export type MerchFlowData = TourInput & {
  tour: DbTour;
  report: TourReport;
  rows: MatchRow[];
};

/** Reads one tour from the database and returns the report model, or null if the tour is unknown. */
export async function loadTourReport(
  supabase: SupabaseClient,
  tourId: string,
): Promise<MerchFlowData | null> {
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
        .select(
          'id, size, full_package_cost, product:products(id, sku, description, product_type, category:product_categories(name))',
        )
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
        .select('id, sku, product_description, file_url')
        .eq('tour_id', tourId)
        .eq('is_primary', true)
        .order('id')
        .range(from, to),
    ),
  ]);

  if (tourResult.error) throw tourResult.error;
  const tour = tourResult.data as DbTour | null;
  if (!tour) return null;

  const input = mapTourData({ tour, shows, tourProducts, sales, comps, images });
  const rows = buildMatchRows(input.tracker.products, input.photos);
  const report = buildReport({
    tracker: input.tracker,
    rows,
    tourName: tour.name,
    attendance: input.tracker.attendance,
  });

  return { ...input, tour, report, rows };
}
