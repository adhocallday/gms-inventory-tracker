import { defaultAccent } from './palette';
import {
  FULL_SECTIONS,
  DEFAULT_OPTIONS,
  type Product,
  type TourReport,
  type TrackerData,
  type SectionId,
  type ReportOptions,
  type Category,
} from './types';

/** A product photo source: a POP file in the Charts app, a product image here. */
export type PhotoSource = {
  sku: string;
  itemName: string;
  imageKey?: string;
};

export type MatchRow = {
  sku: string;
  /** Canonical name, from the tracker / database. Absent for a photo with no sales row. */
  trackerName?: string;
  popName?: string;
  unitsSold?: number;
  shareOfGross?: number;
  imageKey?: string;
  /** Operator-edited printable name; falls back to the cleaned tracker name. */
  displayName?: string;
  category?: Category;
  status: 'matched' | 'noImage' | 'noSalesData';
};

/**
 * Builds the review table the operator confirms before anything is rendered.
 *
 * Two failure modes are real and both are surfaced rather than swallowed: a
 * product with no photo, and a photo for an item that never made this tour's
 * inventory.
 */
export function buildMatchRows(products: Product[], photos: PhotoSource[]): MatchRow[] {
  const photoBySku = new Map(photos.map((p) => [p.sku, p]));
  const productSkus = new Set(products.map((p) => p.sku));
  const rows: MatchRow[] = [];

  for (const product of products) {
    const photo = photoBySku.get(product.sku);
    rows.push({
      sku: product.sku,
      trackerName: product.name,
      popName: photo?.itemName,
      unitsSold: product.unitsSold,
      shareOfGross: product.shareOfGross,
      imageKey: photo?.imageKey,
      displayName: product.displayName,
      category: product.category,
      status: photo?.imageKey ? 'matched' : 'noImage',
    });
  }

  for (const photo of photos) {
    if (productSkus.has(photo.sku)) continue;
    rows.push({
      sku: photo.sku,
      popName: photo.itemName,
      imageKey: photo.imageKey,
      status: 'noSalesData',
    });
  }

  // Problems first — the operator should land on what needs attention.
  const rank = { noSalesData: 0, noImage: 1, matched: 2 } as const;
  return rows.sort(
    (a, b) => rank[a.status] - rank[b.status] || (b.unitsSold ?? 0) - (a.unitsSold ?? 0),
  );
}

export const DEFAULT_SECTIONS: SectionId[] = [...FULL_SECTIONS];

export function buildReport(input: {
  tracker: TrackerData;
  rows: MatchRow[];
  artist?: string;
  tourName: string;
  dateRange?: string;
  attendance: number;
  artistAccent?: string;
  artistLogoKey?: string;
  sections?: SectionId[];
  /** Applied city spellings, keyed on the stored value. */
  cityOverrides?: Record<string, string>;
  options?: ReportOptions;
}): TourReport {
  const { tracker, rows } = input;
  const imageBySku = new Map(
    rows.filter((r) => r.imageKey).map((r) => [r.sku, r.imageKey!]),
  );
  const popNameBySku = new Map(
    rows.filter((r) => r.popName).map((r) => [r.sku, r.popName!]),
  );
  const editsBySku = new Map(rows.map((r) => [r.sku, r]));

  const products = tracker.products
    .filter((p) => p.unitsSold > 0)
    .map((p) => ({
      ...p,
      imageKey: imageBySku.get(p.sku),
      popName: popNameBySku.get(p.sku),
      displayName: editsBySku.get(p.sku)?.displayName ?? p.displayName,
      category: editsBySku.get(p.sku)?.category ?? p.category,
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold);

  return {
    artist: input.artist?.trim() || tracker.artist,
    tourName: input.tourName,
    dateRange: input.dateRange?.trim() || tracker.tourDates,
    attendance: input.attendance,
    products,
    shows: tracker.shows.map((show) => {
      const applied = input.cityOverrides?.[show.city];
      return applied ? { ...show, cityDisplay: applied } : show;
    }),
    branding: {
      artistLogoKey: input.artistLogoKey,
      artistAccent: input.artistAccent || defaultAccent,
    },
    sections: input.sections ?? DEFAULT_SECTIONS,
    options: input.options ?? DEFAULT_OPTIONS,
  };
}
