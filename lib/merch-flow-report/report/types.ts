export type Category = 'Tees' | 'Hoodies & jerseys' | 'Headwear' | 'Accessories';

export type Product = {
  sku: string;
  /** Name as it appears in the tracker's Inventory tab — the canonical one. */
  name: string;
  /** Printable name: colourway stripped, shorthand expanded. Editable. */
  displayName?: string;
  category?: Category;
  unitsSold: number;
  /** Share of tour gross, as a fraction (0.146 = 14.6%). */
  shareOfGross: number;
  supplier?: string;
  unitCost?: number;
  closingStock?: number;
  /** Set once a POP file or grab sheet supplies a photo. */
  imageKey?: string;
  /** Name from the POP file, kept for the review screen's side-by-side. */
  popName?: string;
};

export type Show = {
  date: string;
  city: string;
  grossUsd: number;
  grossSecondCurrency?: number;
  perHeadUsd?: number;
  /** Set by flagShows(); surfaced in the wizard, never silently corrected. */
  flag?: 'outsideRange' | 'perHeadSuspect';
  cityDisplay?: string;
  citySuggestion?: string;
};

export type ReportOptions = {
  preset: 'executive' | 'full' | 'custom';
  /** Products below this share of gross roll into one row. */
  tailThreshold: number;
  /** Only the implemented orderings are offered; both avoid rotated labels. */
  showsLayout: 'rows' | 'ranked';
  groupByMonth: boolean;
  grabSheetCount: 8 | 12;
  /**
   * 'meanOfShows' averages the per-show figures, which is what the tracker
   * reports. 'grossOverAttendance' is the weighted tour-wide figure.
   */
  perHead: 'meanOfShows' | 'grossOverAttendance';
};

export const DEFAULT_OPTIONS: ReportOptions = {
  preset: 'full',
  tailThreshold: 0.01,
  showsLayout: 'rows',
  groupByMonth: true,
  grabSheetCount: 8,
  perHead: 'meanOfShows',
};

export type TourReport = {
  artist: string;
  tourName: string;
  dateRange: string;
  attendance: number;
  products: Product[];
  shows: Show[];
  branding: {
    artistLogoKey?: string;
    artistAccent: string;
  };
  sections: SectionId[];
  options: ReportOptions;
};

export type SectionId =
  | 'cover'
  | 'summary'
  | 'shows'
  | 'scorecard'
  | 'divergence'
  | 'categoryMix'
  | 'grabSheet'
  | 'appendix'
  | 'dataCheck';

export const EXECUTIVE_SECTIONS: SectionId[] = [
  'cover',
  'summary',
  'shows',
  'scorecard',
  'grabSheet',
];

export const FULL_SECTIONS: SectionId[] = [
  'cover',
  'summary',
  'shows',
  'scorecard',
  'divergence',
  'categoryMix',
  'grabSheet',
  'appendix',
  'dataCheck',
];

export type ProductRatio = Product & {
  /** "1 in N of the audience bought this item." */
  oneInN: number;
};

export const totalUnits = (p: Product[]) =>
  p.reduce((sum, x) => sum + x.unitsSold, 0);

export const totalGross = (s: Show[]) =>
  s.reduce((sum, x) => sum + x.grossUsd, 0);

export const averagePerHead = (s: Show[]) => {
  const withHeads = s.filter((x) => typeof x.perHeadUsd === 'number');
  if (!withHeads.length) return 0;
  return (
    withHeads.reduce((sum, x) => sum + (x.perHeadUsd ?? 0), 0) / withHeads.length
  );
};

/**
 * Derived rather than read from the tracker's own Product Ratios tab — that tab
 * is produced by a manual sort-and-paste-values ritual this app exists to retire.
 */
export const productRatios = (
  products: Product[],
  attendance: number,
): ProductRatio[] =>
  products
    .filter((p) => p.unitsSold > 0)
    .map((p) => ({ ...p, oneInN: attendance / p.unitsSold }))
    .sort((a, b) => b.unitsSold - a.unitsSold);
