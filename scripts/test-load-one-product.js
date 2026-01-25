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
    .select('id, show_date, city')
    .eq('tour_id', TOUR_ID)
    .eq('show_date', date)
    .maybeSingle();

  return data?.id || null;
}

async function loadOneProduct() {
  const workbook = XLSX.readFile(filePath);
  const sheetName = 'BLK T ADMAT ITIN';
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

  console.log(`SKU: ${sku}\n`);

  // Get product and tour products
  const { data: product } = await supabase
    .from('products')
    .select('id, description')
    .eq('sku', sku)
    .maybeSingle();

  if (!product) {
    console.log('Product not found');
    return;
  }

  console.log(`Product: ${product.description}\n`);

  const { data: tourProducts } = await supabase
    .from('tour_products')
    .select('id, size')
    .eq('tour_id', TOUR_ID)
    .eq('product_id', product.id)
    .order('size');

  console.log(`Tour products: ${tourProducts.length} sizes`);
  tourProducts.forEach(tp => console.log(`  - ${tp.size}: ${tp.id}`));

  // Find header row
  let headerIndex = -1;
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    if (row && row.some(cell => cell === 'Date' || cell === 'City')) {
      headerIndex = i;
      break;
    }
  }

  // Process first show
  const firstRow = data[headerIndex + 1];
  const excelDate = firstRow[0];
  const city = firstRow[1];
  const salesTotal = firstRow[2];

  const date = XLSX.SSF.parse_date_code(excelDate);
  const formattedDate = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;

  console.log(`\nFirst show: ${formattedDate} ${city}`);
  console.log(`Total sales: ${salesTotal}`);

  const showId = await getShowId(formattedDate);
  console.log(`Show ID: ${showId}\n`);

  // Distribute sales
  const totalSizes = tourProducts.length;
  const salesPerSize = Math.floor(salesTotal / totalSizes);
  const remainder = salesTotal % totalSizes;

  console.log(`Sales distribution:`);
  console.log(`  Per size (base): ${salesPerSize}`);
  console.log(`  Remainder: ${remainder}`);
  console.log(`  Distribution:`);

  const salesRecords = [];
  tourProducts.forEach((tp, idx) => {
    const quantity = salesPerSize + (idx < remainder ? 1 : 0);
    console.log(`    ${tp.size}: ${quantity}`);

    salesRecords.push({
      id: crypto.randomUUID(),
      tour_id: TOUR_ID,
      show_id: showId,
      tour_product_id: tp.id,
      quantity_sold: quantity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  const total = salesRecords.reduce((sum, r) => sum + r.quantity_sold, 0);
  console.log(`\n  Total distributed: ${total} (should equal ${salesTotal})`);

  console.log(`\nWould insert ${salesRecords.length} sales records`);
  console.log('Sample record:', salesRecords[0]);
}

loadOneProduct().catch(console.error);
