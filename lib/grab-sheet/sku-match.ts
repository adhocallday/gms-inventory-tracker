import { skuFromCaption } from '@/lib/merch-flow-report/normalize/sku';
import type { MatchStatus, TileMatch, TileVerification } from './types';

/**
 * Rules that decide what a detected tile means. No AI here: the models only
 * read pixels; these functions decide whether a read is trusted and what it
 * would change.
 */

/** Uppercase and strip spaces, colons and punctuation from a raw transcription. */
export function cleanRead(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const PREFIX_LETTERS: Record<string, string> = { '0': 'O', '1': 'I', '5': 'S', '8': 'B' };

/**
 * A caption read → a valid SKU (with OCR suffix repair), or null.
 * Also repairs digits read in the four-letter artist code ("GH0S" → "GHOS")
 * when the read starts with the SKU; the vendored normaliser only repairs the
 * colourway suffix.
 */
export function normaliseSku(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const direct = skuFromCaption(raw);
  if (direct) return direct;
  const cleaned = cleanRead(raw);
  const fixed = cleaned.slice(0, 4).replace(/[0158]/g, (d) => PREFIX_LETTERS[d] ?? d) + cleaned.slice(4);
  return fixed !== cleaned ? (skuFromCaption(fixed) ?? null) : null;
}

/**
 * Compares the page read (Opus) with the crop read-back (Haiku).
 * Verified only when both normalise to the same valid SKU and Haiku agrees the
 * caption describes the pictured item. Anything else needs a person.
 */
export function verifyRead(input: {
  pageSku: string | null;
  pageRaw: string;
  cropRaw: string;
  captionMatchesItem: boolean | null;
}): TileVerification {
  const skuRead = normaliseSku(input.cropRaw);
  const base = { skuRead, rawRead: input.cropRaw, captionMatchesItem: input.captionMatchesItem };

  if (!input.pageSku) {
    // An unreadable caption can still be "verified" as consistent if both reads
    // agree character for character, but it can never auto-attach.
    const same = cleanRead(input.pageRaw) !== '' && cleanRead(input.pageRaw) === cleanRead(input.cropRaw);
    return { ...base, status: 'needs_review', reason: same ? 'Caption is not a valid SKU (both reads agree)' : 'Caption is not a valid SKU' };
  }
  if (!skuRead) {
    return { ...base, status: 'needs_review', reason: 'Could not read a SKU back from the crop' };
  }
  if (skuRead !== input.pageSku) {
    return { ...base, status: 'needs_review', reason: `Crop reads ${skuRead}, page reads ${input.pageSku}` };
  }
  if (input.captionMatchesItem === false) {
    return { ...base, status: 'needs_review', reason: 'Caption does not seem to describe the pictured item' };
  }
  return { ...base, status: 'verified' };
}

export interface CatalogProduct {
  id: string;
  sku: string;
  description: string | null;
  /** Primary product_images row, if any. */
  primaryImageId?: string | null;
  /** Difference hashes of that image (hex, comma-separated variants; the closest counts). */
  primaryImageHash?: string | null;
}

/**
 * Hamming distance (of 256 bits) at or below this counts as the same picture.
 * Deliberately strict: on the Ghost sheets two different black tees came
 * within 29, so anything looser would hide a wrong image as "same".
 */
export const SAME_IMAGE_MAX_DISTANCE = 24;

/** For a malformed read like GHOSRX203275B: the one catalog SKU that extends it by a single character. */
export function suggestSku(raw: string, catalog: CatalogProduct[]): string | null {
  const read = cleanRead(raw);
  if (read.length < 8) return null;
  const hits = catalog.filter((p) => p.sku.length === read.length + 1 && p.sku.startsWith(read) && normaliseSku(p.sku));
  return hits.length === 1 ? hits[0].sku : null;
}

/**
 * Exact SKU match against the catalog.
 * - unreadable: no valid SKU on the caption
 * - new: valid SKU not in the catalog (a suggestion; never auto-created)
 * - conflict: the product already has a primary image that looks different
 * - matched: the image would attach (or replace the same picture)
 */
export function matchTile(
  input: { sku: string | null; rawSku: string; cropHash?: string | null },
  catalog: CatalogProduct[],
  hashDistance: (a: string, b: string) => number = hammingHex
): TileMatch {
  if (!input.sku) {
    return {
      status: 'unreadable',
      productId: null,
      productName: null,
      suggestedSku: suggestSku(input.rawSku, catalog),
    };
  }
  const product = catalog.find((p) => p.sku === input.sku);
  if (!product) return { status: 'new', productId: null, productName: null };

  const base = { productId: product.id, productName: product.description, existingImageId: product.primaryImageId ?? null };
  if (!product.primaryImageId) return { ...base, status: 'matched', hashDistance: null };

  if (input.cropHash && product.primaryImageHash) {
    const d = Math.min(...product.primaryImageHash.split(',').map((h) => hashDistance(input.cropHash!, h)));
    return {
      ...base,
      status: d <= SAME_IMAGE_MAX_DISTANCE ? 'matched' : 'conflict',
      hashDistance: d,
      note: d <= SAME_IMAGE_MAX_DISTANCE ? 'Same picture as the current image' : 'Has a different primary image',
    };
  }
  return { ...base, status: 'conflict', hashDistance: null, note: 'Has a primary image that could not be compared' };
}

/** Marks every tile after the first that claims the same SKU as needing review. */
export function flagDuplicateSkus<T extends { sku: string | null; verification: TileVerification }>(tiles: T[]): T[] {
  const seen = new Set<string>();
  return tiles.map((t) => {
    if (!t.sku) return t;
    if (!seen.has(t.sku)) {
      seen.add(t.sku);
      return t;
    }
    return { ...t, verification: { ...t.verification, status: 'needs_review', reason: `${t.sku} appears more than once` } };
  });
}

/** Hamming distance between two equal-length hex strings. */
export function hammingHex(a: string, b: string): number {
  if (a.length !== b.length) return Math.max(a.length, b.length) * 4;
  let d = 0;
  for (let i = 0; i < a.length; i += 1) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

export const MATCH_LABELS: Record<MatchStatus, string> = {
  matched: 'Matched',
  new: 'New product',
  unreadable: 'Unreadable',
  conflict: 'Conflict',
};

/** Can this tile be bulk-approved with "Approve all matched"? */
export function isAutoApprovable(t: { verification: TileVerification; match: TileMatch }): boolean {
  return t.verification.status === 'verified' && t.match.status === 'matched';
}
