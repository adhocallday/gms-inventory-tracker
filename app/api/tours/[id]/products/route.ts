import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/tours/[id]/products - Get all products for a tour with costs and inventory
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: tourId } = await context.params;
    const supabase = createServiceClient();

    // Get all tour_products with product details
    const { data: tourProducts, error } = await supabase
      .from('tour_products')
      .select(`
        id,
        product_id,
        size,
        blank_unit_cost,
        print_unit_cost,
        full_package_cost,
        suggested_retail,
        is_active,
        created_at,
        updated_at,
        products (
          id,
          sku,
          description,
          product_type
        )
      `)
      .eq('tour_id', tourId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tour products:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get inventory balances for this tour
    const { data: inventoryData } = await supabase
      .from('inventory_balances')
      .select('product_id, size, balance')
      .eq('tour_id', tourId);

    // Create inventory lookup
    const inventoryLookup: Record<string, number> = {};
    (inventoryData || []).forEach((inv) => {
      const key = `${inv.product_id}-${inv.size}`;
      inventoryLookup[key] = inv.balance;
    });

    // Group tour products by product_id for easier display
    const productGroups: Record<string, {
      product_id: string;
      sku: string;
      description: string;
      product_type: string;
      sizes: Array<{
        tour_product_id: string;
        size: string;
        blank_unit_cost: number;
        print_unit_cost: number;
        full_package_cost: number;
        suggested_retail: number | null;
        is_active: boolean;
        inventory_balance: number;
      }>;
    }> = {};

    (tourProducts || []).forEach((tp: any) => {
      const productId = tp.product_id;
      const invKey = `${productId}-${tp.size}`;

      if (!productGroups[productId]) {
        productGroups[productId] = {
          product_id: productId,
          sku: tp.products?.sku || 'Unknown',
          description: tp.products?.description || '',
          product_type: tp.products?.product_type || 'other',
          sizes: [],
        };
      }

      productGroups[productId].sizes.push({
        tour_product_id: tp.id,
        size: tp.size,
        blank_unit_cost: parseFloat(tp.blank_unit_cost) || 0,
        print_unit_cost: parseFloat(tp.print_unit_cost) || 0,
        full_package_cost: parseFloat(tp.full_package_cost) || 0,
        suggested_retail: tp.suggested_retail ? parseFloat(tp.suggested_retail) : null,
        is_active: tp.is_active,
        inventory_balance: inventoryLookup[invKey] || 0,
      });
    });

    // Convert to array and sort by SKU
    const products = Object.values(productGroups).sort((a, b) => a.sku.localeCompare(b.sku));

    return NextResponse.json({
      products,
      total: products.length,
    });
  } catch (err) {
    console.error('Error in GET /api/tours/[id]/products:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tours/[id]/products - Add a product to a tour
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: tourId } = await context.params;
    const supabase = createServiceClient();
    const body = await request.json();

    const {
      product_id,
      sizes,
      blank_unit_cost = 0,
      print_unit_cost = 0,
      full_package_cost,
      suggested_retail,
    } = body;

    // Validate required fields
    if (!product_id) {
      return NextResponse.json(
        { error: 'product_id is required' },
        { status: 400 }
      );
    }

    if (!sizes || !Array.isArray(sizes) || sizes.length === 0) {
      return NextResponse.json(
        { error: 'sizes array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Verify tour exists
    const { data: tour } = await supabase
      .from('tours')
      .select('id')
      .eq('id', tourId)
      .single();

    if (!tour) {
      return NextResponse.json(
        { error: 'Tour not found' },
        { status: 404 }
      );
    }

    // Verify product exists
    const { data: product } = await supabase
      .from('products')
      .select('id, sku')
      .eq('id', product_id)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check for existing tour_products with same sizes
    const { data: existingProducts } = await supabase
      .from('tour_products')
      .select('size')
      .eq('tour_id', tourId)
      .eq('product_id', product_id)
      .in('size', sizes);

    if (existingProducts && existingProducts.length > 0) {
      const existingSizes = existingProducts.map((p) => p.size).join(', ');
      return NextResponse.json(
        { error: `Product already has sizes ${existingSizes} for this tour` },
        { status: 409 }
      );
    }

    // Calculate full_package_cost if not provided
    const calculatedFullPackage = full_package_cost ?? (Number(blank_unit_cost) + Number(print_unit_cost));

    // Create tour_products for each size
    const tourProductsToInsert = sizes.map((size: string) => ({
      tour_id: tourId,
      product_id,
      size,
      blank_unit_cost: Number(blank_unit_cost),
      print_unit_cost: Number(print_unit_cost),
      full_package_cost: calculatedFullPackage,
      suggested_retail: suggested_retail ? Number(suggested_retail) : null,
      is_active: true,
    }));

    const { data: createdProducts, error } = await supabase
      .from('tour_products')
      .insert(tourProductsToInsert)
      .select();

    if (error) {
      console.error('Error creating tour products:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: `Added ${createdProducts?.length || 0} size variants for ${product.sku}`,
        tour_products: createdProducts,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error in POST /api/tours/[id]/products:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
