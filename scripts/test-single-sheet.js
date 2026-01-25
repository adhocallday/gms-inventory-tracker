#!/usr/bin/env node

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const filePath = 'ghosttrackers/01 GHOST 2025 TOUR.xlsx';
const TOUR_ID = '123e4567-e89b-12d3-a456-426614174000';

async function testSingleSheet() {
  const workbook = XLSX.readFile(filePath);
  const sheetName = 'BLK T ADMAT ITIN';

  console.log(`Testing sheet: ${sheetName}`);

  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Find SKU
  let sku = null;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (row && row.length > 1) {
      for (let j = row.length - 1; j >= 0; j--) {
        const cellValue = row[j];
        if (cellValue && typeof cellValue === 'string' && cellValue.startsWith('GHOS') && cellValue.length > 10) {
          sku = cellValue;
          break;
        }
      }
      if (sku) break;
    }
  }

  console.log(`Found SKU: ${sku}`);

  // Look up product in database
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, sku, description')
    .eq('sku', sku)
    .maybeSingle();

  if (productError) {
    console.error('Product query error:', productError);
  } else if (product) {
    console.log(`✅ Found product: ${product.description}`);

    // Look up tour products
    const { data: tourProducts, error: tpError } = await supabase
      .from('tour_products')
      .select('id, size')
      .eq('tour_id', TOUR_ID)
      .eq('product_id', product.id);

    if (tpError) {
      console.error('Tour product query error:', tpError);
    } else {
      console.log(`✅ Found ${tourProducts?.length || 0} tour products:`);
      tourProducts?.forEach(tp => console.log(`  - Size: ${tp.size}`));
    }
  } else {
    console.log(`❌ Product not found for SKU: ${sku}`);
  }
}

testSingleSheet().catch(console.error);
