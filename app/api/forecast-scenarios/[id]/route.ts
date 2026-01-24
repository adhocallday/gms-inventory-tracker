import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const body = await request.json();

  const { name, is_baseline } = body;

  if (is_baseline) {
    const { data: scenario } = await supabase
      .from('forecast_scenarios')
      .select('tour_id')
      .eq('id', params.id)
      .maybeSingle();

    if (scenario?.tour_id) {
      await supabase
        .from('forecast_scenarios')
        .update({ is_baseline: false })
        .eq('tour_id', scenario.tour_id);
    }
  }

  const { data, error } = await supabase
    .from('forecast_scenarios')
    .update({
      ...(name ? { name } : {}),
      ...(typeof is_baseline === 'boolean' ? { is_baseline } : {})
    })
    .eq('id', params.id)
    .select('id, tour_id, name, is_baseline, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ scenario: data });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('forecast_scenarios')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
