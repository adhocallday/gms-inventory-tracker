import type { NormBox } from './types';

/**
 * Box maths for grab-sheet crops. Pure, so it is unit-tested without sharp.
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Pixel box (as the vision model returns it) → normalised 0–1 box, clamped to the page. */
export function normaliseBox(
  box: { x: number; y: number; w: number; h: number },
  width: number,
  height: number
): NormBox {
  const x0 = clamp01(box.x / width);
  const y0 = clamp01(box.y / height);
  const x1 = clamp01((box.x + box.w) / width);
  const y1 = clamp01((box.y + box.h) / height);
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}

export interface PixelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Normalised box → integer pixel rectangle for sharp.extract, with padding as
 * a fraction of the box size, clamped inside the image. Always at least 1×1.
 */
export function boxToPixels(box: NormBox, imageWidth: number, imageHeight: number, pad = 0.04): PixelRect {
  const padX = box.w * pad;
  const padY = box.h * pad;
  const x0 = clamp01(box.x - padX);
  const y0 = clamp01(box.y - padY);
  const x1 = clamp01(box.x + box.w + padX);
  const y1 = clamp01(box.y + box.h + padY);

  const left = Math.min(Math.floor(x0 * imageWidth), imageWidth - 1);
  const top = Math.min(Math.floor(y0 * imageHeight), imageHeight - 1);
  const right = Math.max(Math.ceil(x1 * imageWidth), left + 1);
  const bottom = Math.max(Math.ceil(y1 * imageHeight), top + 1);
  return {
    left,
    top,
    width: Math.min(right, imageWidth) - left,
    height: Math.min(bottom, imageHeight) - top,
  };
}

/** Smallest box holding both boxes (the product picture plus its caption, for verification). */
export function unionBox(a: NormBox, b: NormBox): NormBox {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  };
}

/** True when a box is too small to be a real tile (under 1% of the page on a side). */
export function isDegenerate(box: NormBox): boolean {
  return box.w < 0.01 || box.h < 0.01;
}
