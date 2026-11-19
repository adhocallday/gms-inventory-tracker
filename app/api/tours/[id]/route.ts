import { NextRequest, NextResponse } from 'next/server';
import { loadTour } from '@/lib/data/tours';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await loadTour(params.id);
    if (!data) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('Error fetching tour:', err);
    return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 });
  }
}
