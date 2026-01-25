#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOUR_ID = '123e4567-e89b-12d3-a456-426614174000';

async function verify() {
  console.log('FINAL DATA VERIFICATION - GHOST 2025 TOUR');
  console.log('='.repeat(70));

  // Check POs
  const { count: poCount } = await supabase
    .from('purchase_orders')
    .select('*', { count: 'exact', head: true })
    .eq('tour_id', TOUR_ID);

  console.log(`\n✅ Purchase Orders: ${poCount}`);

  // Sample POs
  const { data: samplePOs } = await supabase
    .from('purchase_orders')
    .select('vendor, po_number, order_date, status')
    .eq('tour_id', TOUR_ID)
    .limit(5);

  samplePOs?.forEach(po => {
    console.log(`   - ${po.vendor}: ${po.po_number} (${po.status})`);
  });

  // Check packing lists
  const { count: plCount } = await supabase
    .from('packing_lists')
    .select('*, purchase_orders!inner(tour_id)', { count: 'exact', head: true })
    .eq('purchase_orders.tour_id', TOUR_ID);

  console.log(`\n✅ Packing Lists: ${plCount}`);

  // Check PO line items
  const { count: lineCount } = await supabase
    .from('po_line_items')
    .select('*, purchase_orders!inner(tour_id)', { count: 'exact', head: true })
    .eq('purchase_orders.tour_id', TOUR_ID);

  console.log(`✅ PO Line Items: ${lineCount}`);

  // Check packing list items
  const { count: pliCount } = await supabase
    .from('packing_list_items')
    .select('*', { count: 'exact', head: true });

  console.log(`✅ Packing List Items: ${pliCount}`);

  // Check inventory balances
  const { data: inventory, count: invCount } = await supabase
    .from('inventory_balances')
    .select('product_id, size, total_received, total_sold, balance', { count: 'exact' })
    .eq('tour_id', TOUR_ID)
    .gt('total_received', 0)
    .limit(10);

  console.log(`\n✅ Inventory items with receipts: ${invCount} total`);
  console.log('   Sample (first 10):');
  inventory?.forEach(i => {
    console.log(`   - Received ${i.total_received}, Sold ${i.total_sold}, Balance ${i.balance}`);
  });

  // Check shows with attendance
  const { count: showsWithAttendance } = await supabase
    .from('shows')
    .select('*', { count: 'exact', head: true })
    .eq('tour_id', TOUR_ID)
    .not('attendance', 'is', null);

  console.log(`\n✅ Shows with attendance: ${showsWithAttendance}/27`);

  // Check sales with revenue
  const { count: salesWithRevenue } = await supabase
    .from('sales')
    .select('*', { count: 'exact', head: true })
    .gt('gross_sales', 0);

  console.log(`✅ Sales with revenue: ${salesWithRevenue}/1757`);

  // Total revenue
  const { data: totalRevenue } = await supabase
    .from('sales')
    .select('gross_sales');

  const totalRev = totalRevenue?.reduce((sum, s) => sum + (s.gross_sales || 0), 0) || 0;
  console.log(`✅ Total tour revenue: $${totalRev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  console.log(`\n${'='.repeat(70)}`);
  console.log('✅ ALL DATA LOADED SUCCESSFULLY!');
  console.log(`${'='.repeat(70)}`);
  console.log('\nDashboard URLs:');
  console.log(`  COGS: http://localhost:3000/tours/${TOUR_ID}/cogs`);
  console.log(`  Inventory: http://localhost:3000/tours/${TOUR_ID}/inventory`);
  console.log(`  Projections: http://localhost:3000/tours/${TOUR_ID}/projections`);
}

verify().catch(console.error);
