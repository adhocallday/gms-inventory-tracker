import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

interface RouteParams {
  params: { id: string };
}

// GET /api/products/[id] - Get single product with relationships
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServiceClient();
    const { id } = params;

    // Get the product
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get tour products (which tours use this product)
    const { data: tourProducts } = await supabase
      .from('tour_products')
      .select(`
        id,
        tour_id,
        size,
        blank_unit_cost,
        print_unit_cost,
        full_package_cost,
        suggested_retail,
        is_active,
        tours:tour_id (id, name, artist, status)
      `)
      .eq('product_id', id);

    // Get inventory balances across all tours
    const { data: inventoryBalances } = await supabase
      .from('inventory_balances')
      .select('tour_id, size, balance, total_received, total_sold, total_comps')
      .eq('product_id', id);

    // Get total sales across all shows
    const { data: salesData } = await supabase
      .from('sales')
      .select('qty_sold, gross_sales, show_id')
      .eq('product_id', id);

    const totalSold = salesData?.reduce((sum, s) => sum + Number(s.qty_sold || 0), 0) || 0;
    const totalGross = salesData?.reduce((sum, s) => sum + Number(s.gross_sales || 0), 0) || 0;

    return NextResponse.json({
      product,
      tourProducts: tourProducts || [],
      inventoryBalances: inventoryBalances || [],
      stats: {
        totalSold,
        totalGross,
        tourCount: new Set(tourProducts?.map(tp => tp.tour_id) || []).size,
      },
    });
  } catch (err) {
    console.error('Error in GET /api/products/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/products/[id] - Update product metadata
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServiceClient();
    const { id } = params;
    const body = await request.json();

    const { sku, description, product_type } = body;

    // Build update object with only provided fields
    const updates: Record<string, any> = {};
    if (sku !== undefined) updates.sku = sku.trim().toUpperCase();
    if (description !== undefined) updates.description = description.trim();
    if (product_type !== undefined) updates.product_type = product_type;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Check if SKU already exists (if updating SKU)
    if (updates.sku) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('sku', updates.sku)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: 'A product with this SKU already exists' },
          { status: 409 }
        );
      }
    }

    // Update the product
    const { data: product, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product });
  } catch (err) {
    console.error('Error in PATCH /api/products/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Delete product (with safeguards)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServiceClient();
    const { id } = params;

    // Check if product is used in any tours
    const { data: tourProducts, error: checkError } = await supabase
      .from('tour_products')
      .select('id, tour_id')
      .eq('product_id', id);

    if (checkError) {
      console.error('Error checking tour products:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (tourProducts && tourProducts.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete product that is assigned to tours',
          tourCount: tourProducts.length,
          message: 'Remove the product from all tours first before deleting.',
        },
        { status: 409 }
      );
    }

    // Check if product has any sales records
    const { count: salesCount } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', id);

    if (salesCount && salesCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete product with sales history',
          salesCount,
          message: 'This product has sales records and cannot be deleted.',
        },
        { status: 409 }
      );
    }

    // Delete the product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/products/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
