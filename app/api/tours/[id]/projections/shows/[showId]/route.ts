import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; showId: string } }
) {
  try {
    const supabase = createServiceClient();
    const { id: tourId, showId } = params;
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenario_id');

    // Get show details
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('*')
      .eq('id', showId)
      .eq('tour_id', tourId)
      .single();

    if (showError || !show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    // Get projections for this show
    let projectionsQuery = supabase
      .from('product_show_projections')
      .select('*')
      .eq('show_id', showId);

    if (scenarioId) {
      projectionsQuery = projectionsQuery.eq('scenario_id', scenarioId);
    }

    const { data: projections } = await projectionsQuery;

    // Get deliveries
    const { data: deliveries } = await supabase
      .from('show_deliveries')
      .select('*')
      .eq('show_id', showId);

    // Get comps
    const { data: comps } = await supabase
      .from('show_comps')
      .select('*')
      .eq('show_id', showId);

    return NextResponse.json({
      show,
      projections: projections || [],
      deliveries: deliveries || [],
      comps: comps || [],
    });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; showId: string } }
) {
  try {
    const supabase = createServiceClient();
    const { id: tourId, showId } = params;
    const body = await request.json();
    const { scenario_id, projections } = body;

    if (!scenario_id || !Array.isArray(projections)) {
      return NextResponse.json(
        { error: 'scenario_id and projections array are required' },
        { status: 400 }
      );
    }

    // Verify show belongs to tour
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('id')
      .eq('id', showId)
      .eq('tour_id', tourId)
      .single();

    if (showError || !show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const projection of projections) {
      try {
        // Check for existing record
        let query = supabase
          .from('product_show_projections')
          .select('id')
          .eq('scenario_id', scenario_id)
          .eq('show_id', showId)
          .eq('sku', projection.sku);

        if (projection.size === null || projection.size === undefined) {
          query = query.is('size', null);
        } else {
          query = query.eq('size', projection.size);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing?.id) {
          const { error } = await supabase
            .from('product_show_projections')
            .update({
              projected_units: projection.projected_units,
              projected_gross: projection.projected_gross ?? null,
              notes: projection.notes ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('product_show_projections')
            .insert({
              scenario_id,
              tour_id: tourId,
              show_id: showId,
              sku: projection.sku,
              size: projection.size ?? null,
              projected_units: projection.projected_units,
              projected_gross: projection.projected_gross ?? null,
              notes: projection.notes ?? null,
            });

          if (error) throw error;
        }

        successCount++;
      } catch (error: any) {
        errorCount++;
        console.error('Projection update error:', error.message);
      }
    }

    return NextResponse.json({
      success: true,
      successCount,
      errorCount,
    });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; showId: string } }
) {
  try {
    const supabase = createServiceClient();
    const { id: tourId, showId } = params;
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenario_id');

    if (!scenarioId) {
      return NextResponse.json(
        { error: 'scenario_id is required' },
        { status: 400 }
      );
    }

    // Verify show belongs to tour
    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('id')
      .eq('id', showId)
      .eq('tour_id', tourId)
      .single();

    if (showError || !show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    // Delete all projections for this show/scenario
    const { error } = await supabase
      .from('product_show_projections')
      .delete()
      .eq('show_id', showId)
      .eq('scenario_id', scenarioId);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete projections' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
