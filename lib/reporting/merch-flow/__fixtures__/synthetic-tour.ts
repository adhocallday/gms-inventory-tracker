import type { Product, Show, TrackerData } from '../types';

/**
 * A small, entirely made-up tour shaped like the Charts app's real tracker
 * fixture (which holds client sales data and is not copied here). It carries
 * the same kinds of problems the real tour did: two pre-leg one-offs, one with
 * an implausible per head; two misspelled cities; a "CAPTIANS" product typo; a
 * high-price jersey that ranks far better by gross than by units; and a long
 * tail under 1% of gross.
 */

const PRODUCTS: [sku: string, name: string, units: number, price: number][] = [
  ['TSTARX203225BK', 'BLACK 2026 AMERICA ITIN TEE', 4000, 45],
  ['TSTARX203227BK', 'BLACK SKELETON CREW TEE', 2500, 45],
  ['TSTARX203228BK', 'BLACK WARHEAD ITIN TEE', 2200, 45],
  ['TSTARX203226BK', 'BLACK RATTLESNAKE ITIN TEE', 1800, 45],
  ['TSTARX203230BK', 'EYE OF THE STORM ZIP HOODIE', 900, 95],
  ['TSTARX303217BK', 'LEGIONS CAPTIANS HAT', 700, 35],
  ['TSTARX103218BK', 'KNUCKLEHEAD BANDANA', 400, 15],
  ['TSTARX103219OT', 'BLACK AND YELLOW BANDANA', 350, 15],
  ['TSTANS503207OT', 'USA HOCKEY JERSEY', 300, 150],
  ['TSTARX003219BK', 'FORGIVE US FLAG', 60, 25],
  ['TSTARX003240OT', 'ENAMEL PIN', 40, 10],
];

const productGross = PRODUCTS.reduce((sum, [, , units, price]) => sum + units * price, 0);

export const syntheticProducts: Product[] = PRODUCTS.map(([sku, name, unitsSold, price]) => ({
  sku,
  name,
  unitsSold,
  shareOfGross: (unitsSold * price) / productGross,
  grossUsd: unitsSold * price,
}));

const SHOWS: [date: string, city: string, gross: number, perHead: number, cad?: number][] = [
  // Pre-leg one-offs. Daytona's per head is the planted entry error.
  ['2026-03-14', 'DAYTONA', 49_735, 1.11],
  ['2026-04-02', 'MESCALERO', 61_200, 24.1],
  ['2026-07-08', 'HUNTSVILE', 118_400, 26.3],
  ['2026-07-10', 'NASHVILLE', 142_900, 27.8],
  ['2026-07-12', 'VIRGINA BEACH', 101_750, 23.9],
  ['2026-07-15', 'TORONTO', 155_300, 28.4, 211_900],
  ['2026-08-02', 'CHICAGO', 171_600, 29.2],
  ['2026-08-05', 'DETROIT', 133_250, 25.6],
  ['2026-08-08', 'MONTREAL', 126_800, 24.7, 173_000],
  ['2026-09-01', 'DENVER', 149_900, 27.1],
  ['2026-09-04', 'PHOENIX', 112_300, 22.8],
  ['2026-09-06', 'LOS ANGELES', 188_450, 30.6],
];

export const syntheticShows: Show[] = SHOWS.map(([date, city, grossUsd, perHeadUsd, cad]) => ({
  date,
  city,
  grossUsd,
  perHeadUsd,
  grossSecondCurrency: cad,
}));

export const syntheticTracker: TrackerData = {
  artist: 'Synthetic Artist',
  tourDates: 'Mar 14 – Sep 6, 2026',
  products: syntheticProducts,
  shows: syntheticShows,
  attendance: 0,
};
