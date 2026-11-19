import { NextResponse } from 'next/server';
import { listTours } from '@/lib/data/tours';

export async function GET() {
  try {
    return NextResponse.json({ data: await listTours() });
  } catch (err: any) {
    console.error('Error fetching tours:', err);
    return NextResponse.json({ error: 'Failed to fetch tours' }, { status: 500 });
  }
}
