import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const { data: source, error } = await supabase
    .from('forecast_scenarios')
    .select('id, tour_id, name')
    .eq('id', params.id)
    .single();

  if (error || !source) {
    return NextResponse.json({ error: error?.message || 'Scenario not found' }, { status: 404 });
  }

  const { data: created, error: createError } = await supabase
    .from('forecast_scenarios')
    .insert({
      tour_id: source.tour_id,
      name: `Copy of ${source.name}`,
      is_baseline: false
    })
    .select('id, tour_id, name, is_baseline, created_at')
    .single();

  if (createError || !created) {
    return NextResponse.json({ error: createError?.message || 'Failed to duplicate' }, { status: 500 });
  }

  const { data: overrides } = await supabase
    .from('forecast_overrides')
    .select('tour_id, sku, size, bucket, override_units')
    .eq('scenario_id', source.id);

  if (overrides && overrides.length > 0) {
    const rows = overrides.map((override) => ({
      scenario_id: created.id,
      tour_id: override.tour_id,
      sku: override.sku,
      size: override.size,
      bucket: override.bucket,
      override_units: override.override_units
    }));
    await supabase.from('forecast_overrides').insert(rows);
  }

  return NextResponse.json({ scenario: created });
}
