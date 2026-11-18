#!/usr/bin/env node
/**
 * Rebuild the Ghost SKELETOUR 2025 sales and comps from GMS's tour workbook.
 *
 *   node scripts/reload-ghost-sales-from-workbook.mjs <workbook.xlsx> [--apply]
 *
 * Why: the original data load posted only part of each show's sales (89,401 of
 * 156,163 units), and spread each show's gross over those units.
 *
 * Source of truth (01 GHOST 2025 TOUR.xlsx):
 *   - one sheet per item: Code in row 1, then per show Date | City | Sales |
 *     Band Co | GMS Co. Units per product per show; no sizes.
 *   - "Tour Gross Sales": gross per show (USD).
 *   - "Inventory": Sales column (J), used to check the per-item totals.
 *
 * Rules:
 *   - Units per product per show come from the item sheet, exactly.
 *   - Sizes: the workbook has none, so a product's units are split across its
 *     sizes by that product's existing size mix in the database (largest
 *     remainder, so sizes sum exactly). Fallback: received quantities per size,
 *     then an even split.
 *   - Gross per line: the show's gross spread by units, the convention GMS's
 *     own sales chart uses ("% of gross" there is unit share).
 *   - Comps: Band Co → 'band', GMS Co → 'gms'.
 *
 * Without --apply it only prints what it would write. With --apply it replaces
 * the tour's sales and comps in one transaction and refreshes
 * inventory_balances. Back up first:
 *   pg_dump "$DATABASE_URL" --data-only --table=public.sales --table=public.comps
 */
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const { Client } = require('pg');

const TOUR_ID = '123e4567-e89b-12d3-a456-426614174000';
const [workbookPath, ...flags] = process.argv.slice(2);
const apply = flags.includes('--apply');
if (!workbookPath) {
  console.error('Usage: node scripts/reload-ghost-sales-from-workbook.mjs <workbook.xlsx> [--apply]');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set (load .env.local first).');
  process.exit(1);
}

const excelDate = (n) => new Date(Date.UTC(1899, 11, 30) + n * 86_400_000).toISOString().slice(0, 10);
const rowsOf = (wb, name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' });

/** Split `total` into integers proportional to `weights` (largest remainder). */
export function splitByWeights(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total === 0) return weights.map(() => 0);
  const shares = sum > 0 ? weights.map((w) => (total * w) / sum) : weights.map(() => total / weights.length);
  const out = shares.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  shares
    .map((s, i) => ({ i, r: s - Math.floor(s) }))
    .sort((a, b) => b.r - a.r || a.i - b.i)
    .forEach(({ i }) => {
      if (left > 0) {
        out[i] += 1;
        left -= 1;
      }
    });
  return out;
}

// ---------------------------------------------------------------- workbook
const wb = XLSX.readFile(workbookPath);

const grossByDate = new Map();
for (const r of rowsOf(wb, 'Tour Gross Sales').slice(6)) {
  if (typeof r[0] === 'number' && r[0] > 40000 && typeof r[2] === 'number') grossByDate.set(excelDate(r[0]), r[2]);
}

const inventoryUnits = new Map();
for (const r of rowsOf(wb, 'Inventory').slice(6)) {
  if (typeof r[1] === 'string' && r[1].startsWith('GHO')) inventoryUnits.set(r[1].trim(), Number(r[9]) || 0);
}

/** sku → date → { units, band, gms } */
const itemSales = new Map();
for (const name of wb.SheetNames) {
  const rows = rowsOf(wb, name);
  const code = rows[0]?.[18];
  if (typeof code !== 'string' || !code.startsWith('GHO')) continue;
  const byDate = itemSales.get(code.trim()) ?? new Map();
  for (const r of rows.slice(3)) {
    if (typeof r[0] !== 'number' || r[0] < 40000) continue;
    const date = excelDate(r[0]);
    const prev = byDate.get(date) ?? { units: 0, band: 0, gms: 0 };
    byDate.set(date, {
      units: prev.units + (Number(r[2]) || 0),
      band: prev.band + (Number(r[3]) || 0),
      gms: prev.gms + (Number(r[4]) || 0),
    });
  }
  itemSales.set(code.trim(), byDate);
}

// ---------------------------------------------------------------- database
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const shows = (
  await db.query('select id, show_date::text as date, city from shows where tour_id = $1', [TOUR_ID])
).rows;
const showByDate = new Map(shows.map((s) => [s.date, s]));

const tourProducts = (
  await db.query(
    `select tp.id, tp.size, p.sku
       from tour_products tp join products p on p.id = tp.product_id
      where tp.tour_id = $1`,
    [TOUR_ID],
  )
).rows;
const sizesBySku = new Map();
for (const tp of tourProducts) {
  const list = sizesBySku.get(tp.sku) ?? [];
  list.push(tp);
  sizesBySku.set(tp.sku, list);
}

const soldByTp = new Map(
  (
    await db.query(
      `select s.tour_product_id, sum(s.qty_sold)::int as q
         from sales s join tour_products tp on tp.id = s.tour_product_id
        where tp.tour_id = $1 group by 1`,
      [TOUR_ID],
    )
  ).rows.map((r) => [r.tour_product_id, r.q]),
);
const receivedByTp = new Map(
  (
    await db.query(
      `select pli.tour_product_id, sum(pli.quantity_ordered)::int as q
         from po_line_items pli join tour_products tp on tp.id = pli.tour_product_id
        where tp.tour_id = $1 group by 1`,
      [TOUR_ID],
    )
  ).rows.map((r) => [r.tour_product_id, r.q]),
);

// ---------------------------------------------------------------- build
const problems = [];
const sales = [];
const comps = [];
const showUnits = new Map();
const mixSource = { 'existing sales': 0, received: 0, even: 0, 'single size': 0 };

for (const [sku, byDate] of itemSales) {
  const sizes = sizesBySku.get(sku);
  if (!sizes) {
    const total = [...byDate.values()].reduce((a, v) => a + v.units, 0);
    if (total > 0) problems.push(`${sku}: ${total} units in the workbook but no tour product in the database`);
    continue;
  }
  sizes.sort((a, b) => a.size.localeCompare(b.size));

  let weights = sizes.map((tp) => soldByTp.get(tp.id) ?? 0);
  let source = 'existing sales';
  if (sizes.length === 1) source = 'single size';
  else if (weights.every((w) => w === 0)) {
    weights = sizes.map((tp) => receivedByTp.get(tp.id) ?? 0);
    source = weights.some((w) => w > 0) ? 'received' : 'even';
  }
  mixSource[source] += 1;

  const workbookTotal = [...byDate.values()].reduce((a, v) => a + v.units, 0);
  const inventoryTotal = inventoryUnits.get(sku);
  if (inventoryTotal !== undefined && inventoryTotal !== workbookTotal) {
    problems.push(`${sku}: item sheet sums to ${workbookTotal}, Inventory tab says ${inventoryTotal}`);
  }

  for (const [date, v] of byDate) {
    const show = showByDate.get(date);
    if (!show) {
      if (v.units || v.band || v.gms) problems.push(`${sku}: sales on ${date} but no such show in the database`);
      continue;
    }
    splitByWeights(v.units, weights).forEach((q, i) => {
      if (q > 0) sales.push({ show_id: show.id, tour_product_id: sizes[i].id, qty: q });
    });
    showUnits.set(show.id, (showUnits.get(show.id) ?? 0) + v.units);
    for (const [type, qty] of [['band', v.band], ['gms', v.gms]]) {
      if (qty <= 0) continue;
      // Comps aren't sized in the workbook; book them on the largest size by the same mix.
      const tpIndex = weights.indexOf(Math.max(...weights));
      comps.push({ show_id: show.id, tour_product_id: sizes[Math.max(tpIndex, 0)].id, comp_type: type, quantity: qty });
    }
  }
}

// Gross: each show's workbook gross spread by units.
const grossByShowId = new Map();
for (const [date, gross] of grossByDate) {
  const show = showByDate.get(date);
  if (show) grossByShowId.set(show.id, gross);
  else problems.push(`gross for ${date} but no such show in the database`);
}
for (const line of sales) {
  const gross = grossByShowId.get(line.show_id) ?? 0;
  const units = showUnits.get(line.show_id) || 1;
  line.gross = Math.round(((gross * line.qty) / units) * 100) / 100;
}
// Put each show's rounding remainder on its largest line, so show totals match to the cent.
for (const [showId, gross] of grossByShowId) {
  const lines = sales.filter((l) => l.show_id === showId);
  if (!lines.length) continue;
  const cents = Math.round(gross * 100) - lines.reduce((a, l) => a + Math.round(l.gross * 100), 0);
  const largest = lines.reduce((a, l) => (l.qty > a.qty ? l : a));
  largest.gross = (Math.round(largest.gross * 100) + cents) / 100;
}
for (const line of sales) line.unit_price = line.qty ? Math.round((line.gross / line.qty) * 100) / 100 : 0;

// ---------------------------------------------------------------- report
const sum = (xs, f) => xs.reduce((a, x) => a + f(x), 0);
const before = (
  await db.query(
    `select coalesce(sum(s.qty_sold),0)::int as units, coalesce(sum(s.gross_sales),0)::float as gross, count(*)::int as lines
       from sales s join shows sh on sh.id = s.show_id where sh.tour_id = $1`,
    [TOUR_ID],
  )
).rows[0];
console.log(`Workbook: ${itemSales.size} item sheets, ${grossByDate.size} shows with gross`);
console.log(`Before:  ${before.lines} lines, ${before.units} units, $${before.gross.toFixed(2)}`);
console.log(
  `After:   ${sales.length} lines, ${sum(sales, (l) => l.qty)} units, $${sum(sales, (l) => l.gross).toFixed(2)}` +
    ` (workbook gross $${sum([...grossByDate.values()], (g) => g).toFixed(2)})`,
);
console.log(`Comps:   ${comps.length} lines, ${sum(comps, (c) => c.quantity)} units`);
console.log('Size mix from:', JSON.stringify(mixSource));
console.log(problems.length ? `Problems (${problems.length}):\n  ${problems.join('\n  ')}` : 'Problems: none');

if (!apply) {
  console.log('\nDry run. Re-run with --apply to write.');
  await db.end();
  process.exit(0);
}

// ---------------------------------------------------------------- write
try {
  await db.query('begin');
  await db.query(
    'delete from sales where show_id in (select id from shows where tour_id = $1)',
    [TOUR_ID],
  );
  await db.query(
    'delete from comps where show_id in (select id from shows where tour_id = $1)',
    [TOUR_ID],
  );
  for (let i = 0; i < sales.length; i += 500) {
    const chunk = sales.slice(i, i + 500);
    const values = [];
    const params = [];
    chunk.forEach((l, j) => {
      const b = j * 6;
      values.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6})`);
      params.push(randomUUID(), l.show_id, l.tour_product_id, l.qty, l.unit_price, l.gross);
    });
    await db.query(
      `insert into sales (id, show_id, tour_product_id, qty_sold, unit_price, gross_sales) values ${values.join(',')}`,
      params,
    );
  }
  for (const c of comps) {
    await db.query(
      'insert into comps (id, show_id, tour_product_id, comp_type, quantity) values ($1,$2,$3,$4,$5)',
      [randomUUID(), c.show_id, c.tour_product_id, c.comp_type, c.quantity],
    );
  }
  await db.query('select public.refresh_inventory_balances()');
  await db.query('commit');
  console.log('\nApplied.');
} catch (error) {
  await db.query('rollback');
  console.error('Rolled back:', error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
