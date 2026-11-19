import type { SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { PRODUCT_IMAGES_BUCKET, readImageBytes } from './catalog';
import { dataUrlToBuffer } from './image';
import { normaliseSku } from './sku-match';
import type { NormBox } from './types';

/**
 * Writes approved grab-sheet tiles. The only write path for grab-sheet
 * results, and only reached from the review screen's Approve.
 */

export interface ApproveItem {
  tileId: string;
  sku: string;
  /** Catalog product to attach to; omitted for an approved new product. */
  productId?: string | null;
  cropDataUrl: string;
  imageBox: NormBox;
  captionBox: NormBox;
  sourceFile: string;
  sourcePage: number;
  skuRead: string | null;
  confidence: number;
  /** Present only when the reviewer approved creating this product. */
  newProduct?: { name: string; sizes: string[]; price: number | null; productType?: string } | null;
}

export interface ApproveResult {
  tileId: string;
  sku: string;
  ok: boolean;
  productId?: string;
  imageId?: string;
  createdProduct?: boolean;
  replacedImageIds?: string[];
  error?: string;
}

export class GrabSheetSetupError extends Error {}

const MIGRATION_COLUMNS = 'source, source_file, source_page, bbox, sku_read, confidence';
const MAX_CROP_BYTES = 3 * 1024 * 1024;

const isBox = (b: unknown): b is NormBox =>
  !!b &&
  typeof b === 'object' &&
  (['x', 'y', 'w', 'h'] as const).every((k) => {
    const v = (b as Record<string, unknown>)[k];
    return typeof v === 'number' && v >= 0 && v <= 1;
  });

/** Validates one item from the request body; returns an error message or null. */
export function validateItem(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return 'Item must be an object';
  const it = raw as Partial<ApproveItem>;
  if (typeof it.tileId !== 'string' || !it.tileId) return 'Missing tileId';
  if (typeof it.sku !== 'string' || normaliseSku(it.sku) !== it.sku) return `Not a valid SKU: ${String(it.sku)}`;
  if (it.productId != null && typeof it.productId !== 'string') return 'Bad productId';
  if (typeof it.cropDataUrl !== 'string' || !/^data:image\/(webp|png|jpeg);base64,/.test(it.cropDataUrl)) return 'Crop must be a data URL';
  if (!isBox(it.imageBox) || !isBox(it.captionBox)) return 'Boxes must be normalised 0–1';
  if (typeof it.sourceFile !== 'string' || typeof it.sourcePage !== 'number') return 'Missing source';
  if (typeof it.confidence !== 'number' || it.confidence < 0 || it.confidence > 1) return 'Bad confidence';
  if (it.newProduct) {
    const np = it.newProduct;
    if (typeof np.name !== 'string' || !np.name.trim()) return 'New product needs a name';
    if (!Array.isArray(np.sizes) || np.sizes.some((s) => typeof s !== 'string')) return 'New product sizes must be strings';
    if (np.price != null && (typeof np.price !== 'number' || np.price < 0)) return 'Bad price';
  }
  return null;
}

/** Throws a clear error when migration 010 hasn't run yet. */
export async function assertImageSourceColumns(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.from('product_images').select(MIGRATION_COLUMNS).limit(1);
  if (!error) return;
  if (error.code === '42703' || /column .* does not exist/i.test(error.message)) {
    throw new GrabSheetSetupError(
      'Run migration 010_product_image_source.sql first: product_images has no source, bbox or confidence columns yet. Nothing was saved.'
    );
  }
  throw new Error(error.message);
}

/** Creates the product-images bucket on first use (public read, as the existing uploads expect). */
export async function ensureBucket(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase.storage.getBucket(PRODUCT_IMAGES_BUCKET);
  if (data && !error) return;
  const created = await supabase.storage.createBucket(PRODUCT_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  });
  if (created.error && !/already exists/i.test(created.error.message)) {
    throw new Error(`Could not create the ${PRODUCT_IMAGES_BUCKET} bucket: ${created.error.message}`);
  }
}

async function resolveProduct(
  supabase: SupabaseClient,
  item: ApproveItem,
  tourId: string | null
): Promise<{ id: string; created: boolean }> {
  if (item.productId) {
    const { data, error } = await supabase.from('products').select('id, sku').eq('id', item.productId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Product not found');
    if (data.sku.trim().toUpperCase() !== item.sku) throw new Error(`Product is ${data.sku}, not ${item.sku}`);
    return { id: data.id, created: false };
  }
  const { data: existing, error } = await supabase.from('products').select('id').eq('sku', item.sku).maybeSingle();
  if (error) throw new Error(error.message);
  if (existing) return { id: existing.id, created: false };

  if (!item.newProduct) throw new Error(`${item.sku} is not in the catalog; approve it as a new product`);
  if (!tourId) throw new Error('Pick a tour to add new products to');

  const np = item.newProduct;
  const { data: product, error: insErr } = await supabase
    .from('products')
    .insert({ sku: item.sku, description: np.name.trim(), product_type: np.productType?.trim() || 'other' })
    .select('id')
    .single();
  if (insErr) throw new Error(insErr.message);

  const sizes = np.sizes.length ? np.sizes : ['OS'];
  const { error: tpErr } = await supabase.from('tour_products').insert(
    sizes.map((size) => ({
      tour_id: tourId,
      product_id: product.id,
      size,
      suggested_retail: np.price,
      is_active: true,
    }))
  );
  if (tpErr) {
    await supabase.from('products').delete().eq('id', product.id);
    throw new Error(tpErr.message);
  }
  return { id: product.id, created: true };
}

/** Copies an image about to be replaced into the bucket (replaced/<id>.<ext>) so it can be restored. */
async function backupReplaced(supabase: SupabaseClient, row: { id: string; file_url: string; mime_type: string | null }) {
  const bytes = await readImageBytes(supabase, row.file_url);
  if (!bytes) return;
  const mime = row.mime_type ?? 'image/png';
  const ext = mime.split('/')[1] ?? 'png';
  await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(`replaced/${row.id}.${ext}`, bytes, { contentType: mime, upsert: true });
}

export async function approveItems(
  supabase: SupabaseClient,
  items: ApproveItem[],
  { tourId }: { tourId: string | null }
): Promise<ApproveResult[]> {
  await assertImageSourceColumns(supabase);
  await ensureBucket(supabase);

  const results: ApproveResult[] = [];
  for (const item of items) {
    try {
      const crop = dataUrlToBuffer(item.cropDataUrl);
      if (!crop || crop.byteLength > MAX_CROP_BYTES) throw new Error('Crop image is missing or too large');
      const webp = await sharp(crop).webp({ quality: 88 }).toBuffer();
      const meta = await sharp(webp).metadata();

      const product = await resolveProduct(supabase, item, tourId);

      const path = `grab-sheet/${item.sku}/${Date.now()}-${item.tileId.replace(/[^a-z0-9-]/gi, '')}.webp`;
      const up = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(path, webp, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
      if (up.error) throw new Error(up.error.message);
      const { data: pub } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);

      // Replace: the old primary images go (backed up to the bucket first).
      const { data: old, error: oldErr } = await supabase
        .from('product_images')
        .select('id, file_url, mime_type')
        .eq('product_id', product.id)
        .eq('is_primary', true);
      if (oldErr) throw new Error(oldErr.message);
      for (const row of old ?? []) await backupReplaced(supabase, row);
      if (old?.length) {
        const { error: demoteErr } = await supabase
          .from('product_images')
          .update({ is_primary: false })
          .in('id', old.map((r) => r.id));
        if (demoteErr) throw new Error(demoteErr.message);
      }

      const { data: inserted, error: insErr } = await supabase
        .from('product_images')
        .insert({
          product_id: product.id,
          tour_id: tourId,
          image_type: 'grab_sheet',
          file_url: pub.publicUrl,
          file_size: webp.byteLength,
          mime_type: 'image/webp',
          width: meta.width ?? null,
          height: meta.height ?? null,
          is_primary: true,
          display_order: 0,
          source: 'grab_sheet',
          source_file: item.sourceFile,
          source_page: item.sourcePage,
          bbox: { image: item.imageBox, caption: item.captionBox },
          sku_read: item.skuRead,
          confidence: Math.round(item.confidence * 1000) / 1000,
        })
        .select('id')
        .single();
      if (insErr) {
        // Put the old primaries back; the upload is orphaned but harmless.
        if (old?.length) await supabase.from('product_images').update({ is_primary: true }).in('id', old.map((r) => r.id));
        throw new Error(insErr.message);
      }
      if (old?.length) {
        await supabase.from('product_images').delete().in('id', old.map((r) => r.id));
      }

      results.push({
        tileId: item.tileId,
        sku: item.sku,
        ok: true,
        productId: product.id,
        imageId: inserted.id,
        createdProduct: product.created,
        replacedImageIds: (old ?? []).map((r) => r.id),
      });
    } catch (e) {
      results.push({ tileId: item.tileId, sku: item.sku, ok: false, error: (e as Error).message });
    }
  }
  return results;
}
