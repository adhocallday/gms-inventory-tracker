import type { TrackerData } from '../parse/tracker';
import type { PopItem } from '../parse/pop';
import { gms } from '../brand/tokens';
import {
  FULL_SECTIONS,
  DEFAULT_OPTIONS,
  type Product,
  type TourReport,
  type SectionId,
  type ReportOptions,
  type Category,
} from './types';

export type MatchRow = {
  sku: string;
  /** Canonical name, from the tracker. Absent for a POP with no tracker row. */
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
 * tracker product with no photo, and a POP file for an item that never made
 * this tour's inventory.
 */
export function buildMatchRows(
  products: Product[],
  pops: (PopItem & { imageKey?: string })[],
): MatchRow[] {
  const popBySku = new Map(pops.map((p) => [p.sku, p]));
  const rows: MatchRow[] = [];

  for (const product of products) {
    const pop = popBySku.get(product.sku);
    rows.push({
      sku: product.sku,
      trackerName: product.name,
      popName: pop?.itemName,
      unitsSold: product.unitsSold,
      shareOfGross: product.shareOfGross,
      imageKey: pop?.imageKey,
      status: pop?.imageKey ? 'matched' : 'noImage',
    });
  }

  for (const pop of pops) {
    if (products.some((p) => p.sku === pop.sku)) continue;
    rows.push({
      sku: pop.sku,
      popName: pop.itemName,
      imageKey: pop.imageKey,
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
  /** Applied city spellings, keyed on the tracker value. */
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
      displayName: editsBySku.get(p.sku)?.displayName,
      category: editsBySku.get(p.sku)?.category,
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
      artistAccent: input.artistAccent || gms.red,
    },
    sections: input.sections ?? DEFAULT_SECTIONS,
    options: input.options ?? DEFAULT_OPTIONS,
  };
}
