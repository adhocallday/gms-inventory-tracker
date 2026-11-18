import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * GET /api/product-images/[id]?w=480 → one product photo, resized to WebP.
 *
 * Photos are stored in product_images.file_url as data URLs (~400 KB each).
 * Embedding them in pages made the tour report 16 MB, so pages link here and
 * the CDN caches the resized image.
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
    if (/^https:\/\//.test(url)) return NextResponse.redirect(url);

    const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]*)$/.exec(url);
    if (!match || !IMAGE_TYPES.has(match[1])) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const resized = await sharp(Buffer.from(match[2], 'base64'))
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
