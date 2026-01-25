import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * GET /api/tours/[id]/warehouse-locations
 * List all warehouse locations for a tour (standard + custom)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = params.id;
    const supabase = createServiceClient();

    const { data: locations, error } = await supabase
      .from('warehouse_locations')
      .select('*')
      .eq('tour_id', tourId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[GET warehouse-locations] Error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ locations: locations || [] });
  } catch (error: any) {
    console.error('[GET warehouse-locations] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch warehouse locations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tours/[id]/warehouse-locations
 * Create a new custom warehouse location
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = params.id;
    const body = await request.json();
    const { name, displayOrder } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check for duplicate name
    const { data: existing } = await supabase
      .from('warehouse_locations')
      .select('id')
      .eq('tour_id', tourId)
      .ilike('name', name.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'A location with this name already exists' },
        { status: 409 }
      );
    }

    // Get max display_order if not provided
    let order = displayOrder;
    if (order === undefined || order === null) {
      const { data: maxOrderData } = await supabase
        .from('warehouse_locations')
        .select('display_order')
        .eq('tour_id', tourId)
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      order = (maxOrderData?.display_order || 0) + 1;
    }

    // Create new custom location
    const { data: newLocation, error } = await supabase
      .from('warehouse_locations')
      .insert({
        tour_id: tourId,
        name: name.trim(),
        location_type: 'custom',
        is_active: true,
        display_order: order
      })
      .select()
      .single();

    if (error) {
      console.error('[POST warehouse-locations] Error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { location: newLocation },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST warehouse-locations] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create warehouse location' },
      { status: 500 }
    );
  }
}
