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

async function checkComps() {
  const { data: comps, error } = await supabase
    .from('comps')
    .select('id, show_id, tour_product_id, quantity, shows(city, show_date)')
    .order('show_id');

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('Total comps records:', comps.length);
  console.log('\nComps breakdown by show:');

  const byShow = {};
  for (const comp of comps) {
    const showCity = comp.shows?.city || 'Unknown';
    const showDate = comp.shows?.show_date || 'Unknown';
    const key = `${showCity} (${showDate})`;
    if (!byShow[key]) {
      byShow[key] = { count: 0, total: 0 };
    }
    byShow[key].count++;
    byShow[key].total += comp.quantity;
  }

  for (const [showInfo, data] of Object.entries(byShow)) {
    console.log(`  ${showInfo}: ${data.count} records, ${data.total} total comps`);
  }

  // Check show_summary_view
  console.log('\n\nChecking show_summary_view for comps:');
  const { data: showSummary } = await supabase
    .from('show_summary_view')
    .select('show_id, city, show_date, total_comps')
    .eq('tour_id', '123e4567-e89b-12d3-a456-426614174000')
    .order('show_date');

  if (showSummary) {
    for (const show of showSummary) {
      if (show.total_comps > 0) {
        console.log(`  ${show.city} (${show.show_date}): ${show.total_comps} comps`);
      }
    }
  }

  // Check Baltimore specifically
  console.log('\n\nChecking Baltimore show details:');
  const { data: baltShow } = await supabase
    .from('shows')
    .select('id, city, show_date')
    .eq('city', 'Baltimore')
    .single();

  if (baltShow) {
    const { count: salesCount } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', baltShow.id);

    const { count: compsCount } = await supabase
      .from('comps')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', baltShow.id);

    console.log(`  Show: ${baltShow.city} (${baltShow.show_date})`);
    console.log(`  Sales records: ${salesCount}`);
    console.log(`  Comps records: ${compsCount}`);
    console.log(`  Expected comps: ${compsCount} records`);
    console.log(`  View shows: 279 comps`);
    console.log(`  Issue: ${salesCount} sales × ${compsCount} comps = ${salesCount * compsCount} (Cartesian product!)`);
  }
}

checkComps().catch(console.error);
