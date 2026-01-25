#!/usr/bin/env node

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

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

async function getShowId(date) {
  const { data } = await supabase
    .from('shows')
    .select('id')
    .eq('tour_id', TOUR_ID)
    .eq('show_date', date)
    .maybeSingle();

  return data?.id || null;
}

async function loadSalesLimited() {
  console.log('GHOST 2025 - LIMITED SALES DATA LOAD (3 products)');
  console.log('='.repeat(60));

  const workbook = XLSX.readFile(filePath);

  // Test with just 3 products
  const productSheets = [
    'BLK T ADMAT ITIN',
    'HAT',
    'TOUR PROGRAM'
  ];

  let totalSalesRecords = 0;

  for (const sheetName of productSheets) {
    if (!workbook.Sheets[sheetName]) {
      console.log(`⚠️  Sheet not found: ${sheetName}`);
      continue;
    }

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

    if (!sku) {
      console.log(`\n⚠️  ${sheetName}: Could not find SKU`);
      continue;
    }

    console.log(`\n${sheetName} (SKU: ${sku})`);

    // Get product and tour products
    const { data: product } = await supabase
      .from('products')
      .select('id, description')
      .eq('sku', sku)
      .maybeSingle();

    if (!product) {
      console.log(`  ⚠️  Product not found`);
      continue;
    }

    const { data: tourProducts } = await supabase
      .from('tour_products')
      .select('id, size')
      .eq('tour_id', TOUR_ID)
      .eq('product_id', product.id)
      .order('size');

    if (!tourProducts || tourProducts.length === 0) {
      console.log(`  ⚠️  No tour products found`);
      continue;
    }

    console.log(`  ${tourProducts.length} sizes: ${tourProducts.map(tp => tp.size).join(', ')}`);

    // Find header row
    let headerIndex = -1;
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      if (row && row.some(cell => cell === 'Date' || cell === 'City')) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      console.log(`  ⚠️  Could not find header row`);
      continue;
    }

    const totalSizes = tourProducts.length;
    const salesRecords = [];
    let showsWithSales = 0;

    // Extract sales data
    for (let i = headerIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 3) continue;

      const excelDate = row[0];
      const salesTotal = row[2] || row[6];

      if (!excelDate || typeof excelDate !== 'number') continue;
      if (!salesTotal || salesTotal === 0) continue;

      const date = XLSX.SSF.parse_date_code(excelDate);
      const formattedDate = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;

      const showId = await getShowId(formattedDate);
      if (!showId) continue;

      showsWithSales++;

      // Distribute sales equally across sizes
      const salesPerSize = Math.floor(salesTotal / totalSizes);
      const remainder = salesTotal % totalSizes;

      tourProducts.forEach((tp, idx) => {
        const quantity = salesPerSize + (idx < remainder ? 1 : 0);

        salesRecords.push({
          id: crypto.randomUUID(),
          show_id: showId,
          tour_product_id: tp.id,
          qty_sold: quantity,
          unit_price: 0, // Pricing data not in sales sheets
          gross_sales: 0, // Will be calculated when prices are loaded
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          source_doc_id: null
        });
      });
    }

    console.log(`  Found ${showsWithSales} shows with sales`);
    console.log(`  Inserting ${salesRecords.length} sales records...`);

    if (salesRecords.length > 0) {
      // Insert in batches
      for (let i = 0; i < salesRecords.length; i += 100) {
        const batch = salesRecords.slice(i, i + 100);
        const { error } = await supabase
          .from('sales')
          .insert(batch);

        if (error) {
          console.error(`  ❌ Error: ${error.message}`);
          break;
        }
      }

      console.log(`  ✅ Inserted successfully`);
      totalSalesRecords += salesRecords.length;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`COMPLETE: ${totalSalesRecords} total sales records loaded`);
}

loadSalesLimited().catch(console.error);
