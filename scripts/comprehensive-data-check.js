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

async function comprehensiveCheck() {
  console.log('COMPREHENSIVE DATABASE DATA CHECK');
  console.log('='.repeat(70));

  // Variables for summary
  let showCount = 0, productCount = 0, tpCount = 0, salesCount = 0, poCount = 0, plCount = 0, overridesCount = 0;

  // 1. Check Tours
  console.log('\n1. TOURS');
  console.log('-'.repeat(70));
  const { data: tours, error: toursError } = await supabase
    .from('tours')
    .select('id, name, artist, start_date, end_date');

  if (toursError) {
    console.error('❌ Error:', toursError.message);
  } else {
    console.log(`✅ Found ${tours?.length || 0} tours`);
    tours?.forEach(t => {
      console.log(`   - ${t.name} (${t.artist})`);
      console.log(`     ID: ${t.id}`);
    });
  }

  // 2. Check Shows
  console.log('\n2. SHOWS');
  console.log('-'.repeat(70));
  const { data: shows, error: showsError } = await supabase
    .from('shows')
    .select('id, show_date, city, state, venue_name, attendance')
    .eq('tour_id', TOUR_ID)
    .order('show_date')
    .limit(5);

  if (showsError) {
    console.error('❌ Error:', showsError.message);
  } else {
    const showCountResult = await supabase
      .from('shows')
      .select('*', { count: 'exact', head: true })
      .eq('tour_id', TOUR_ID);
    showCount = showCountResult.count || 0;

    console.log(`✅ Found ${showCount} shows total`);
    console.log(`   First 5 shows:`);
    shows?.forEach(s => {
      console.log(`   - ${s.show_date} | ${s.city}, ${s.state} | ${s.venue_name}`);
    });
  }

  // 3. Check Products
  console.log('\n3. PRODUCTS');
  console.log('-'.repeat(70));
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, sku, description, product_type')
    .limit(10);

  if (productsError) {
    console.error('❌ Error:', productsError.message);
  } else {
    const productCountResult = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    productCount = productCountResult.count || 0;

    console.log(`✅ Found ${productCount} products total`);
    console.log(`   First 10 products:`);
    products?.forEach(p => {
      console.log(`   - ${p.sku} | ${p.description}`);
    });
  }

  // 4. Check Tour Products (with costs)
  console.log('\n4. TOUR PRODUCTS (Products available on this tour)');
  console.log('-'.repeat(70));
  const { data: tourProducts, error: tpError } = await supabase
    .from('tour_products')
    .select(`
      size,
      full_package_cost,
      suggested_retail,
      products!inner(sku, description)
    `)
    .eq('tour_id', TOUR_ID)
    .limit(10);

  if (tpError) {
    console.error('❌ Error:', tpError.message);
  } else {
    const tpCountResult = await supabase
      .from('tour_products')
      .select('*', { count: 'exact', head: true })
      .eq('tour_id', TOUR_ID);
    tpCount = tpCountResult.count || 0;

    console.log(`✅ Found ${tpCount} tour products (product + size combinations)`);
    console.log(`   Sample (first 10):`);
    tourProducts?.forEach(tp => {
      console.log(`   - ${tp.products.sku} ${tp.size} | Cost: $${tp.full_package_cost} | Retail: $${tp.suggested_retail || 'N/A'}`);
    });
  }

  // 5. Check Sales
  console.log('\n5. SALES DATA');
  console.log('-'.repeat(70));
  const salesCountResult = await supabase
    .from('sales')
    .select('*', { count: 'exact', head: true });

  if (salesCountResult.error) {
    console.error('❌ Error:', salesCountResult.error.message);
  } else {
    salesCount = salesCountResult.count || 0;
    console.log(`✅ Found ${salesCount} sales records total`);

    // Get sales by product
    const { data: salesByProduct } = await supabase
      .from('sales')
      .select(`
        qty_sold,
        unit_price,
        gross_sales,
        show_id,
        tour_products!inner(
          size,
          products!inner(sku, description)
        )
      `)
      .limit(10);

    if (salesByProduct) {
      console.log(`   Sample sales (first 10):`);
      salesByProduct.forEach(s => {
        console.log(`   - ${s.tour_products.products.sku} ${s.tour_products.size} | Qty: ${s.qty_sold} | Price: $${s.unit_price} | Total: $${s.gross_sales}`);
      });
    }

    // Total sales by show
    const { data: showSales } = await supabase
      .from('sales')
      .select('show_id, qty_sold')
      .limit(100);

    if (showSales) {
      const salesByShow = showSales.reduce((acc, s) => {
        acc[s.show_id] = (acc[s.show_id] || 0) + s.qty_sold;
        return acc;
      }, {});

      const uniqueShows = Object.keys(salesByShow).length;
      const totalQty = Object.values(salesByShow).reduce((sum, qty) => sum + qty, 0);
      console.log(`\n   Sales distribution:`);
      console.log(`   - ${uniqueShows} shows with sales data`);
      console.log(`   - ${totalQty} total units sold`);
    }
  }

  // 6. Check Comps
  console.log('\n6. COMPS (Complementary items)');
  console.log('-'.repeat(70));
  const { count: compsCount } = await supabase
    .from('comps')
    .select('*', { count: 'exact', head: true });

  console.log(`${compsCount ? '✅' : 'ℹ️ '} Found ${compsCount || 0} comp records`);

  // 7. Check Purchase Orders
  console.log('\n7. PURCHASE ORDERS');
  console.log('-'.repeat(70));
  const poCountResult = await supabase
    .from('purchase_orders')
    .select('*', { count: 'exact', head: true })
    .eq('tour_id', TOUR_ID);
  poCount = poCountResult.count || 0;

  console.log(`${poCount ? '✅' : 'ℹ️ '} Found ${poCount} purchase orders`);

  // 8. Check Packing Lists
  console.log('\n8. PACKING LISTS (Inventory receipts)');
  console.log('-'.repeat(70));
  const plCountResult = await supabase
    .from('packing_lists')
    .select('*', { count: 'exact', head: true })
    .eq('tour_id', TOUR_ID);
  plCount = plCountResult.count || 0;

  console.log(`${plCount ? '✅' : 'ℹ️ '} Found ${plCount} packing lists`);

  // 9. Check Forecast Scenarios
  console.log('\n9. FORECAST SCENARIOS');
  console.log('-'.repeat(70));
  const { data: scenarios, error: scenariosError } = await supabase
    .from('forecast_scenarios')
    .select('*')
    .eq('tour_id', TOUR_ID);

  if (scenariosError) {
    console.error('❌ Error:', scenariosError.message);
  } else {
    console.log(`✅ Found ${scenarios?.length || 0} forecast scenarios`);
    scenarios?.forEach(s => {
      console.log(`   - ${s.name} (${s.is_baseline ? 'baseline' : 'variant'})`);
    });
  }

  // 10. Check Forecast Overrides
  console.log('\n10. FORECAST OVERRIDES (Projection quantities)');
  console.log('-'.repeat(70));
  const overridesCountResult = await supabase
    .from('forecast_overrides')
    .select('*', { count: 'exact', head: true });
  overridesCount = overridesCountResult.count || 0;

  const { data: sampleOverrides } = await supabase
    .from('forecast_overrides')
    .select('sku, size, override_units')
    .limit(10);

  console.log(`✅ Found ${overridesCount} forecast overrides`);
  if (sampleOverrides && sampleOverrides.length > 0) {
    console.log(`   Sample (first 10):`);
    sampleOverrides.forEach(o => {
      console.log(`   - ${o.sku} ${o.size}: ${o.override_units} units projected`);
    });
  }

  // 11. Check Inventory Balances View
  console.log('\n11. INVENTORY BALANCES VIEW');
  console.log('-'.repeat(70));
  const { data: inventory, error: invError } = await supabase
    .from('inventory_balances')
    .select('product_id, size, total_received, total_sold, total_comps, balance')
    .eq('tour_id', TOUR_ID)
    .limit(10);

  if (invError) {
    console.error('❌ Error:', invError.message);
  } else {
    const { count: invCount } = await supabase
      .from('inventory_balances')
      .select('*', { count: 'exact', head: true })
      .eq('tour_id', TOUR_ID);

    console.log(`✅ Found ${invCount} inventory balance records`);
    console.log(`   Sample (first 10):`);
    inventory?.forEach(i => {
      console.log(`   - Size ${i.size} | Received: ${i.total_received} | Sold: ${i.total_sold} | Balance: ${i.balance}`);
    });
  }

  // 12. Check Critical Views (for dashboards)
  console.log('\n12. CRITICAL DASHBOARD VIEWS');
  console.log('-'.repeat(70));

  const views = [
    { name: 'product_summary_view', description: 'Product-level COGS' },
    { name: 'show_summary_view', description: 'Show-level performance' },
    { name: 'po_open_qty_view', description: 'Open PO quantities' },
    { name: 'stock_movement_view', description: 'Stock movements' }
  ];

  for (const view of views) {
    const { data, error } = await supabase
      .from(view.name)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`   ❌ ${view.name}: NOT CREATED YET`);
      console.log(`      (Needed for: ${view.description})`);
    } else {
      console.log(`   ✅ ${view.name}: EXISTS`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  console.log('\n✅ DATA LOADED:');
  console.log(`   - Tours: ${tours?.length || 0}`);
  console.log(`   - Shows: ${showCount || 0}`);
  console.log(`   - Products: ${productCount || 0}`);
  console.log(`   - Tour Products: ${tpCount || 0}`);
  console.log(`   - Sales Records: ${salesCount || 0}`);
  console.log(`   - Forecast Scenarios: ${scenarios?.length || 0}`);
  console.log(`   - Forecast Overrides: ${overridesCount || 0}`);

  console.log('\nℹ️  EMPTY (Expected):');
  console.log(`   - Purchase Orders: ${poCount || 0} (Excel doesn't have PO data)`);
  console.log(`   - Packing Lists: ${plCount || 0} (Will populate from uploads)`);

  console.log('\n⚠️  ACTION REQUIRED:');
  console.log('   - Apply database migration for dashboard views');
  console.log('   - See APPLY_MIGRATION.md for instructions');

  console.log('\n' + '='.repeat(70));
}

comprehensiveCheck().catch(console.error);
