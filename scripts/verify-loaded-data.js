#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOUR_ID = '123e4567-e89b-12d3-a456-426614174000';

async function verifyData() {
  console.log('GHOST 2025 TOUR - DATA VERIFICATION');
  console.log('='.repeat(60));

  // Count sales records
  const { count: salesCount, error: salesError } = await supabase
    .from('sales')
    .select('*', { count: 'exact', head: true })
    .eq('show_id', '423e4567-e89b-12d3-a456-426614174001'); // Just count for one show to verify

  if (salesError) {
    console.error('Sales error:', salesError);
  } else {
    console.log(`\n✅ Sales records for first show (Baltimore): ${salesCount}`);
  }

  // Get total sales across all shows
  const { data: allSales, error: allSalesError } = await supabase
    .from('sales')
    .select('show_id')
    .in('show_id', ['423e4567-e89b-12d3-a456-426614174001', '423e4567-e89b-12d3-a456-426614174002', '423e4567-e89b-12d3-a456-426614174003']);

  if (!allSalesError && allSales) {
    console.log(`✅ Sales records across first 3 shows: ${allSales.length}`);
  }

  // Check forecast scenarios
  const { data: scenarios, error: scenariosError } = await supabase
    .from('forecast_scenarios')
    .select('*')
    .eq('tour_id', TOUR_ID);

  if (scenariosError) {
    console.error('Scenarios error:', scenariosError);
  } else {
    console.log(`\n✅ Forecast scenarios: ${scenarios?.length || 0}`);
    scenarios?.forEach(s => {
      console.log(`  - ${s.name} (${s.is_baseline ? 'baseline' : 'variant'})`);
    });
  }

  // Check forecast overrides
  const { count: overridesCount, error: overridesError } = await supabase
    .from('forecast_overrides')
    .select('*', { count: 'exact', head: true });

  if (overridesError) {
    console.error('Overrides error:', overridesError);
  } else {
    console.log(`✅ Forecast overrides: ${overridesCount}`);
  }

  // Sample some overrides
  const { data: sampleOverrides, error: sampleError } = await supabase
    .from('forecast_overrides')
    .select('sku, size, override_units')
    .limit(5);

  if (!sampleError && sampleOverrides) {
    console.log('\nSample forecast overrides:');
    sampleOverrides.forEach(o => {
      console.log(`  - ${o.sku} size ${o.size}: ${o.override_units} units`);
    });
  }

  // Check total sales by product
  const { data: salesByProduct, error: salesByProductError } = await supabase
    .from('sales')
    .select(`
      qty_sold,
      tour_products!inner(
        products!inner(sku, description)
      )
    `)
    .limit(10);

  if (!salesByProductError && salesByProduct) {
    console.log('\n✅ Sales data sample (first 10 records):');
    salesByProduct.forEach(s => {
      const product = s.tour_products.products;
      console.log(`  - ${product.sku}: ${s.qty_sold} sold`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Data verification complete!');
}

verifyData().catch(console.error);
