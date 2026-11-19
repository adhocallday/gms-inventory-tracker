import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { approveItems, GrabSheetSetupError, validateItem, type ApproveItem } from '@/lib/grab-sheet/approve';

export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/grab-sheet/approve
 * Body: { tourId?: uuid, items: ApproveItem[] } (at most 40 per call)
 * Uploads each approved crop to the product-images bucket, makes it the
 * product's primary image (replacing the old one), and creates products only
 * for approved new-product suggestions.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const items: unknown[] = Array.isArray(body?.items) ? body.items : [];
  if (!items.length || items.length > 40) {
    return NextResponse.json({ error: 'Send 1 to 40 items' }, { status: 400 });
  }
  const tourId = typeof body?.tourId === 'string' && UUID.test(body.tourId) ? body.tourId : null;
  for (const item of items) {
    const problem = validateItem(item);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }

  try {
    const results = await approveItems(createServiceClient(), items as ApproveItem[], { tourId });
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof GrabSheetSetupError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('[grab-sheet/approve]', error);
    return NextResponse.json({ error: 'Could not save the approved images' }, { status: 500 });
  }
}
