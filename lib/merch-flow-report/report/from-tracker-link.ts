import type { TrackerData } from '../parse/tracker';
import type { Category, Product, Show } from './types';

/**
 * TrackerData from MerchFlow Tracker's /api/tours/[id]/merch-flow-data.
 *
 * The tracker's copy of these types came from lib/report/types.ts and has
 * since gained optional fields (product grossUsd and compUnits, show
 * attendance). Only the fields this app declares are kept, with types checked,
 * so a change on the tracker side cannot put unexpected values in a report.
 */

const CATEGORIES: Category[] = ['Tees', 'Hoodies & jerseys', 'Headwear', 'Accessories'];

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const optNum = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const optStr = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

function toProduct(raw: Record<string, unknown>): Product {
  const category = CATEGORIES.find((c) => c === raw.category);
  return {
    sku: str(raw.sku),
    name: str(raw.name),
    displayName: optStr(raw.displayName),
    category,
    unitsSold: num(raw.unitsSold),
    shareOfGross: num(raw.shareOfGross),
    supplier: optStr(raw.supplier),
    unitCost: optNum(raw.unitCost),
    closingStock: optNum(raw.closingStock),
  };
}

function toShow(raw: Record<string, unknown>): Show {
  return {
    date: str(raw.date),
    city: str(raw.city),
    grossUsd: num(raw.grossUsd),
    grossSecondCurrency: optNum(raw.grossSecondCurrency),
    perHeadUsd: optNum(raw.perHeadUsd),
  };
}

/** Maps the tracker's JSON onto this app's TrackerData; null if the shape is wrong. */
export function toTrackerData(raw: unknown): TrackerData | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  if (!Array.isArray(t.products) || !Array.isArray(t.shows)) return null;
  return {
    artist: str(t.artist),
    tourDates: str(t.tourDates),
    attendance: num(t.attendance),
    products: (t.products as Record<string, unknown>[]).map(toProduct).filter((p) => p.sku),
    shows: (t.shows as Record<string, unknown>[]).map(toShow).filter((s) => s.date),
  };
}

