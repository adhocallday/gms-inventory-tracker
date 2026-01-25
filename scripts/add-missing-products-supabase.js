#!/usr/bin/env node

const { createServiceClient } = require('../lib/supabase/client.ts');

async function addMissingProducts() {
  const supabase = createServiceClient();

  console.log('Adding missing products to database...\n');

  // Add GHOSNS503396BK
  const { data: hoodie, error: hoodieError } = await supabase
    .from('products')
    .upsert({
      sku: 'GHOSNS503396BK',
      description: 'BATWING ZIP HOODIE',
      product_type: 'apparel'
    }, { onConflict: 'sku' })
    .select()
    .single();

  if (hoodieError) {
    console.error('Error adding hoodie:', hoodieError);
  } else {
    console.log('✅ Added GHOSNS503396BK - BATWING ZIP HOODIE');
  }

  // Add GHOSRX203275B
  const { data: shorts, error: shortsError } = await supabase
    .from('products')
    .upsert({
      sku: 'GHOSRX203275B',
      description: 'RUNNING SHORTS (BLACK)',
      product_type: 'apparel'
    }, { onConflict: 'sku' })
    .select()
    .single();

  if (shortsError) {
    console.error('Error adding shorts:', shortsError);
  } else {
    console.log('✅ Added GHOSRX203275B - RUNNING SHORTS (BLACK)');
  }

  // Get Ghost tour ID
  const tourId = '123e4567-e89b-12d3-a456-426614174000';

  // Add tour_products for hoodie
  if (hoodie) {
    const sizes = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
    for (const size of sizes) {
      const { error } = await supabase
        .from('tour_products')
        .upsert({
          tour_id: tourId,
          product_id: hoodie.id,
          size: size,
          blank_unit_cost: 0,
          print_unit_cost: 0,
          full_package_cost: 28.50,
          suggested_retail: null
        }, { onConflict: 'tour_id,product_id,size' });

      if (error) console.error(`Error adding hoodie ${size}:`, error);
    }
    console.log('✅ Added tour_products for GHOSNS503396BK (6 sizes)');
  }

  // Add tour_products for shorts
  if (shorts) {
    const sizes = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
    for (const size of sizes) {
      const { error } = await supabase
        .from('tour_products')
        .upsert({
          tour_id: tourId,
          product_id: shorts.id,
          size: size,
          blank_unit_cost: 5.50,
          print_unit_cost: 0,
          full_package_cost: 0,
          suggested_retail: null
        }, { onConflict: 'tour_id,product_id,size' });

      if (error) console.error(`Error adding shorts ${size}:`, error);
    }
    console.log('✅ Added tour_products for GHOSRX203275B (6 sizes)');
  }

  console.log('\n✅ All missing products added successfully!');
}

addMissingProducts().catch(console.error);
