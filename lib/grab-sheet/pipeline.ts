import { detectTiles, verifyCrop, type SpendGuard } from '@/lib/ai/parsers/grab-sheet-parser';
import { AIParseError } from '@/lib/ai/claude-client';
import { isDegenerate, normaliseBox, unionBox } from './geometry';
import { cropForVerify, cropProduct, differenceHash, preparePage } from './image';
import { flagDuplicateSkus, matchTile, normaliseSku, verifyRead, type CatalogProduct } from './sku-match';
import type { GrabSheetPageResult, GrabSheetTile, TileVerification } from './types';

/**
 * One grab-sheet page end to end: detect (Opus) → crop (sharp) → verify
 * (Haiku) → match (rules). Writes nothing.
 */

export interface PageInput {
  bytes: Buffer;
  sourceFile: string;
  sourcePage: number;
  label: string;
}

export interface PipelineDeps {
  catalog: CatalogProduct[];
  /** Hash of a product's current primary image, fetched on demand. */
  primaryHash?: (imageId: string) => Promise<string | null>;
  guard?: SpendGuard;
  /** Parallel Haiku verifications (default 4). */
  concurrency?: number;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function runGrabSheetPage(input: PageInput, deps: PipelineDeps): Promise<GrabSheetPageResult> {
  const page = await preparePage(input.bytes);
  const pageKey = `p${input.sourcePage}`;
  const detected = await detectTiles({ ...page, label: input.label }, deps.guard);

  const hashCache = new Map<string, Promise<string | null>>();
  const hashFor = (imageId: string) => {
    if (!deps.primaryHash) return Promise.resolve(null);
    if (!hashCache.has(imageId)) hashCache.set(imageId, deps.primaryHash(imageId).catch(() => null));
    return hashCache.get(imageId)!;
  };

  const usable = detected
    .map((t) => ({
      t,
      imageBox: normaliseBox(t.image_box, page.width, page.height),
      captionBox: normaliseBox(t.caption_box, page.width, page.height),
    }))
    .filter((d) => !isDegenerate(d.imageBox));

  const tiles = await mapLimit(usable, deps.concurrency ?? 4, async ({ t, imageBox, captionBox }, i): Promise<GrabSheetTile> => {
    const id = `${pageKey}-t${i + 1}`;
    const crop = await cropProduct(page.jpeg, imageBox);
    const sku = normaliseSku(t.sku) ?? normaliseSku(`${t.sku} ${t.name}`);

    let verification: TileVerification;
    try {
      const verifyJpeg = await cropForVerify(page.jpeg, unionBox(imageBox, captionBox));
      const read = await verifyCrop({ jpeg: verifyJpeg, label: `${input.label} ${id} ${t.sku}` }, deps.guard);
      verification = verifyRead({ pageSku: sku, pageRaw: t.sku, cropRaw: read.sku_text, captionMatchesItem: read.caption_matches_item });
    } catch (e) {
      if (e instanceof AIParseError && e.message.startsWith('Stopped before')) throw e;
      verification = {
        status: 'needs_review',
        skuRead: null,
        rawRead: '',
        captionMatchesItem: null,
        reason: `Verification failed: ${(e as Error).message}`,
      };
    }

    const product = sku ? deps.catalog.find((p) => p.sku === sku) : undefined;
    const [cropHash, existingHash] = await Promise.all([
      product?.primaryImageId ? differenceHash(crop) : Promise.resolve(null),
      product?.primaryImageId ? hashFor(product.primaryImageId) : Promise.resolve(null),
    ]);
    const catalogView = product && existingHash
      ? deps.catalog.map((p) => (p.id === product.id ? { ...p, primaryImageHash: existingHash } : p))
      : deps.catalog;
    const match = matchTile({ sku, rawSku: t.sku, cropHash }, catalogView);

    return {
      id,
      pageKey,
      sourceFile: input.sourceFile,
      sourcePage: input.sourcePage,
      rawSku: t.sku,
      sku,
      name: t.name,
      sizes: t.sizes ?? [],
      price: t.price ?? null,
      captionBox,
      imageBox,
      confidence: Math.max(0, Math.min(1, t.confidence ?? 0)),
      cropDataUrl: `data:image/webp;base64,${crop.toString('base64')}`,
      verification,
      match,
    };
  });

  return {
    pageKey,
    sourceFile: input.sourceFile,
    sourcePage: input.sourcePage,
    label: input.label,
    width: page.width,
    height: page.height,
    tiles: flagDuplicateSkus(tiles),
  };
}
