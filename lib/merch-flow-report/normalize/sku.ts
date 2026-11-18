/**
 * SKU grammar: ARTIST(4) + TYPE(RX|NS|PNS) + 6 digits + COLORWAY(BK|OT|RD|…)
 * e.g. FFDPRX203225BK
 *
 * AtVenu-sourced data appends a size, e.g. FFDPRX203225BK_XL.
 */

const SIZE_SUFFIX = /_([A-Z0-9]{1,3})$/;

export const TRACKER_SIZES = [
  'XS', 'SM', 'MED', 'LG', 'XL', '2X', '3X', '4X', '5X', 'OS',
] as const;

const SIZE_ALIASES: Record<string, string> = {
  S: 'SM', SMALL: 'SM',
  M: 'MED', MEDIUM: 'MED',
  L: 'LG', LARGE: 'LG',
  XXL: '2X', '2XL': '2X',
  XXXL: '3X', '3XL': '3X',
  XXXXL: '4X', '4XL': '4X',
  XXXXXL: '5X', '5XL': '5X',
  'ONE SIZE': 'OS', ONESIZE: 'OS',
};

/** Strips any size suffix so a SKU can be used as a join key. */
export function baseSku(sku: string): string {
  return sku.trim().toUpperCase().replace(SIZE_SUFFIX, '');
}

export function sizeFromSku(sku: string): string | undefined {
  const match = sku.trim().toUpperCase().match(SIZE_SUFFIX);
  if (!match) return undefined;
  return normalizeSize(match[1]);
}

export function normalizeSize(size: string): string {
  const upper = size.trim().toUpperCase();
  return SIZE_ALIASES[upper] ?? upper;
}

/** True for anything shaped like a GMS SKU — used to validate OCR'd captions. */
export function looksLikeSku(value: string): boolean {
  return /^[A-Z]{4}[A-Z]{2,3}\d{6}[A-Z]{2}$/.test(baseSku(value));
}

/**
 * Digits that read as letters in the colourway suffix.
 *
 * Grab-sheet captions are read off a rendered page, where "OT" routinely comes
 * back as "0T". Repairing only the two-character suffix keeps the six-digit
 * body — which is genuinely numeric — untouched.
 */
const OCR_LETTERS: Record<string, string> = { '0': 'O', '1': 'I', '5': 'S', '8': 'B' };

function repairSuffix(sku: string): string {
  const match = sku.match(/^([A-Z]{4}[A-Z]{2,3}\d{6})([A-Z0-9]{2})$/);
  if (!match) return sku;
  const suffix = match[2].replace(/[0158]/g, (d) => OCR_LETTERS[d] ?? d);
  return match[1] + suffix;
}

/**
 * Pulls a SKU out of a grab-sheet caption such as
 * "FFDPRX303217BK: Legions Captians Hat".
 */
export function skuFromCaption(caption: string): string | undefined {
  const text = caption.toUpperCase().replace(/\s+/g, '');
  // Accept digits in the colourway so an OCR slip is repairable rather than
  // silently dropping the product.
  const match = text.match(/[A-Z]{4}[A-Z]{2,3}\d{6}[A-Z0-9]{2}/);
  if (!match) return undefined;

  const repaired = repairSuffix(match[0]);
  return looksLikeSku(repaired) ? repaired : undefined;
}
