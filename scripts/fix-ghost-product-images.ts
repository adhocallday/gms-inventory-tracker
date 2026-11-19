/**
 * DRY RUN: Ghost product images from the grab sheets.
 *
 * Runs the grab-sheet pipeline on the GRAB and GRAB 2 sheets of
 * "GHOST SUMMER 2025 SALES CHART.xlsx" and prints, per SKU, the image it would
 * attach next to what product_images holds today. It reads the database and
 * writes nothing; approving happens on /admin/products/grab-sheet.
 *
 *   npx tsx scripts/fix-ghost-product-images.ts --out /tmp/ghost-grab.json [--cap 3]
 *   (--pages N limits the run to the first N pages)
 *   npx tsx scripts/fix-ghost-product-images.ts --from-json /tmp/ghost-grab.json   (no API calls)
 *
 * The saved JSON loads into the review screen ("Load saved result").
 */
import { config } from 'dotenv';
import path from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { extractXlsxPageImages } from '@/lib/grab-sheet/xlsx-media';
import { runGrabSheetPage } from '@/lib/grab-sheet/pipeline';
import { loadCatalog, primaryHashLoader, readImageBytes } from '@/lib/grab-sheet/catalog';
import { differenceHash, dataUrlToBuffer, existingImageHashes } from '@/lib/grab-sheet/image';
import { flagDuplicateSkus, hammingHex, normaliseSku, SAME_IMAGE_MAX_DISTANCE } from '@/lib/grab-sheet/sku-match';
import { SpendGuard, verifyCrop } from '@/lib/ai/parsers/grab-sheet-parser';
import sharp from 'sharp';
import type { GrabSheetRunResult, GrabSheetTile } from '@/lib/grab-sheet/types';

config({ path: path.join(process.cwd(), '.env.local') });

const DEFAULT_XLSX = path.resolve(
  process.cwd(),
  '../gms-inventory-tracker/ghosttrackers/GHOST SUMMER 2025 SALES CHART.xlsx'
);
const CAP_SKU = 'GHOSNS103665BK';
const SHORTS_SKUS = ['GHOSRX203275B', 'GHOSRX203275BK'];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const usd = (n: number) => `$${n.toFixed(4)}`;

async function main() {
  const xlsxPath = arg('xlsx') ?? DEFAULT_XLSX;
  const fromJson = arg('from-json');
  const outPath = arg('out');
  const cap = Number(arg('cap') ?? '3');

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const catalog = await loadCatalog(supabase);

  const guard = new SpendGuard(cap, (u, total) =>
    console.log(
      `  [api] ${u.task.padEnd(17)} ${u.model.padEnd(16)} in ${String(u.inputTokens).padStart(6)} out ${String(u.outputTokens).padStart(6)}  ${usd(u.costUsd)}  ${(u.latencyMs / 1000).toFixed(1)}s  ${u.stopReason}  (total ${usd(total)})  ${u.label}`
    )
  );

  let result: GrabSheetRunResult;
  if (fromJson) {
    result = JSON.parse(readFileSync(fromJson, 'utf8'));
    console.log(`Loaded ${fromJson} (no API calls)\n`);
  } else {
    if (!existsSync(xlsxPath)) throw new Error(`Missing ${xlsxPath}`);
    const allPages = await extractXlsxPageImages(readFileSync(xlsxPath), { sheets: ['GRAB', 'GRAB 2'] });
    const pages = allPages.slice(0, Number(arg('pages') ?? allPages.length));
    console.log(`${pages.length} page images in ${path.basename(xlsxPath)} (GRAB, GRAB 2)\n`);

    const hash = primaryHashLoader(supabase);
    result = { version: 1, createdAt: new Date().toISOString(), sourceFile: path.basename(xlsxPath), pages: [], usage: guard.calls };
    for (const [i, p] of pages.entries()) {
      const label = `${p.sheet} #${p.index}`;
      console.log(`Page ${i + 1}: ${label}`);
      try {
        const page = await runGrabSheetPage(
          { bytes: Buffer.from(p.bytes), sourceFile: result.sourceFile, sourcePage: i + 1, label },
          { catalog, primaryHash: hash, guard }
        );
        result.pages.push(page);
        console.log(`  ${page.tiles.length} tiles\n`);
      } catch (e) {
        console.error(`  stopped: ${(e as Error).message} ${(e as { details?: string }).details ?? ''}`);
        break;
      }
      if (outPath) writeFileSync(outPath, JSON.stringify(result));
    }
  }

  // Duplicates across pages need review too.
  const tiles = flagDuplicateSkus(result.pages.flatMap((p) => p.tiles));
  if (outPath && !fromJson) writeFileSync(outPath, JSON.stringify(result));

  // What SKU does each current Ghost image actually show? The manual images
  // carry their printed caption, so Haiku reads it (cached next to the result).
  const auditPath = `${outPath ?? fromJson ?? 'ghost-grab'}.existing.json`;
  const shows: Record<string, string> = existsSync(auditPath) ? JSON.parse(readFileSync(auditPath, 'utf8')) : {};
  const withImages = catalog.filter((p) => p.sku.startsWith('GHOS') && p.primaryImageId && !(p.id in shows));
  if (withImages.length && !process.argv.includes('--no-audit')) {
    console.log(`Reading the caption on ${withImages.length} current images`);
    for (const p of withImages) {
      const { data } = await supabase.from('product_images').select('file_url').eq('id', p.primaryImageId!).maybeSingle();
      const bytes = data?.file_url ? await readImageBytes(supabase, data.file_url as string) : null;
      if (!bytes) continue;
      const jpeg = await sharp(bytes).flatten({ background: '#ffffff' }).resize(1000, 1000, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
      try {
        const read = await verifyCrop({ jpeg, label: `current image of ${p.sku}` }, guard);
        shows[p.id] = normaliseSku(read.sku_text) ?? (read.sku_text ? `?${read.sku_text}` : '(no caption)');
      } catch (e) {
        console.error(`  ${p.sku}: ${(e as Error).message}`);
      }
    }
    writeFileSync(auditPath, JSON.stringify(shows, null, 1));
    result.usage.push(...guard.calls.filter((c) => !result.usage.includes(c)));
    console.log('');
  }
  const shown = (productId: string | null | undefined) => (productId && shows[productId]) || null;

  console.log('Tiles per page');
  for (const p of result.pages) console.log(`  ${p.sourcePage}. ${p.label}: ${p.tiles.length}`);

  const verified = tiles.filter((t) => t.verification.status === 'verified').length;
  console.log(`\nVerified ${verified}, needs review ${tiles.length - verified}, total ${tiles.length}`);
  const byStatus = tiles.reduce<Record<string, number>>((a, t) => ((a[t.match.status] = (a[t.match.status] ?? 0) + 1), a), {});
  console.log('Match statuses', byStatus);

  console.log('\nProposed attachments per SKU');
  console.log('  SKU              status      verify        action                       current image');
  for (const t of [...tiles].sort((a, b) => (a.sku ?? a.rawSku).localeCompare(b.sku ?? b.rawSku))) {
    const action = proposedAction(t);
    const showsSku = shown(t.match.productId);
    const current = t.match.existingImageId
      ? `image ${t.match.existingImageId.slice(0, 8)} shows ${showsSku ?? '?'}${showsSku && !showsSku.startsWith('(') && showsSku !== t.sku ? ' (WRONG)' : ''}`
      : 'no image';
    const dist = t.match.hashDistance != null ? ` (hash distance ${t.match.hashDistance})` : '';
    console.log(
      `  ${(t.sku ?? `?${t.rawSku}`).padEnd(16)} ${t.match.status.padEnd(11)} ${t.verification.status.padEnd(13)} ${action.padEnd(28)} ${current}${dist}  "${t.name}"${t.verification.reason ? `  [${t.verification.reason}]` : ''}`
    );
  }

  const tiledSkus = new Set(tiles.map((t) => t.sku).filter(Boolean));
  const imagesNotOnSheet = catalog.filter((p) => p.sku.startsWith('GHOS') && !tiledSkus.has(p.sku));
  console.log(`\nGhost catalog SKUs not on the grab sheets (${imagesNotOnSheet.length}): images left as they are`);
  for (const p of imagesNotOnSheet) {
    const s = shown(p.id);
    console.log(`  ${p.sku.padEnd(16)} ${p.primaryImageId ? `image shows ${s ?? '?'}${s && !s.startsWith('(') && s !== p.sku ? ' (WRONG)' : ''}` : 'no image'}  "${p.description}"`);
  }

  await capAndShorts(tiles, catalog, supabase, shown);

  if (result.usage.length) {
    const total = result.usage.reduce((s, u) => s + u.costUsd, 0);
    const detect = result.usage.filter((u) => u.task === 'grab-sheet-detect');
    const verify = result.usage.filter((u) => u.task === 'grab-sheet-verify');
    console.log(
      `\nAPI: ${detect.length} detect calls ${usd(detect.reduce((s, u) => s + u.costUsd, 0))}, ${verify.length} verify calls ${usd(verify.reduce((s, u) => s + u.costUsd, 0))}, total ${usd(total)}`
    );
  }
  console.log('\nDry run: nothing was written.');
}

function proposedAction(t: GrabSheetTile): string {
  if (t.verification.status !== 'verified') {
    if (t.match.status === 'unreadable' && t.match.suggestedSku) return `review (suggest ${t.match.suggestedSku})`;
    return 'review';
  }
  switch (t.match.status) {
    case 'matched':
      return t.match.existingImageId ? 'replace (same picture)' : 'attach as primary';
    case 'conflict':
      return 'replace wrong image';
    case 'new':
      return 'suggest new product';
    default:
      return 'review';
  }
}

async function capAndShorts(
  tiles: GrabSheetTile[],
  catalog: Awaited<ReturnType<typeof loadCatalog>>,
  supabase: ReturnType<typeof createClient>,
  shown: (productId: string | null | undefined) => string | null
) {
  console.log('\nThe cap and the shorts');
  const capTile = tiles.find((t) => t.sku === CAP_SKU);
  if (!capTile) {
    console.log(`  No tile read as ${CAP_SKU}`);
  } else {
    const capProduct = catalog.find((p) => p.sku === CAP_SKU);
    console.log(
      `  ${CAP_SKU} tile "${capTile.name}" (page ${capTile.sourcePage}): ${capTile.verification.status}, ${capTile.match.status}; would attach to product "${capProduct?.description}"`
    );
  }
  const capHash = capTile ? await differenceHash(dataUrlToBuffer(capTile.cropDataUrl)!) : null;

  for (const sku of SHORTS_SKUS) {
    const product = catalog.find((p) => p.sku === sku);
    if (!product) {
      console.log(`  ${sku}: not in catalog`);
      continue;
    }
    const tile = tiles.find((t) => t.sku === sku || t.match.suggestedSku === sku || t.rawSku.replace(/\W/g, '').toUpperCase() === sku);
    let current = 'no image';
    if (product.primaryImageId) {
      const { data } = await supabase.from('product_images').select('file_url').eq('id', product.primaryImageId).maybeSingle();
      const bytes = data?.file_url ? await readImageBytes(supabase, data.file_url as string) : null;
      const h = bytes ? await existingImageHashes(bytes) : null;
      const d = h && capHash ? Math.min(...h.split(',').map((x) => hammingHex(x, capHash))) : null;
      current =
        d == null
          ? `image ${product.primaryImageId.slice(0, 8)}`
          : `image ${product.primaryImageId.slice(0, 8)}, distance to the cap crop ${d}${d <= SAME_IMAGE_MAX_DISTANCE ? ' => this is the CAP picture' : ''}`;
    }
    const s = shown(product.id);
    console.log(`  ${sku} "${product.description}": ${current}${s ? `; its printed caption reads ${s}` : ''}`);
    if (tile) {
      console.log(
        `    sheet tile "${tile.name}" raw "${tile.rawSku}": ${tile.verification.status}, ${tile.match.status}${tile.match.suggestedSku ? ` -> suggested ${tile.match.suggestedSku}` : ''}`
      );
    }
  }
  console.log(
    `  Proposal: the cap picture goes to ${CAP_SKU}; the shorts get the shorts tile; the wrong image on "Running Shorts (BLACK)" is replaced (and goes with the merge into GHOSRX203275BK, see scripts/merge-malformed-sku.ts).`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
