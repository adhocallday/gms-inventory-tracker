import { describe, expect, it } from 'vitest';
import { assertImageSourceColumns, GrabSheetSetupError, validateItem } from './approve';
import { storagePathFromUrl } from './catalog';
import type { SupabaseClient } from '@supabase/supabase-js';

const box = { x: 0.1, y: 0.1, w: 0.2, h: 0.2 };
const good = {
  tileId: 'p1-t1',
  sku: 'GHOSNS103665BK',
  productId: null,
  cropDataUrl: 'data:image/webp;base64,AAAA',
  imageBox: box,
  captionBox: box,
  sourceFile: 'GHOST.xlsx',
  sourcePage: 3,
  skuRead: 'GHOSNS103665BK',
  confidence: 0.9,
};

describe('validateItem', () => {
  it('accepts a well-formed item', () => expect(validateItem(good)).toBeNull());
  it('rejects malformed SKUs, boxes and crops', () => {
    expect(validateItem({ ...good, sku: 'GHOSRX203275B' })).toMatch(/valid SKU/);
    expect(validateItem({ ...good, imageBox: { x: 2, y: 0, w: 0, h: 0 } })).toMatch(/Boxes/);
    expect(validateItem({ ...good, cropDataUrl: 'https://x/y.png' })).toMatch(/data URL/);
    expect(validateItem({ ...good, newProduct: { name: '', sizes: [], price: null } })).toMatch(/name/);
  });
});

describe('assertImageSourceColumns', () => {
  const fake = (error: { code?: string; message: string } | null) =>
    ({ from: () => ({ select: () => ({ limit: async () => ({ error }) }) }) }) as unknown as SupabaseClient;
  it('explains a missing migration', async () => {
    await expect(assertImageSourceColumns(fake({ code: '42703', message: 'column product_images.source does not exist' }))).rejects.toBeInstanceOf(
      GrabSheetSetupError
    );
    await expect(assertImageSourceColumns(fake({ code: '42703', message: 'x' }))).rejects.toThrow(/migration 010/);
  });
  it('passes when the columns exist', async () => {
    await expect(assertImageSourceColumns(fake(null))).resolves.toBeUndefined();
  });
});

describe('storagePathFromUrl', () => {
  it('finds the bucket path in public and signed URLs', () => {
    expect(storagePathFromUrl('https://abc.supabase.co/storage/v1/object/public/product-images/grab-sheet/GHOS/1-p1.webp')).toBe('grab-sheet/GHOS/1-p1.webp');
    expect(storagePathFromUrl('https://abc.supabase.co/storage/v1/object/sign/product-images/a%20b.png?token=x')).toBe('a b.png');
    expect(storagePathFromUrl('https://img.example.com/cap.png')).toBeNull();
  });
});
