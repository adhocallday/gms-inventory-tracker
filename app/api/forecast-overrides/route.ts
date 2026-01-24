import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scenarioId = searchParams.get('scenarioId');
  const tourId = searchParams.get('tourId');

  if (!scenarioId || !tourId) {
    return NextResponse.json({ error: 'scenarioId and tourId are required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('forecast_overrides')
    .select('id, scenario_id, tour_id, sku, size, bucket, override_units')
    .eq('scenario_id', scenarioId)
    .eq('tour_id', tourId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ overrides: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { scenario_id, tour_id, sku, size, bucket, override_units } = body;

  if (!scenario_id || !tour_id || !sku || override_units === undefined) {
    return NextResponse.json(
      { error: 'scenario_id, tour_id, sku, override_units are required' },
      { status: 400 }
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from('forecast_overrides')
    .select('id')
    .eq('scenario_id', scenario_id)
    .eq('tour_id', tour_id)
    .eq('sku', sku)
    .is('size', size ?? null)
    .is('bucket', bucket ?? null)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('forecast_overrides')
      .update({ override_units })
      .eq('id', existing.id)
      .select('id, scenario_id, tour_id, sku, size, bucket, override_units')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ override: data });
  }

  const { data, error } = await supabase
    .from('forecast_overrides')
    .insert({
      scenario_id,
      tour_id,
      sku,
      size: size ?? null,
      bucket: bucket ?? null,
      override_units
    })
    .select('id, scenario_id, tour_id, sku, size, bucket, override_units')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ override: data });
}
