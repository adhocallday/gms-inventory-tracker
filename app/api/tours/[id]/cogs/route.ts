import { NextRequest, NextResponse } from 'next/server';
import { CogsLoadError, loadTourCogs } from '@/lib/data/cogs';

/** COGS for one tour (lib/data/cogs.ts, shared with /tours/[id]/cogs). */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return NextResponse.json(await loadTourCogs(params.id));
  } catch (err: any) {
    if (err instanceof CogsLoadError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
