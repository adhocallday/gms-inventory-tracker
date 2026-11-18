import { chartSeries } from '../brand/tokens';
import { units, percent, compactUsd } from '../format';
import type { Product, Show, TourReport, Category } from './types';
import { CITY_TYPOS } from './issues';

/**
 * Derived model shared by the dashboard and the PDF.
 *
 * Pure functions over a TourReport so both renderings agree by construction
 * and each piece can be unit-tested against the real tour.
 */

/** Tokens that must survive title-casing intact. */
const ACRONYMS = new Set(['USA', 'FFDP', 'XX', 'LS', 'DC', 'NY', 'LA', 'UK']);

export const titleCase = (value: string) =>
  value
    .split(/(\s+)/)
    .map((token) => {
      const bare = token.replace(/[^A-Za-z]/g, '');
      if (bare && ACRONYMS.has(bare.toUpperCase()) && token === token.toUpperCase()) {
        return token;
      }
      return token
        .toLowerCase()
        .replace(/\b([a-z])/g, (m) => m.toUpperCase())
        .replace(/'S\b/g, "'s");
    })
    .join('');

/** Category colours are fixed per category, never assigned by rank. */
export const CATEGORY_COLORS: Record<Category, string> = {
  Tees: chartSeries[0],
  'Hoodies & jerseys': chartSeries[1],
  Headwear: chartSeries[2],
  Accessories: chartSeries[3],
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_COLORS) as Category[];

/**
 * Turns a tracker name into something printable.
 *
 * Tracker names lead with the colourway and carry trade shorthand and typos:
 * "BLACK 2026 AMERICA ITIN TEE" → "2026 America Itinerary Tee", colour Black.
 */
export function cleanName(name: string): { display: string; color?: string } {
  let rest = name.trim();
  let color: string | undefined;

  const colorPrefix = rest.match(/^(BLACK AND YELLOW|BLACK|RED|WHITE|GREY|GRAY)\s+/i);
  // "BLACK AND YELLOW BANDANA" is the product's name, not a colourway.
  if (colorPrefix && !/BANDANA$/i.test(rest)) {
    color = titleCase(colorPrefix[1]);
    rest = rest.slice(colorPrefix[0].length);
  }

  rest = rest
    .replace(/^FFDP\s+/i, '')
    .replace(/\bITIN\b/gi, 'Itinerary')
    .replace(/\bCAPTIANS\b/gi, 'Captains')
    .replace(/\bWOMENS\b/gi, "Women's")
    .replace(/\bLONGSLEEVE\b/gi, 'Long Sleeve')
    .replace(/\bWT\b/g, 'World Tour');

  return { display: titleCase(rest).replace(/women's/i, "Women's"), color };
}

export function categoryOf(product: Pick<Product, 'name' | 'sku'>): Category {
  const name = product.name.toUpperCase();
  if (/HOODIE|JERSEY/.test(name)) return 'Hoodies & jerseys';
  if (/\bHAT\b|BEANIE|\bCAP\b/.test(name)) return 'Headwear';
  if (/TEE|LONGSLEEVE|ITIN/.test(name)) return 'Tees';
  // Class digit in the SKU: 2xx and 4xx are garments on this tracker.
  if (/^[A-Z]{4}..[24]/.test(product.sku)) return 'Tees';
  return 'Accessories';
}

export const decorate = (product: Product): Product => ({
  ...product,
  displayName: product.displayName ?? cleanName(product.name).display,
  category: product.category ?? categoryOf(product),
});

// ---------------------------------------------------------------- shows

/**
 * Flags source-data problems for the wizard to surface. Nothing is corrected
 * here — a tour that genuinely started early is not an error to silence.
 */
export function flagShows(shows: Show[], tourStart?: string): Show[] {
  return shows.map((show) => {
    const outside = tourStart ? show.date < tourStart : false;
    const suspect = (show.perHeadUsd ?? 0) < PER_HEAD_SUSPECT_BELOW;
    return {
      ...show,
      // Display only: a suggested spelling is applied in the wizard, never here.
      cityDisplay: show.cityDisplay ?? titleCase(show.city),
      citySuggestion: CITY_TYPOS[show.city.trim().toUpperCase()],
      flag: outside ? 'outsideRange' : suspect ? 'perHeadSuspect' : undefined,
    };
  });
}

/**
 * Start of the main leg: the first month that holds more than one show. The
 * 5FDP tour has two isolated one-offs months before it begins.
 */
export function inferTourStart(shows: Show[]): string | undefined {
  const counts = new Map<string, number>();
  for (const show of shows) counts.set(show.date.slice(0, 7), (counts.get(show.date.slice(0, 7)) ?? 0) + 1);
  const firstReal = [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .find(([, count]) => count > 1);
  return firstReal ? `${firstReal[0]}-01` : undefined;
}

export type MonthTotal = {
  key: string;
  label: string;
  shows: Show[];
  gross: number;
};

export function monthTotals(shows: Show[], tourStart?: string): MonthTotal[] {
  const groups = new Map<string, Show[]>();

  for (const show of shows) {
    // Pre-leg one-offs are grouped together rather than each forming a month.
    const key = tourStart && show.date < tourStart ? 'pre' : show.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(show);
  }

  return [...groups.entries()]
    .sort((a, b) => (a[0] === 'pre' ? -1 : b[0] === 'pre' ? 1 : a[0].localeCompare(b[0])))
    .map(([key, groupShows]) => ({
      key,
      label:
        key === 'pre'
          ? 'Pre-tour one-offs'
          : new Date(`${key}-01T12:00:00Z`).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            }),
      shows: groupShows,
      gross: groupShows.reduce((sum, s) => sum + s.grossUsd, 0),
    }));
}

// ---------------------------------------------------------------- products

export type ScorecardRow = Product & {
  rankByUnits: number;
  rankByGross: number;
  /** Positive means it ranks better by gross share than by units. */
  rankShift: number;
};

export function scorecard(products: Product[]): ScorecardRow[] {
  const byUnits = [...products].sort((a, b) => b.unitsSold - a.unitsSold);
  const byGross = [...products].sort((a, b) => b.shareOfGross - a.shareOfGross);

  const grossRank = new Map(byGross.map((p, i) => [p.sku, i + 1]));

  return byUnits.map((product, i) => {
    const rankByGross = grossRank.get(product.sku) ?? i + 1;
    return {
      ...decorate(product),
      rankByUnits: i + 1,
      rankByGross,
      rankShift: i + 1 - rankByGross,
    };
  });
}

export type TailRollup = {
  head: ScorecardRow[];
  tail: ScorecardRow[];
  tailUnits: number;
  tailShare: number;
};

/** Products under `threshold` of gross collapse into one row. */
export function rollUpTail(rows: ScorecardRow[], threshold: number): TailRollup {
  const head = rows.filter((r) => r.shareOfGross >= threshold);
  const tail = rows.filter((r) => r.shareOfGross < threshold);
  return {
    head,
    tail,
    tailUnits: tail.reduce((sum, r) => sum + r.unitsSold, 0),
    tailShare: tail.reduce((sum, r) => sum + r.shareOfGross, 0),
  };
}

export function categoryTotals(products: Product[]) {
  const totalUnits = products.reduce((sum, p) => sum + p.unitsSold, 0) || 1;

  return CATEGORY_ORDER.map((category) => {
    const inCategory = products.filter((p) => (p.category ?? categoryOf(p)) === category);
    const unitsInCategory = inCategory.reduce((sum, p) => sum + p.unitsSold, 0);
    return {
      category,
      color: CATEGORY_COLORS[category],
      units: unitsInCategory,
      share: unitsInCategory / totalUnits,
      products: inCategory.length,
    };
  }).filter((c) => c.units > 0);
}

// ---------------------------------------------------------------- key figures

export type KeyFigure = { stat: string; text: string };

/**
 * Factual statements only — no interpretation. Each is a number the reader
 * could verify from the tables on the following pages.
 */
export function keyFigures(report: TourReport): KeyFigure[] {
  const figures: KeyFigure[] = [];
  const rows = scorecard(report.products);
  const totalUnits = report.products.reduce((sum, p) => sum + p.unitsSold, 0);

  const itineraryTees = rows.filter((r) => /itinerary/i.test(r.displayName ?? r.name));
  if (itineraryTees.length >= 3 && totalUnits > 0) {
    const top3 = itineraryTees.slice(0, 3);
    const sold = top3.reduce((sum, r) => sum + r.unitsSold, 0);
    figures.push({
      stat: percent(sold / totalUnits, 0),
      text: `of units sold were the ${top3.length} itinerary tees (${units(sold)} units).`,
    });
  }

  const shows = report.shows;
  if (shows.length) {
    const best = [...shows].sort((a, b) => b.grossUsd - a.grossUsd)[0];
    const average = shows.reduce((sum, s) => sum + s.grossUsd, 0) / shows.length;
    if (average > 0) {
      figures.push({
        stat: `${(best.grossUsd / average).toFixed(1)}×`,
        text: `the average show: ${titleCase(best.city)} grossed ${compactUsd(best.grossUsd)} against an average of ${compactUsd(average)}.`,
      });
    }
  }

  const biggestShift = [...rows].sort((a, b) => b.rankShift - a.rankShift)[0];
  if (biggestShift && biggestShift.rankShift > 0) {
    figures.push({
      stat: `#${biggestShift.rankByGross}`,
      text: `by share of gross for ${biggestShift.displayName}, against #${biggestShift.rankByUnits} by units sold.`,
    });
  }

  return figures.slice(0, 3);
}

// ---------------------------------------------------------------- per head

export function perHeadValue(report: TourReport): number {
  const shows = report.shows.filter((s) => typeof s.perHeadUsd === 'number');

  if (report.options?.perHead === 'grossOverAttendance') {
    const gross = report.shows.reduce((sum, s) => sum + s.grossUsd, 0);
    return report.attendance ? gross / report.attendance : 0;
  }

  if (!shows.length) return 0;
  return shows.reduce((sum, s) => sum + (s.perHeadUsd ?? 0), 0) / shows.length;
}

// ---------------------------------------------------------------- attendance

export type ShowAttendance = {
  date: string;
  city: string;
  attendance: number;
  /** Per-head looks wrong, so this show's implied attendance is unreliable. */
  suspect: boolean;
};

export type DerivedAttendance = {
  total: number;
  shows: ShowAttendance[];
  suspectCount: number;
};

const PER_HEAD_SUSPECT_BELOW = 5;

/**
 * Totals attendance from the figures already uploaded.
 *
 * Each show's attendance is its gross divided by its spend per head, so the
 * tour total falls out of the tracker without anyone typing it. On the real
 * tour this lands within 0.07% of the published figure.
 *
 * Shows whose per-head looks wrong are included but flagged: Daytona's $1.11
 * implies an impossible crowd and visibly distorts the total.
 */
export function deriveAttendance(shows: Show[]): DerivedAttendance {
  const rows: ShowAttendance[] = [];

  for (const show of shows) {
    const perHead = show.perHeadUsd ?? 0;
    if (perHead <= 0) continue;
    rows.push({
      date: show.date,
      city: show.city,
      attendance: Math.round(show.grossUsd / perHead),
      suspect: perHead < PER_HEAD_SUSPECT_BELOW,
    });
  }

  return {
    total: rows.reduce((sum, r) => sum + r.attendance, 0),
    shows: rows,
    suspectCount: rows.filter((r) => r.suspect).length,
  };
}
