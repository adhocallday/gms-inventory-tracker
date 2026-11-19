/**
 * Merge a malformed duplicate SKU into the real one (default GHOSRX203275B →
 * GHOSRX203275BK, the Ghost "Running Shorts (BLACK)" duplicate).
 *
 * DRY RUN by default: backs up every affected row to a JSON file and prints
 * what it would change. Nothing is written unless --apply is passed; with
 * --apply everything runs in one database transaction.
 *
 *   npx tsx scripts/merge-malformed-sku.ts [--from GHOSRX203275B] [--to GHOSRX203275BK]
 *       [--backup path.json] [--images drop|repoint] [--apply]
 *
 * What moves:
 * - tour_products: a source row whose (tour, size) also exists on the target
 *   has its sales, comps and PO lines moved to the target row and is then
 *   deleted; other source rows are repointed to the target product.
 *   sales is unique per (show, tour_product): a clash is summed into the
 *   target row (qty_sold, gross_sales) and the source row deleted.
 * - SKU-text tables (show_comps, projections, stock movements, …): the sku is
 *   rewritten; where a unique key would clash, quantities are summed into the
 *   target row and the source row deleted.
 * - design_assets: product_id and sku repointed.
 * - product_images: dropped by default (the image on GHOSRX203275B is the cap,
 *   confirmed by its printed caption); --images repoint keeps them as
 *   non-primary images on the target.
 * - the source product is deleted last.
 */
import { config } from 'dotenv';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import pg from 'pg';

config({ path: path.join(process.cwd(), '.env.local') });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const FROM = (arg('from') ?? 'GHOSRX203275B').toUpperCase();
const TO = (arg('to') ?? 'GHOSRX203275BK').toUpperCase();
const APPLY = process.argv.includes('--apply');
const IMAGES = (arg('images') ?? 'drop') as 'drop' | 'repoint';
const BACKUP = arg('backup') ?? path.join(process.cwd(), `merge-backup-${FROM}-to-${TO}-${Date.now()}.json`);

/** SKU-text tables: the columns that, with sku, make a row unique; the columns summed on a clash. */
const SKU_TABLES: { table: string; key: string[]; sum: string[] }[] = [
  { table: 'show_comps', key: ['show_id', 'size', 'comp_type'], sum: ['quantity'] },
  { table: 'initial_inventory', key: ['scenario_id', 'size'], sum: ['quantity'] },
  { table: 'product_show_projections', key: ['scenario_id', 'show_id', 'size'], sum: ['projected_units', 'projected_gross'] },
  { table: 'product_warehouse_allocations', key: ['scenario_id', 'tour_id', 'warehouse_location_id', 'size'], sum: ['allocated_units'] },
  { table: 'reorder_thresholds', key: ['tour_id', 'size'], sum: [] },
  { table: 'product_stock_movements', key: [], sum: [] },
  { table: 'show_deliveries', key: [], sum: [] },
  // Overrides are absolute values, not counts: on a clash the target's value stays.
  { table: 'forecast_overrides', key: ['scenario_id', 'tour_id', 'show_id', 'size', 'bucket'], sum: [] },
];

type Row = Record<string, unknown>;
interface Step {
  table: string;
  action: string;
  id: string;
  detail?: string;
  sql: string;
  params: unknown[];
}

async function main() {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const q = async (sql: string, params: unknown[] = []) => (await db.query(sql, params)).rows as Row[];

  try {
    await db.query(APPLY ? 'BEGIN' : 'BEGIN READ ONLY');

    const [from] = await q('select * from products where upper(sku) = $1', [FROM]);
    const [to] = await q('select * from products where upper(sku) = $1', [TO]);
    if (!from) throw new Error(`${FROM} is not in products (already merged?)`);
    if (!to) throw new Error(`${TO} is not in products`);
    console.log(`${APPLY ? 'APPLY' : 'DRY RUN'}: merge ${FROM} "${from.description}" into ${TO} "${to.description}"\n`);

    const fromTps = await q('select * from tour_products where product_id = $1 order by tour_id, size', [from.id]);
    const toTps = await q('select * from tour_products where product_id = $1', [to.id]);
    const fromTpIds = fromTps.map((r) => r.id);
    const sales = fromTpIds.length ? await q('select * from sales where tour_product_id = any($1)', [fromTpIds]) : [];
    const comps = fromTpIds.length ? await q('select * from comps where tour_product_id = any($1)', [fromTpIds]) : [];
    const poLines = fromTpIds.length ? await q('select * from po_line_items where tour_product_id = any($1)', [fromTpIds]) : [];
    const images = await q('select * from product_images where product_id = $1', [from.id]);
    const designAssets = await q('select * from design_assets where product_id = $1 or upper(sku) = $2', [from.id, FROM]);
    const skuRows: Record<string, Row[]> = {};
    for (const t of SKU_TABLES) skuRows[t.table] = await q(`select * from ${t.table} where upper(sku) = $1`, [FROM]);

    // Rows on the target that the merge would add to (backed up too).
    const toTpIds = toTps.map((r) => r.id);
    const targetSales = toTpIds.length ? await q('select * from sales where tour_product_id = any($1)', [toTpIds]) : [];
    const targetSkuRows: Record<string, Row[]> = {};
    for (const t of SKU_TABLES) targetSkuRows[t.table] = await q(`select * from ${t.table} where upper(sku) = $1`, [TO]);

    writeFileSync(
      BACKUP,
      JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          from: FROM,
          to: TO,
          products: { from, to },
          tour_products: { from: fromTps, to: toTps },
          sales,
          target_sales: targetSales,
          comps,
          po_line_items: poLines,
          product_images: images,
          design_assets: designAssets,
          sku_tables: skuRows,
          target_sku_tables: targetSkuRows,
        },
        null,
        1
      )
    );
    console.log(`Backup of every affected row: ${BACKUP}\n`);

    const steps: Step[] = [];
    const tpTarget = new Map<string, Row | undefined>();
    for (const tp of fromTps) tpTarget.set(String(tp.id), toTps.find((t) => t.tour_id === tp.tour_id && t.size === tp.size));

    // sales / comps / PO lines
    for (const s of sales) {
      const target = tpTarget.get(String(s.tour_product_id));
      if (!target) continue; // moves with its repointed tour_product
      const clash = targetSales.find((t) => t.show_id === s.show_id && t.tour_product_id === target.id);
      if (clash) {
        steps.push({
          table: 'sales',
          action: 'sum into target, delete',
          id: String(s.id),
          detail: `${s.qty_sold} units / $${s.gross_sales} into ${clash.id}`,
          sql: 'update sales set qty_sold = coalesce(qty_sold,0) + $2, gross_sales = coalesce(gross_sales,0) + $3, updated_at = now() where id = $1',
          params: [clash.id, s.qty_sold ?? 0, s.gross_sales ?? 0],
        });
        steps.push({ table: 'sales', action: '(delete source)', id: String(s.id), sql: 'delete from sales where id = $1', params: [s.id] });
      } else {
        steps.push({
          table: 'sales',
          action: 'repoint',
          id: String(s.id),
          detail: `${s.qty_sold} units / $${s.gross_sales} → tour_product ${target.size}`,
          sql: 'update sales set tour_product_id = $2, updated_at = now() where id = $1',
          params: [s.id, target.id],
        });
      }
    }
    for (const [table, rows] of [['comps', comps], ['po_line_items', poLines]] as const) {
      for (const r of rows) {
        const target = tpTarget.get(String(r.tour_product_id));
        if (!target) continue;
        steps.push({
          table,
          action: 'repoint',
          id: String(r.id),
          detail: table === 'comps' ? `${r.quantity} comps` : `${r.quantity_ordered} ordered`,
          sql: `update ${table} set tour_product_id = $2, updated_at = now() where id = $1`,
          params: [r.id, target.id],
        });
      }
    }
    for (const tp of fromTps) {
      const target = tpTarget.get(String(tp.id));
      steps.push(
        target
          ? { table: 'tour_products', action: 'delete (target has this size)', id: String(tp.id), detail: `${tp.size}`, sql: 'delete from tour_products where id = $1', params: [tp.id] }
          : { table: 'tour_products', action: 'repoint to target product', id: String(tp.id), detail: `${tp.size}`, sql: 'update tour_products set product_id = $2, updated_at = now() where id = $1', params: [tp.id, to.id] }
      );
    }

    // SKU-text tables
    for (const t of SKU_TABLES) {
      for (const r of skuRows[t.table]) {
        const clash = t.key.length
          ? targetSkuRows[t.table].find((x) => t.key.every((k) => x[k] === r[k]))
          : undefined;
        if (clash) {
          if (t.sum.length) {
            steps.push({
              table: t.table,
              action: 'sum into target, delete',
              id: String(r.id),
              detail: t.sum.map((c) => `${c} ${r[c]}`).join(', '),
              sql: `update ${t.table} set ${t.sum.map((c, i) => `${c} = coalesce(${c},0) + $${i + 2}`).join(', ')}, updated_at = now() where id = $1`,
              params: [clash.id, ...t.sum.map((c) => r[c] ?? 0)],
            });
          }
          const differs =
            !t.sum.length && t.table === 'forecast_overrides' && clash.override_units !== r.override_units
              ? `source ${r.override_units} vs target ${clash.override_units}`
              : undefined;
          steps.push({
            table: t.table,
            action: t.sum.length ? '(delete source)' : differs ? 'delete (target row kept, values differ)' : 'delete (target row kept, same value)',
            id: String(r.id),
            detail: differs,
            sql: `delete from ${t.table} where id = $1`,
            params: [r.id],
          });
        } else {
          steps.push({
            table: t.table,
            action: 'rewrite sku',
            id: String(r.id),
            sql: `update ${t.table} set sku = $2${t.table === 'forecast_overrides' ? '' : ', updated_at = now()'} where id = $1`,
            params: [r.id, TO],
          });
        }
      }
    }

    for (const d of designAssets) {
      steps.push({ table: 'design_assets', action: 'repoint', id: String(d.id), sql: 'update design_assets set product_id = $2, sku = $3 where id = $1', params: [d.id, to.id, TO] });
    }
    for (const img of images) {
      steps.push(
        IMAGES === 'drop'
          ? { table: 'product_images', action: 'delete (wrong image)', id: String(img.id), detail: `primary=${img.is_primary}`, sql: 'delete from product_images where id = $1', params: [img.id] }
          : { table: 'product_images', action: 'repoint as non-primary', id: String(img.id), sql: 'update product_images set product_id = $2, is_primary = false, updated_at = now() where id = $1', params: [img.id, to.id] }
      );
    }
    steps.push({ table: 'products', action: 'delete source product', id: String(from.id), sql: 'delete from products where id = $1', params: [from.id] });

    // Summary
    const units = sales.reduce((s, r) => s + Number(r.qty_sold ?? 0), 0);
    const gross = sales.reduce((s, r) => s + Number(r.gross_sales ?? 0), 0);
    console.log('Affected rows');
    console.log(`  tour_products   ${fromTps.length} on ${FROM} (${fromTps.map((r) => r.size).join(', ')}); ${toTps.length} on ${TO}`);
    console.log(`  sales           ${sales.length} rows, ${units} units, $${gross.toFixed(2)}`);
    console.log(`  comps           ${comps.length}`);
    console.log(`  po_line_items   ${poLines.length}`);
    console.log(`  product_images  ${images.length} (${IMAGES})`);
    console.log(`  design_assets   ${designAssets.length}`);
    for (const t of SKU_TABLES) console.log(`  ${t.table.padEnd(15)} ${skuRows[t.table].length}`);

    const byAction = new Map<string, number>();
    for (const s of steps) byAction.set(`${s.table}: ${s.action}`, (byAction.get(`${s.table}: ${s.action}`) ?? 0) + 1);
    console.log('\nPlanned changes');
    for (const [k, n] of byAction) console.log(`  ${String(n).padStart(4)}  ${k}`);
    if (process.argv.includes('--verbose')) {
      for (const s of steps) console.log(`    ${s.table} ${s.id.slice(0, 8)} ${s.action}${s.detail ? `  ${s.detail}` : ''}`);
    }

    if (!APPLY) {
      await db.query('ROLLBACK');
      console.log('\nDry run: nothing was written. Re-run with --apply to make these changes in one transaction.');
      return;
    }
    for (const s of steps) await db.query(s.sql, s.params);
    await db.query('COMMIT');
    console.log(`\nApplied ${steps.length} changes.`);
  } catch (e) {
    await db.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
