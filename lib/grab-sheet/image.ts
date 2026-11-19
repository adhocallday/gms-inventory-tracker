import sharp from 'sharp';
import { boxToPixels } from './geometry';
import type { NormBox } from './types';

/**
 * Server-side image work for grab sheets (sharp). Crops follow the POP image
 * cleanup in MerchFlow Charts (lib/parse/pop-image.ts): extract first, then
 * trim whitespace in a second pass (sharp rejects extract + trim in one chain).
 */

export async function imageSize(input: Buffer): Promise<{ width: number; height: number }> {
  const meta = await sharp(input).metadata();
  if (!meta.width || !meta.height) throw new Error('Could not read the image size');
  return { width: meta.width, height: meta.height };
}

/** The page image as sent to the vision model: flattened on white, ≤2576 px long edge, JPEG. */
export async function preparePage(input: Buffer): Promise<{ jpeg: Buffer; width: number; height: number }> {
  const jpeg = await sharp(input)
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize(2576, 2576, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  const { width, height } = await imageSize(jpeg);
  return { jpeg, width, height };
}

/** Product crop: padded box → trimmed → webp at most `size` px. */
export async function cropProduct(page: Buffer, box: NormBox, size = 800): Promise<Buffer> {
  const { width, height } = await imageSize(page);
  const rect = boxToPixels(box, width, height, 0.04);
  const extracted = await sharp(page).extract(rect).flatten({ background: '#ffffff' }).png().toBuffer();
  let trimmed: Buffer;
  try {
    trimmed = await sharp(extracted).trim({ threshold: 12 }).png().toBuffer();
  } catch {
    // trim throws on a uniform image; keep the untrimmed crop.
    trimmed = extracted;
  }
  return sharp(trimmed)
    .resize(size, size, { fit: 'inside', withoutEnlargement: true })
    .extend({ top: 8, bottom: 8, left: 8, right: 8, background: '#ffffff' })
    .webp({ quality: 88 })
    .toBuffer();
}

/** Picture + caption region for the verification read, JPEG ≤1000 px. */
export async function cropForVerify(page: Buffer, box: NormBox): Promise<Buffer> {
  const { width, height } = await imageSize(page);
  const rect = boxToPixels(box, width, height, 0.06);
  return sharp(page)
    .extract(rect)
    .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();
}

/**
 * 256-bit difference hash (16×16, hex) for "is this the same picture" checks.
 * Trims whitespace first so framing differences matter less.
 */
export async function differenceHash(input: Buffer, trim = true): Promise<string> {
  let src = input;
  if (trim) {
    try {
      src = await sharp(input).flatten({ background: '#ffffff' }).trim({ threshold: 12 }).png().toBuffer();
    } catch {
      /* uniform image: hash as is */
    }
  }
  const n = 16;
  const { data } = await sharp(src)
    .flatten({ background: '#ffffff' })
    .greyscale()
    .resize(n + 1, n, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let hex = '';
  let nibble = 0;
  let count = 0;
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      nibble = (nibble << 1) | (data[y * (n + 1) + x] > data[y * (n + 1) + x + 1] ? 1 : 0);
      count += 1;
      if (count % 4 === 0) {
        hex += nibble.toString(16);
        nibble = 0;
      }
    }
  }
  return hex;
}

/**
 * Hashes of an existing product image and of its top 90–70%. Older manual
 * images carry the printed caption under the picture; the crop does not, so
 * the closest variant is the fair comparison. Comma-separated.
 */
export async function existingImageHashes(input: Buffer): Promise<string> {
  let src = input;
  try {
    src = await sharp(input).flatten({ background: '#ffffff' }).trim({ threshold: 12 }).png().toBuffer();
  } catch {
    /* keep untrimmed */
  }
  const { width, height } = await imageSize(src);
  const out: string[] = [];
  for (const f of [1, 0.9, 0.85, 0.8, 0.75, 0.7]) {
    const part = await sharp(src).extract({ left: 0, top: 0, width, height: Math.max(1, Math.round(height * f)) }).png().toBuffer();
    out.push(await differenceHash(part, false));
  }
  return out.join(',');
}

/** Decodes `data:<mime>;base64,...` to bytes, or null. */
export function dataUrlToBuffer(url: string): Buffer | null {
  const m = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]*)$/.exec(url);
  return m ? Buffer.from(m[2], 'base64') : null;
}
