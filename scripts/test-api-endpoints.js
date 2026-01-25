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

async function testAPIs() {
  console.log('TESTING API DATA QUERIES FOR GHOST 2025');
  console.log('='.repeat(60));

  // Test 1: Product Summary View (for COGS)
  console.log('\n1. Testing product_summary_view...');
  const { data: productSummary, error: productError } = await supabase
    .from('product_summary_view')
    .select('*')
    .eq('tour_id', TOUR_ID)
    .limit(5);

  if (productError) {
    console.error('❌ Error:', productError.message);
  } else {
    console.log(`✅ Found ${productSummary?.length || 0} products`);
    if (productSummary && productSummary.length > 0) {
      console.log('Sample:', {
        sku: productSummary[0].sku,
        total_sold: productSummary[0].total_sold,
        total_gross: productSummary[0].total_gross,
        total_cogs: productSummary[0].total_cogs
      });
    }
  }

  // Test 2: Show Summary View (for COGS)
  console.log('\n2. Testing show_summary_view...');
  const { data: showSummary, error: showError } = await supabase
    .from('show_summary_view')
    .select('*')
    .eq('tour_id', TOUR_ID)
    .limit(5);

  if (showError) {
    console.error('❌ Error:', showError.message);
  } else {
    console.log(`✅ Found ${showSummary?.length || 0} shows`);
    if (showSummary && showSummary.length > 0) {
      console.log('Sample:', {
        show_date: showSummary[0].show_date,
        venue_name: showSummary[0].venue_name,
        total_units: showSummary[0].total_units,
        total_gross: showSummary[0].total_gross
      });
    }
  }

  // Test 3: Inventory Balances
  console.log('\n3. Testing inventory_balances...');
  const { data: inventory, error: invError } = await supabase
    .from('inventory_balances')
    .select('*')
    .eq('tour_id', TOUR_ID)
    .limit(5);

  if (invError) {
    console.error('❌ Error:', invError.message);
  } else {
    console.log(`✅ Found ${inventory?.length || 0} inventory records`);
    if (inventory && inventory.length > 0) {
      console.log('Sample:', {
        product_id: inventory[0].product_id?.substring(0, 8) + '...',
        size: inventory[0].size,
        total_received: inventory[0].total_received,
        total_sold: inventory[0].total_sold,
        balance: inventory[0].balance
      });
    }
  }

  // Test 4: Sales with joins (as COGS API does)
  console.log('\n4. Testing sales join with tour_products...');
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select(`
      qty_sold,
      unit_price,
      gross_sales,
      tour_products!inner(
        full_package_cost,
        suggested_retail
      )
    `)
    .limit(5);

  if (salesError) {
    console.error('❌ Error:', salesError.message);
  } else {
    console.log(`✅ Found ${sales?.length || 0} sales records`);
    if (sales && sales.length > 0) {
      console.log('Sample:', {
        qty_sold: sales[0].qty_sold,
        unit_price: sales[0].unit_price,
        cost: sales[0].tour_products?.full_package_cost
      });
    }
  }

  // Test 5: Forecast Scenarios
  console.log('\n5. Testing forecast_scenarios...');
  const { data: scenarios, error: scenarioError } = await supabase
    .from('forecast_scenarios')
    .select('*')
    .eq('tour_id', TOUR_ID);

  if (scenarioError) {
    console.error('❌ Error:', scenarioError.message);
  } else {
    console.log(`✅ Found ${scenarios?.length || 0} scenarios`);
    if (scenarios && scenarios.length > 0) {
      console.log('Scenario:', {
        name: scenarios[0].name,
        is_baseline: scenarios[0].is_baseline
      });
    }
  }

  // Test 6: Forecast Overrides
  console.log('\n6. Testing forecast_overrides...');
  const { data: overrides, error: overrideError } = await supabase
    .from('forecast_overrides')
    .select('sku, size, override_units')
    .limit(5);

  if (overrideError) {
    console.error('❌ Error:', overrideError.message);
  } else {
    console.log(`✅ Found ${overrides?.length || 0} overrides`);
    if (overrides && overrides.length > 0) {
      console.log('Sample overrides:');
      overrides.forEach(o => {
        console.log(`  - ${o.sku} ${o.size}: ${o.override_units} units`);
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ API data query tests complete!');
}

testAPIs().catch(console.error);
