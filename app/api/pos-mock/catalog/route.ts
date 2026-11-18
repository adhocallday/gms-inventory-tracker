import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { productImageUrl } from '@/lib/reporting/merch-flow/from-db';
import { buildCatalogItems, displayName, type Catalog, type TourProductRow } from '@/components/pos-mock/catalog';

/**
 * Read-only catalog for the POS mock (/pos/demo). SELECT queries only; this
 * route never writes.
 *
 *   GET /api/pos-mock/catalog              → Catalog JSON for the first tour
 *   GET /api/pos-mock/catalog?image=<uuid> → that product's primary image
 *
 * Product images are stored as data URLs (up to ~800 KB each), so the JSON
 * carries a URL back to this route instead of the image itself.
 */

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export async function GET(request: NextRequest) {
  const image = request.nextUrl.searchParams.get('image');
  if (image !== null) return imageResponse(image);

  try {
    const supabase = createServiceClient();

    const { data: tours, error: tourError } = await supabase
      .from('tours')
      .select('id, name')
      .order('start_date', { ascending: true, nullsFirst: false })
      .limit(1);
    if (tourError) throw tourError;
    const tour = tours?.[0];
    if (!tour) return NextResponse.json({ error: 'No tour found' }, { status: 404 });

    const [productsRes, imagesRes, showsRes] = await Promise.all([
      supabase
        .from('tour_products')
        .select('product_id, size, suggested_retail, is_active, products(sku, description, product_type)')
        .eq('tour_id', tour.id)
        .order('created_at', { ascending: true })
        .limit(1000),
      supabase
        .from('product_images')
        .select('id, product_id')
        .eq('tour_id', tour.id)
        .order('is_primary', { ascending: false })
        .order('display_order', { ascending: true })
        .limit(1000),
      supabase
        .from('shows')
        .select('venue_name, city, state')
        .eq('tour_id', tour.id)
        .order('show_date', { ascending: true })
        .limit(1),
    ]);
    if (productsRes.error) throw productsRes.error;

    // First image per product (primary first), served resized by /api/product-images.
    const imageByProduct = new Map<string, string>();
    for (const r of imagesRes.data ?? []) {
      if (!imageByProduct.has(r.product_id as string)) imageByProduct.set(r.product_id as string, r.id as string);
    }
    const items = buildCatalogItems(
      (productsRes.data ?? []) as unknown as TourProductRow[],
      (id) => {
        const imageId = imageByProduct.get(id);
        return imageId ? productImageUrl(imageId, 320) : null;
      }
    );

    const show = showsRes.data?.[0];
    const showName = show
      ? [show.venue_name, [show.city, show.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
      : 'First show';

    const catalog: Catalog = { source: 'tracker', tourName: displayName(tour.name), showName, items };
    return NextResponse.json(catalog, { headers: { 'Cache-Control': 'private, max-age=60' } });
  } catch (error) {
    console.error('pos-mock catalog failed:', error);
    return NextResponse.json({ error: 'Catalog unavailable' }, { status: 500 });
  }
}

async function imageResponse(productId: string) {
  if (!UUID.test(productId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('product_images')
      .select('file_url, is_primary, display_order')
      .eq('product_id', productId)
      .order('is_primary', { ascending: false })
      .order('display_order', { ascending: true })
      .limit(1);
    if (error) throw error;
    const url = data?.[0]?.file_url as string | undefined;
    if (!url) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]*)$/.exec(url);
    if (match && IMAGE_TYPES.has(match[1])) {
      return new NextResponse(Buffer.from(match[2], 'base64'), {
        headers: { 'Content-Type': match[1], 'Cache-Control': 'private, max-age=3600' },
      });
    }
    if (/^https:\/\//.test(url)) return NextResponse.redirect(url);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('pos-mock image failed:', error);
    return NextResponse.json({ error: 'Image unavailable' }, { status: 500 });
  }
}
