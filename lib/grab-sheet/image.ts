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
 * 64-bit difference hash (hex) for "is this the same picture" checks.
 * Trims whitespace first so framing differences between a crop and an older
 * manual image matter less.
 */
export async function differenceHash(input: Buffer): Promise<string> {
  let src = input;
  try {
    src = await sharp(input).flatten({ background: '#ffffff' }).trim({ threshold: 12 }).png().toBuffer();
  } catch {
    /* uniform image: hash as is */
  }
  const { data } = await sharp(src)
    .flatten({ background: '#ffffff' })
    .greyscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bits = '';
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      bits += data[y * 9 + x] > data[y * 9 + x + 1] ? '1' : '0';
    }
  }
  let hex = '';
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

/** Decodes `data:<mime>;base64,...` to bytes, or null. */
export function dataUrlToBuffer(url: string): Buffer | null {
  const m = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]*)$/.exec(url);
  return m ? Buffer.from(m[2], 'base64') : null;
}
