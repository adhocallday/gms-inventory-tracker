import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { loadCatalog } from '@/lib/grab-sheet/catalog';

export const dynamic = 'force-dynamic';

/** GET /api/admin/grab-sheet/catalog → products with their current image id, for re-matching a changed SKU. */
export async function GET() {
  try {
    const catalog = await loadCatalog(createServiceClient());
    return NextResponse.json({ products: catalog });
  } catch (error) {
    console.error('[grab-sheet/catalog]', error);
    return NextResponse.json({ error: 'Could not load products' }, { status: 500 });
  }
}
