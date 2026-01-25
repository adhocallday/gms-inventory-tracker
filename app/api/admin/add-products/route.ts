import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import crypto from 'crypto';

export async function POST() {
  const supabase = createServiceClient();

  try {
    // Check if products already exist
    let { data: hoodie } = await supabase
      .from('products')
      .select()
      .eq('sku', 'GHOSNS503396BK')
      .single();

    let { data: shorts } = await supabase
      .from('products')
      .select()
      .eq('sku', 'GHOSRX203275B')
      .single();

    // Insert only if they don't exist
    if (!hoodie) {
      const hoodieId = crypto.randomUUID();
      const { error } = await supabase
        .from('products')
        .insert({
          id: hoodieId,
          sku: 'GHOSNS503396BK',
          description: 'BATWING ZIP HOODIE',
          product_type: 'apparel'
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const result = await supabase
        .from('products')
        .select()
        .eq('sku', 'GHOSNS503396BK')
        .single();
      hoodie = result.data;
    }

    if (!shorts) {
      const shortsId = crypto.randomUUID();
      const { error } = await supabase
        .from('products')
        .insert({
          id: shortsId,
          sku: 'GHOSRX203275B',
          description: 'RUNNING SHORTS (BLACK)',
          product_type: 'apparel'
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const result = await supabase
        .from('products')
        .select()
        .eq('sku', 'GHOSRX203275B')
        .single();
      shorts = result.data;
    }

    if (!hoodie || !shorts) {
      return NextResponse.json({
        error: 'Products not found after insert'
      }, { status: 500 });
    }

    const tourId = '123e4567-e89b-12d3-a456-426614174000';
    const sizes = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

    // Add tour_products for both products
    const tourProducts = [];
    for (const size of sizes) {
      tourProducts.push({
        tour_id: tourId,
        product_id: hoodie.id,
        size: size,
        blank_unit_cost: 0,
        print_unit_cost: 0,
        full_package_cost: 28.50,
        suggested_retail: null
      });
      tourProducts.push({
        tour_id: tourId,
        product_id: shorts.id,
        size: size,
        blank_unit_cost: 5.50,
        print_unit_cost: 0,
        full_package_cost: 0,
        suggested_retail: null
      });
    }

    const { error: tourProductsError } = await supabase
      .from('tour_products')
      .upsert(tourProducts, { onConflict: 'tour_id,product_id,size' });

    if (tourProductsError) {
      return NextResponse.json({
        error: tourProductsError.message,
        products: [hoodie, shorts]
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      products: [hoodie, shorts],
      message: 'Added 2 products with 12 size variants'
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
