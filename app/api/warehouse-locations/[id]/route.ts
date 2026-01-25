import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * PATCH /api/warehouse-locations/[id]
 * Update an existing warehouse location
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const locationId = params.id;
    const body = await request.json();
    const { name, displayOrder, isActive } = body;

    const supabase = createServiceClient();

    // Get existing location
    const { data: existing, error: fetchError } = await supabase
      .from('warehouse_locations')
      .select('*')
      .eq('id', locationId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Warehouse location not found' },
        { status: 404 }
      );
    }

    // Standard locations can be renamed (they're templates, fully editable)
    // Check for duplicate name if name is changing
    if (name && name !== existing.name) {
      const { data: duplicate } = await supabase
        .from('warehouse_locations')
        .select('id')
        .eq('tour_id', existing.tour_id)
        .ilike('name', name.trim())
        .neq('id', locationId)
        .maybeSingle();

      if (duplicate) {
        return NextResponse.json(
          { error: 'A location with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (displayOrder !== undefined) {
      updateData.display_order = displayOrder;
    }
    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    // Update location
    const { data: updated, error: updateError } = await supabase
      .from('warehouse_locations')
      .update(updateData)
      .eq('id', locationId)
      .select()
      .single();

    if (updateError) {
      console.error('[PATCH warehouse-location] Error:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ location: updated });
  } catch (error: any) {
    console.error('[PATCH warehouse-location] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update warehouse location' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/warehouse-locations/[id]
 * Soft delete (deactivate) a custom warehouse location
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const locationId = params.id;
    const supabase = createServiceClient();

    // Get existing location
    const { data: existing, error: fetchError } = await supabase
      .from('warehouse_locations')
      .select('*')
      .eq('id', locationId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Warehouse location not found' },
        { status: 404 }
      );
    }

    // Prevent deleting standard locations
    if (existing.location_type === 'standard') {
      return NextResponse.json(
        { error: 'Cannot delete standard locations. You can deactivate them instead.' },
        { status: 403 }
      );
    }

    // Check if location is used in any allocations
    const { data: allocations, error: allocError } = await supabase
      .from('product_warehouse_allocations')
      .select('id')
      .eq('warehouse_location_id', locationId)
      .limit(1);

    if (allocError) {
      console.error('[DELETE warehouse-location] Error checking allocations:', allocError);
      return NextResponse.json(
        { error: allocError.message },
        { status: 500 }
      );
    }

    if (allocations && allocations.length > 0) {
      // Soft delete (deactivate) if used in allocations
      const { error: updateError } = await supabase
        .from('warehouse_locations')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', locationId);

      if (updateError) {
        console.error('[DELETE warehouse-location] Error deactivating:', updateError);
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Location deactivated (has existing allocations)',
        deactivated: true
      });
    } else {
      // Hard delete if not used
      const { error: deleteError } = await supabase
        .from('warehouse_locations')
        .delete()
        .eq('id', locationId);

      if (deleteError) {
        console.error('[DELETE warehouse-location] Error deleting:', deleteError);
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Location deleted successfully',
        deleted: true
      });
    }
  } catch (error: any) {
    console.error('[DELETE warehouse-location] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete warehouse location' },
      { status: 500 }
    );
  }
}
