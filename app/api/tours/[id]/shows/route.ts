import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('shows')
      .select('id, show_date, venue_name, city, state, attendance, capacity, settlement_status')
      .eq('tour_id', params.id)
      .order('show_date', { ascending: true });

    if (error) {
      console.error('Error fetching shows:', error);
      return NextResponse.json(
        { error: 'Failed to fetch shows' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
