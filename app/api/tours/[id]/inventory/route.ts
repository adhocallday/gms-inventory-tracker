import { NextRequest, NextResponse } from 'next/server';
import { loadTourInventory } from '@/lib/data/inventory';

/** Inventory for one tour (lib/data/inventory.ts, shared with /tours/[id]/inventory). */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return NextResponse.json(await loadTourInventory(params.id));
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
