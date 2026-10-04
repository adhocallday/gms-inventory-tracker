import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('tours')
      .select('id, name, artist, start_date, end_date, status')
      .eq('id', params.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching tour:', error);
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
