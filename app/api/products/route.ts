import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

// GET /api/products - List all products with optional search and filters
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const productType = searchParams.get('type') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`sku.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply product type filter
    if (productType && productType !== 'all') {
      query = query.eq('product_type', productType);
    }

    // Apply pagination and ordering
    query = query
      .order('sku', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: products, count, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get tour counts for each product
    const productIds = products?.map(p => p.id) || [];

    const tourCounts: Record<string, number> = {};
    if (productIds.length > 0) {
      const { data: tourProductsData } = await supabase
        .from('tour_products')
        .select('product_id, tour_id')
        .in('product_id', productIds);

      // Count unique tours per product using intermediate Set map
      const tourSets: Record<string, Set<string>> = {};
      (tourProductsData || []).forEach(tp => {
        if (!tourSets[tp.product_id]) {
          tourSets[tp.product_id] = new Set();
        }
        tourSets[tp.product_id].add(tp.tour_id);
      });

      // Convert sets to counts
      Object.keys(tourSets).forEach(key => {
        tourCounts[key] = tourSets[key].size;
      });
    }

    // Enrich products with tour counts
    const enrichedProducts = products?.map(p => ({
      ...p,
      tour_count: tourCounts[p.id] || 0,
    }));

    return NextResponse.json({
      products: enrichedProducts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error('Error in GET /api/products:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    const { sku, description, product_type } = body;

    // Validate required fields
    if (!sku || !description) {
      return NextResponse.json(
        { error: 'SKU and description are required' },
        { status: 400 }
      );
    }

    // Check if SKU already exists
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('sku', sku)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'A product with this SKU already exists' },
        { status: 409 }
      );
    }

    // Create the product
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        sku: sku.trim().toUpperCase(),
        description: description.trim(),
        product_type: product_type || 'other',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    console.error('Error in POST /api/products:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
