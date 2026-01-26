import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const tourId = params.id;
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenario_id');

    // Get shows for this tour
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select('id, show_date, venue_name, city, state, attendance')
      .eq('tour_id', tourId)
      .order('show_date', { ascending: true });

    if (showsError) {
      console.error('Error fetching shows:', showsError);
      return NextResponse.json({ error: 'Failed to fetch shows' }, { status: 500 });
    }

    // Get projections - optionally filtered by scenario
    let projectionsQuery = supabase
      .from('product_show_projections')
      .select('*')
      .eq('tour_id', tourId);

    if (scenarioId) {
      projectionsQuery = projectionsQuery.eq('scenario_id', scenarioId);
    }

    const { data: projections, error: projectionsError } = await projectionsQuery;

    if (projectionsError) {
      console.error('Error fetching projections:', projectionsError);
      return NextResponse.json({ error: 'Failed to fetch projections' }, { status: 500 });
    }

    // Get deliveries
    const { data: deliveries, error: deliveriesError } = await supabase
      .from('show_deliveries')
      .select('*')
      .eq('tour_id', tourId);

    if (deliveriesError) {
      console.error('Error fetching deliveries:', deliveriesError);
      return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 });
    }

    // Get comps
    const { data: comps, error: compsError } = await supabase
      .from('show_comps')
      .select('*')
      .eq('tour_id', tourId);

    if (compsError) {
      console.error('Error fetching comps:', compsError);
      return NextResponse.json({ error: 'Failed to fetch comps' }, { status: 500 });
    }

    // Get initial inventory if scenario is specified
    let initialInventory: any[] = [];
    if (scenarioId) {
      const { data, error } = await supabase
        .from('initial_inventory')
        .select('*')
        .eq('scenario_id', scenarioId);

      if (!error && data) {
        initialInventory = data;
      }
    }

    // Organize data by show
    const showData = shows?.map((show) => {
      const showProjections = projections?.filter((p) => p.show_id === show.id) || [];
      const showDeliveries = deliveries?.filter((d) => d.show_id === show.id) || [];
      const showComps = comps?.filter((c) => c.show_id === show.id) || [];

      return {
        ...show,
        projections: showProjections,
        deliveries: showDeliveries,
        comps: showComps,
      };
    }) || [];

    return NextResponse.json({
      shows: showData,
      initialInventory,
      summary: {
        totalShows: shows?.length || 0,
        totalProjections: projections?.length || 0,
      },
    });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

interface ProjectionItem {
  show_id: string;
  sku: string;
  size?: string | null;
  projected_units: number;
  projected_gross?: number | null;
  notes?: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = params.id;
    const { scenario_id, projections } = await request.json();

    if (!scenario_id || !Array.isArray(projections)) {
      return NextResponse.json(
        { error: 'scenario_id and projections array are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    console.log(`Processing ${projections.length} show projections for tour ${tourId}`);

    // Process in batches
    const BATCH_SIZE = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < projections.length; i += BATCH_SIZE) {
      const batch = projections.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (item: ProjectionItem) => {
        try {
          // Check for existing record
          let query = supabase
            .from('product_show_projections')
            .select('id')
            .eq('scenario_id', scenario_id)
            .eq('show_id', item.show_id)
            .eq('sku', item.sku);

          if (item.size === null || item.size === undefined) {
            query = query.is('size', null);
          } else {
            query = query.eq('size', item.size);
          }

          const { data: existing } = await query.maybeSingle();

          if (existing?.id) {
            // Update existing
            const { error } = await supabase
              .from('product_show_projections')
              .update({
                projected_units: item.projected_units,
                projected_gross: item.projected_gross ?? null,
                notes: item.notes ?? null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);

            if (error) throw error;
          } else {
            // Insert new
            const { error } = await supabase
              .from('product_show_projections')
              .insert({
                scenario_id,
                tour_id: tourId,
                show_id: item.show_id,
                sku: item.sku,
                size: item.size ?? null,
                projected_units: item.projected_units,
                projected_gross: item.projected_gross ?? null,
                notes: item.notes ?? null,
              });

            if (error) throw error;
          }

          successCount++;
          return { success: true };
        } catch (error: any) {
          errorCount++;
          console.error('Projection save error:', {
            show_id: item.show_id,
            sku: item.sku,
            size: item.size,
            error: error.message,
          });
          return { success: false, error: error.message };
        }
      });

      await Promise.all(batchPromises);
    }

    console.log(`Show projections complete: ${successCount} succeeded, ${errorCount} failed`);

    return NextResponse.json({
      success: true,
      successCount,
      errorCount,
      total: projections.length,
    });
  } catch (error: any) {
    console.error('Show projections error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
