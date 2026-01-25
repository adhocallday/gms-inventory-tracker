#!/usr/bin/env node

const { createServiceClient } = require('../lib/supabase/client.ts');

async function checkProducts() {
  const supabase = createServiceClient();

  const { data, error, count } = await supabase
    .from('products')
    .select('sku, description', { count: 'exact' })
    .order('sku');

  console.log('Total products in database:', count);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('\nFirst 10 products:');
    data.slice(0, 10).forEach(p => console.log(`  ${p.sku} - ${p.description}`));
  } else {
    console.log('\nNo products found in database');
  }
}

checkProducts().catch(console.error);
