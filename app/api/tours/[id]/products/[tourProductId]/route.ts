import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

interface RouteContext {
  params: Promise<{ id: string; tourProductId: string }>;
}

// GET /api/tours/[id]/products/[tourProductId] - Get a single tour product
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: tourId, tourProductId } = await context.params;
    const supabase = createServiceClient();

    const { data: tourProduct, error } = await supabase
      .from('tour_products')
      .select(`
        *,
        products (
          id,
          sku,
          description,
          product_type
        )
      `)
      .eq('id', tourProductId)
      .eq('tour_id', tourId)
      .single();

    if (error || !tourProduct) {
      return NextResponse.json(
        { error: 'Tour product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ tour_product: tourProduct });
  } catch (err) {
    console.error('Error in GET /api/tours/[id]/products/[tourProductId]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/tours/[id]/products/[tourProductId] - Update tour product costs
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: tourId, tourProductId } = await context.params;
    const supabase = createServiceClient();
    const body = await request.json();

    const {
      blank_unit_cost,
      print_unit_cost,
      full_package_cost,
      suggested_retail,
      is_active,
    } = body;

    // Verify tour product exists
    const { data: existing } = await supabase
      .from('tour_products')
      .select('id')
      .eq('id', tourProductId)
      .eq('tour_id', tourId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Tour product not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (blank_unit_cost !== undefined) {
      updates.blank_unit_cost = Number(blank_unit_cost);
    }

    if (print_unit_cost !== undefined) {
      updates.print_unit_cost = Number(print_unit_cost);
    }

    if (full_package_cost !== undefined) {
      updates.full_package_cost = Number(full_package_cost);
    } else if (blank_unit_cost !== undefined || print_unit_cost !== undefined) {
      // Auto-calculate full_package_cost if component costs changed
      const { data: current } = await supabase
        .from('tour_products')
        .select('blank_unit_cost, print_unit_cost')
        .eq('id', tourProductId)
        .single();

      if (current) {
        const newBlank = blank_unit_cost !== undefined ? Number(blank_unit_cost) : Number(current.blank_unit_cost);
        const newPrint = print_unit_cost !== undefined ? Number(print_unit_cost) : Number(current.print_unit_cost);
        updates.full_package_cost = newBlank + newPrint;
      }
    }

    if (suggested_retail !== undefined) {
      updates.suggested_retail = suggested_retail ? Number(suggested_retail) : null;
    }

    if (is_active !== undefined) {
      updates.is_active = Boolean(is_active);
    }

    const { data: updated, error } = await supabase
      .from('tour_products')
      .update(updates)
      .eq('id', tourProductId)
      .select()
      .single();

    if (error) {
      console.error('Error updating tour product:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tour_product: updated });
  } catch (err) {
    console.error('Error in PATCH /api/tours/[id]/products/[tourProductId]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tours/[id]/products/[tourProductId] - Remove product from tour
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: tourId, tourProductId } = await context.params;
    const supabase = createServiceClient();

    // Check for dependent records (sales, PO line items)
    const { data: sales } = await supabase
      .from('sales')
      .select('id')
      .eq('tour_product_id', tourProductId)
      .limit(1);

    if (sales && sales.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete: This product has sales records. Deactivate it instead.' },
        { status: 400 }
      );
    }

    const { data: poLineItems } = await supabase
      .from('po_line_items')
      .select('id')
      .eq('tour_product_id', tourProductId)
      .limit(1);

    if (poLineItems && poLineItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete: This product has purchase order records. Deactivate it instead.' },
        { status: 400 }
      );
    }

    // Delete the tour product
    const { error } = await supabase
      .from('tour_products')
      .delete()
      .eq('id', tourProductId)
      .eq('tour_id', tourId);

    if (error) {
      console.error('Error deleting tour product:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Tour product removed successfully' });
  } catch (err) {
    console.error('Error in DELETE /api/tours/[id]/products/[tourProductId]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
