import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * GET /api/tours/[tourId]/scenarios/[scenarioId]/allocations
 * Fetch all warehouse allocations for a scenario
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; scenarioId: string } }
) {
  try {
    const { id: tourId, scenarioId } = params;
    const supabase = createServiceClient();

    const { data: allocations, error } = await supabase
      .from('product_warehouse_allocations')
      .select(`
        *,
        warehouse_locations (
          id,
          name,
          location_type,
          display_order
        )
      `)
      .eq('tour_id', tourId)
      .eq('scenario_id', scenarioId)
      .order('sku', { ascending: true });

    if (error) {
      console.error('[GET allocations] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ allocations: allocations || [] });
  } catch (error: any) {
    console.error('[GET allocations] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch allocations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tours/[tourId]/scenarios/[scenarioId]/allocations
 * Save warehouse allocations (upsert)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; scenarioId: string } }
) {
  try {
    const { id: tourId, scenarioId } = params;
    const body = await request.json();
    const {
      sku,
      warehouseLocationId,
      size,
      allocatedUnits,
      notes
    } = body;

    if (!sku || !warehouseLocationId) {
      return NextResponse.json(
        { error: 'SKU and warehouse location are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if allocation already exists
    const { data: existing, error: existingError } = await supabase
      .from('product_warehouse_allocations')
      .select('id')
      .eq('scenario_id', scenarioId)
      .eq('tour_id', tourId)
      .eq('sku', sku)
      .eq('warehouse_location_id', warehouseLocationId)
      .is('size', size || null)
      .maybeSingle();

    if (existingError) {
      console.error('[POST allocations] Error checking existing:', existingError);
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('product_warehouse_allocations')
        .update({
          allocated_units: allocatedUnits || 0,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      result = data;
      if (error) {
        console.error('[POST allocations] Error updating:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('product_warehouse_allocations')
        .insert({
          scenario_id: scenarioId,
          tour_id: tourId,
          sku,
          warehouse_location_id: warehouseLocationId,
          size: size || null,
          allocated_units: allocatedUnits || 0,
          notes: notes || null
        })
        .select()
        .single();

      result = data;
      if (error) {
        console.error('[POST allocations] Error inserting:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ allocation: result });
  } catch (error: any) {
    console.error('[POST allocations] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save allocation' },
      { status: 500 }
    );
  }
}
