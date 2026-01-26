import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

type MatchMode = 'show_number' | 'venue' | 'city';

interface CopyRequest {
  source_tour_id: string;
  source_scenario_id: string;
  target_scenario_id: string;
  match_mode: MatchMode;
  scale_by_attendance?: boolean;
  include_initial_inventory?: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const targetTourId = params.id;
    const body: CopyRequest = await request.json();
    const {
      source_tour_id,
      source_scenario_id,
      target_scenario_id,
      match_mode,
      scale_by_attendance = false,
      include_initial_inventory = false,
    } = body;

    if (!source_tour_id || !source_scenario_id || !target_scenario_id || !match_mode) {
      return NextResponse.json(
        { error: 'source_tour_id, source_scenario_id, target_scenario_id, and match_mode are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get source shows
    const { data: sourceShows, error: sourceShowsError } = await supabase
      .from('shows')
      .select('id, show_date, venue_name, city, attendance')
      .eq('tour_id', source_tour_id)
      .order('show_date', { ascending: true });

    if (sourceShowsError || !sourceShows) {
      return NextResponse.json({ error: 'Failed to fetch source shows' }, { status: 500 });
    }

    // Get target shows
    const { data: targetShows, error: targetShowsError } = await supabase
      .from('shows')
      .select('id, show_date, venue_name, city, attendance')
      .eq('tour_id', targetTourId)
      .order('show_date', { ascending: true });

    if (targetShowsError || !targetShows) {
      return NextResponse.json({ error: 'Failed to fetch target shows' }, { status: 500 });
    }

    // Get source projections
    const { data: sourceProjections, error: projectionsError } = await supabase
      .from('product_show_projections')
      .select('*')
      .eq('scenario_id', source_scenario_id);

    if (projectionsError) {
      return NextResponse.json({ error: 'Failed to fetch source projections' }, { status: 500 });
    }

    // Build show mapping based on match mode
    const showMapping = new Map<string, { targetId: string; scaleFactor: number }>();

    targetShows.forEach((targetShow, index) => {
      let matchedSource: typeof sourceShows[0] | undefined;

      switch (match_mode) {
        case 'show_number':
          // Match by position in tour (1st show to 1st show, etc.)
          matchedSource = sourceShows[index];
          break;

        case 'venue':
          // Match by venue name (case-insensitive)
          matchedSource = sourceShows.find(
            (s) =>
              s.venue_name &&
              targetShow.venue_name &&
              s.venue_name.toLowerCase() === targetShow.venue_name.toLowerCase()
          );
          break;

        case 'city':
          // Match by city (case-insensitive)
          matchedSource = sourceShows.find(
            (s) =>
              s.city &&
              targetShow.city &&
              s.city.toLowerCase() === targetShow.city.toLowerCase()
          );
          break;
      }

      if (matchedSource) {
        let scaleFactor = 1;
        if (scale_by_attendance && matchedSource.attendance && targetShow.attendance) {
          scaleFactor = targetShow.attendance / matchedSource.attendance;
        }

        showMapping.set(matchedSource.id, {
          targetId: targetShow.id,
          scaleFactor,
        });
      }
    });

    // Copy projections
    let copiedCount = 0;
    let skippedCount = 0;

    for (const projection of sourceProjections || []) {
      const mapping = showMapping.get(projection.show_id);
      if (!mapping) {
        skippedCount++;
        continue;
      }

      try {
        // Check if already exists
        let query = supabase
          .from('product_show_projections')
          .select('id')
          .eq('scenario_id', target_scenario_id)
          .eq('show_id', mapping.targetId)
          .eq('sku', projection.sku);

        if (projection.size === null) {
          query = query.is('size', null);
        } else {
          query = query.eq('size', projection.size);
        }

        const { data: existing } = await query.maybeSingle();

        const scaledUnits = Math.round(projection.projected_units * mapping.scaleFactor);
        const scaledGross = projection.projected_gross
          ? projection.projected_gross * mapping.scaleFactor
          : null;

        if (existing?.id) {
          await supabase
            .from('product_show_projections')
            .update({
              projected_units: scaledUnits,
              projected_gross: scaledGross,
              notes: projection.notes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('product_show_projections').insert({
            scenario_id: target_scenario_id,
            tour_id: targetTourId,
            show_id: mapping.targetId,
            sku: projection.sku,
            size: projection.size,
            projected_units: scaledUnits,
            projected_gross: scaledGross,
            notes: projection.notes,
          });
        }

        copiedCount++;
      } catch (error: any) {
        console.error('Error copying projection:', error.message);
        skippedCount++;
      }
    }

    // Optionally copy initial inventory
    let inventoryCopied = 0;
    if (include_initial_inventory) {
      const { data: sourceInventory } = await supabase
        .from('initial_inventory')
        .select('*')
        .eq('scenario_id', source_scenario_id);

      for (const item of sourceInventory || []) {
        try {
          // Check if already exists
          let query = supabase
            .from('initial_inventory')
            .select('id')
            .eq('scenario_id', target_scenario_id)
            .eq('sku', item.sku);

          if (item.size === null) {
            query = query.is('size', null);
          } else {
            query = query.eq('size', item.size);
          }

          const { data: existing } = await query.maybeSingle();

          if (existing?.id) {
            await supabase
              .from('initial_inventory')
              .update({
                quantity: item.quantity,
                notes: item.notes,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
          } else {
            await supabase.from('initial_inventory').insert({
              tour_id: targetTourId,
              scenario_id: target_scenario_id,
              sku: item.sku,
              size: item.size,
              quantity: item.quantity,
              notes: item.notes,
            });
          }

          inventoryCopied++;
        } catch (error: any) {
          console.error('Error copying inventory:', error.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        matchMode: match_mode,
        showsMatched: showMapping.size,
        totalSourceShows: sourceShows.length,
        totalTargetShows: targetShows.length,
        projectionsCopied: copiedCount,
        projectionsSkipped: skippedCount,
        inventoryCopied,
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

// GET endpoint to preview the copy operation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const targetTourId = params.id;
    const { searchParams } = new URL(request.url);
    const sourceTourId = searchParams.get('source_tour_id');
    const matchMode = searchParams.get('match_mode') as MatchMode;

    if (!sourceTourId || !matchMode) {
      return NextResponse.json(
        { error: 'source_tour_id and match_mode are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get source shows
    const { data: sourceShows } = await supabase
      .from('shows')
      .select('id, show_date, venue_name, city, attendance')
      .eq('tour_id', sourceTourId)
      .order('show_date', { ascending: true });

    // Get target shows
    const { data: targetShows } = await supabase
      .from('shows')
      .select('id, show_date, venue_name, city, attendance')
      .eq('tour_id', targetTourId)
      .order('show_date', { ascending: true });

    // Define show type
    type ShowData = {
      id: string;
      show_date: string;
      venue_name: string | null;
      city: string | null;
      attendance: number | null;
    };

    // Build preview of matches
    const preview: Array<{
      targetShow: ShowData;
      matchedSourceShow: ShowData | null;
    }> = [];

    (targetShows || []).forEach((targetShow, index) => {
      let matchedSource: ShowData | null = null;

      switch (matchMode) {
        case 'show_number':
          matchedSource = (sourceShows || [])[index] || null;
          break;

        case 'venue':
          matchedSource =
            (sourceShows || []).find(
              (s) =>
                s.venue_name &&
                targetShow.venue_name &&
                s.venue_name.toLowerCase() === targetShow.venue_name.toLowerCase()
            ) || null;
          break;

        case 'city':
          matchedSource =
            (sourceShows || []).find(
              (s) =>
                s.city &&
                targetShow.city &&
                s.city.toLowerCase() === targetShow.city.toLowerCase()
            ) || null;
          break;
      }

      preview.push({
        targetShow,
        matchedSourceShow: matchedSource,
      });
    });

    const matchedCount = preview.filter((p) => p.matchedSourceShow !== null).length;

    return NextResponse.json({
      preview,
      summary: {
        totalSourceShows: sourceShows?.length || 0,
        totalTargetShows: targetShows?.length || 0,
        matchedShows: matchedCount,
        unmatchedShows: (targetShows?.length || 0) - matchedCount,
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
