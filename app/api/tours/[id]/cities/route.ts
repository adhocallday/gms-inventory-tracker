import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tourId = params.id;

  const supabase = createServiceClient();

  // Get unique cities from shows for this tour
  const { data: shows, error } = await supabase
    .from('shows')
    .select('city, state')
    .eq('tour_id', tourId)
    .not('city', 'is', null)
    .order('city');

  if (error) {
    console.error('Error fetching tour cities:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get unique cities
  const uniqueCities = Array.from(
    new Set(shows?.map(show => show.city).filter(Boolean))
  ).sort();

  // Build buckets: TOUR + city names + WEB
  const buckets = ['TOUR', ...uniqueCities, 'WEB'];

  return NextResponse.json({
    cities: uniqueCities,
    buckets,
    showCount: shows?.length || 0
  });
}
