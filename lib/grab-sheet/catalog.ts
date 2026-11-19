import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAll } from '@/lib/supabase/fetch-all';
import { dataUrlToBuffer, existingImageHashes } from './image';
import type { CatalogProduct } from './sku-match';

/** Read-only catalog lookups for grab-sheet matching. */

export const PRODUCT_IMAGES_BUCKET = 'product-images';

export async function loadCatalog(supabase: SupabaseClient): Promise<CatalogProduct[]> {
  const products = await fetchAll<{ id: string; sku: string; description: string | null }>((from, to) =>
    supabase.from('products').select('id, sku, description').order('sku').range(from, to)
  );
  const images = await fetchAll<{ id: string; product_id: string; is_primary: boolean | null; display_order: number | null }>(
    (from, to) =>
      supabase
        .from('product_images')
        .select('id, product_id, is_primary, display_order')
        .order('id')
        .range(from, to)
  );

  // The primary image, else the first by display order.
  const best = new Map<string, { id: string; primary: boolean; order: number }>();
  for (const img of images) {
    if (!img.product_id) continue;
    const cand = { id: img.id, primary: !!img.is_primary, order: img.display_order ?? 0 };
    const cur = best.get(img.product_id);
    if (!cur || (cand.primary && !cur.primary) || (cand.primary === cur.primary && cand.order < cur.order)) {
      best.set(img.product_id, cand);
    }
  }

  return products.map((p) => ({
    id: p.id,
    sku: p.sku.trim().toUpperCase(),
    description: p.description,
    primaryImageId: best.get(p.id)?.id ?? null,
  }));
}

/** Path inside the bucket for a Supabase public/sign URL of our product-images bucket, else null. */
export function storagePathFromUrl(url: string): string | null {
  const m = /\/storage\/v1\/object\/(?:public|sign|authenticated)\/product-images\/([^?]+)/.exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Bytes of a product_images.file_url: legacy data URL, our storage bucket, or any https URL. */
export async function readImageBytes(supabase: SupabaseClient, fileUrl: string): Promise<Buffer | null> {
  const inline = dataUrlToBuffer(fileUrl);
  if (inline) return inline;
  const path = storagePathFromUrl(fileUrl);
  if (path) {
    const { data, error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).download(path);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }
  if (/^https:\/\//.test(fileUrl)) {
    const res = await fetch(fileUrl);
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  }
  return null;
}

export function primaryHashLoader(supabase: SupabaseClient) {
  return async (imageId: string): Promise<string | null> => {
    const { data, error } = await supabase.from('product_images').select('file_url').eq('id', imageId).maybeSingle();
    if (error || !data?.file_url) return null;
    const bytes = await readImageBytes(supabase, data.file_url as string);
    return bytes ? existingImageHashes(bytes) : null;
  };
}
