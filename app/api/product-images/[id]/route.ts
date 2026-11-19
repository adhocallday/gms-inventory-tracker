import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createServiceClient } from '@/lib/supabase/client';
import { PRODUCT_IMAGES_BUCKET, storagePathFromUrl } from '@/lib/grab-sheet/catalog';

/**
 * GET /api/product-images/[id]?w=480 → one product photo, resized to WebP.
 *
 * file_url is either a legacy data URL (~400 KB each) or a URL in the
 * product-images storage bucket (grab-sheet approvals and uploads). Both are
 * resized here, so pages link to this route and the CDN caches the result;
 * storage is read with the service role, so it works for a private bucket too.
 * Any other https URL is redirected to.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const WIDTHS = [160, 320, 480, 800, 1200];

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  // Snap to a fixed set of widths so the cache holds a few variants per photo.
  const requested = Number(request.nextUrl.searchParams.get('w')) || 480;
  const width = WIDTHS.find((w) => w >= requested) ?? WIDTHS[WIDTHS.length - 1];

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('product_images')
      .select('file_url')
      .eq('id', params.id)
      .maybeSingle();
    if (error) throw error;

    const url = data?.file_url as string | undefined;
    if (!url) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    let source: Buffer;
    const storagePath = /^https:\/\//.test(url) ? storagePathFromUrl(url) : null;
    if (storagePath) {
      const { data: file, error: dlError } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).download(storagePath);
      if (dlError || !file) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      source = Buffer.from(await file.arrayBuffer());
    } else if (/^https:\/\//.test(url)) {
      return NextResponse.redirect(url);
    } else {
      const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]*)$/.exec(url);
      if (!match || !IMAGE_TYPES.has(match[1])) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      source = Buffer.from(match[2], 'base64');
    }

    const resized = await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    return new NextResponse(new Uint8Array(resized), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('product image failed:', error);
    return NextResponse.json({ error: 'Image unavailable' }, { status: 500 });
  }
}
