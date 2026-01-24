import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tourId = searchParams.get('tourId');

  if (!tourId) {
    return NextResponse.json({ error: 'tourId is required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('forecast_scenarios')
    .select('id, tour_id, name, is_baseline, created_at')
    .eq('tour_id', tourId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ scenarios: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  const tourId = body.tourId as string;
  const name = body.name as string;
  const isBaseline = Boolean(body.isBaseline);

  if (!tourId || !name) {
    return NextResponse.json({ error: 'tourId and name are required' }, { status: 400 });
  }

  if (isBaseline) {
    await supabase
      .from('forecast_scenarios')
      .update({ is_baseline: false })
      .eq('tour_id', tourId);
  }

  const { data, error } = await supabase
    .from('forecast_scenarios')
    .insert({ tour_id: tourId, name, is_baseline: isBaseline })
    .select('id, tour_id, name, is_baseline, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ scenario: data });
}
