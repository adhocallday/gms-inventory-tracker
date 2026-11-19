/**
 * Compact, cacheable tour data for projection prompts.
 *
 * The tour data goes in a system block marked cache_control, identical across
 * the Opus projection tasks for a tour, so repeat calls read it from cache.
 * Inputs that vary per call (attendance, per-head, constraints) go in the user
 * message, after the cached prefix. Keep this output deterministic: sorted
 * keys and rows, no timestamps.
 */
import type Anthropic from '@anthropic-ai/sdk';
import type { ProjectionContext } from './projection-agent';

type Row = Record<string, any>;

const num = (v: unknown) => (v ? Number(v) : 0);
const round = (v: number, dp = 2) => Math.round(v * 10 ** dp) / 10 ** dp;

export interface CompactProduct {
  sku: string;
  name: string;
  sold: number;
  gross: number;
  avgPrice: number;
  unitCost: number;
  /** Units sold per size */
  sizes: Record<string, number>;
  onHand: number;
  onOrder: number;
}

export interface CompactTourData {
  tour: string;
  shows: {
    count: number;
    attendance: number;
    gross: number;
    perHead: number;
    /** [date, city, attendance, gross] */
    list: [string, string, number, number][];
  };
  products: CompactProduct[];
}

/** Aggregate size-level rows to one compact record per SKU. */
export function compactTourData(context: ProjectionContext): CompactTourData {
  const bySku = new Map<string, CompactProduct>();
  const skuByProductId = new Map<string, string>();

  (context.productSummary as Row[]).forEach(r => {
    if (!r.sku) return;
    if (r.product_id) skuByProductId.set(r.product_id, r.sku);
    const p: CompactProduct =
      bySku.get(r.sku) ??
      { sku: r.sku, name: r.description ?? r.product_name ?? r.sku, sold: 0, gross: 0, avgPrice: 0, unitCost: 0, sizes: {}, onHand: 0, onOrder: 0 };
    const size = r.size || 'OS';
    p.sizes[size] = (p.sizes[size] ?? 0) + num(r.total_sold);
    p.sold += num(r.total_sold);
    p.gross += num(r.total_gross);
    if (num(r.full_package_cost)) p.unitCost = num(r.full_package_cost);
    bySku.set(r.sku, p);
  });

  (context.inventoryBalances as Row[]).forEach(r => {
    const p = bySku.get(r.sku ?? skuByProductId.get(r.product_id));
    if (p) p.onHand += num(r.balance);
  });
  (context.poOpenQuantities as Row[]).forEach(r => {
    const p = bySku.get(r.sku);
    if (p) p.onOrder += num(r.open_quantity);
  });

  const products = Array.from(bySku.values())
    .map(p => ({
      ...p,
      gross: round(p.gross),
      avgPrice: p.sold ? round(p.gross / p.sold) : 0,
      sizes: Object.fromEntries(Object.entries(p.sizes).sort(([a], [b]) => a.localeCompare(b))),
    }))
    .sort((a, b) => b.gross - a.gross || a.sku.localeCompare(b.sku));

  const shows = (context.showSummary as Row[])
    .map(s => [String(s.show_date ?? ''), String(s.city ?? ''), num(s.attendance), round(num(s.total_gross))] as [string, string, number, number])
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  const attendance = shows.reduce((s, r) => s + r[2], 0);
  const gross = round(shows.reduce((s, r) => s + r[3], 0));

  return {
    tour: context.tourName,
    shows: { count: shows.length, attendance, gross, perHead: attendance ? round(gross / attendance) : 0, list: shows },
    products,
  };
}

const ROLE = `You are an expert merchandise analyst for concert tours. You forecast units, size curves and stock needs from a tour's sales history.

The tour data below is compact JSON:
- shows: totals and a list of [date, city, attendance, gross] per show.
- products: one record per SKU, sorted by gross. sold and gross are tour-to-date; sizes holds units sold per size; avgPrice is gross / sold; unitCost is the full package cost; onHand is the current inventory balance (negative means more sold than received was recorded); onOrder is open purchase-order quantity.
Use these figures; do not invent data. Say so when the data is too thin to support a recommendation.`;

/** System blocks: role, then the tour data with a cache breakpoint. */
export function projectionSystem(context: ProjectionContext): Anthropic.Beta.BetaTextBlockParam[] {
  return [
    { type: 'text', text: ROLE },
    {
      type: 'text',
      text: `TOUR DATA\n${JSON.stringify(compactTourData(context))}`,
      cache_control: { type: 'ephemeral' },
    },
  ];
}

/** The per-call inputs, for the user message. */
export function projectionInputs(context: ProjectionContext): string {
  const attendance = num(context.expectedAttendance);
  const perHead = num(context.expectedPerHead);
  const gross = attendance * perHead;
  return `PROJECTION INPUTS
- Expected attendance: ${Math.round(attendance).toLocaleString('en-US')}
- Expected per-head: $${perHead.toFixed(2)}
- Expected gross: $${Math.round(gross).toLocaleString('en-US')}`;
}
