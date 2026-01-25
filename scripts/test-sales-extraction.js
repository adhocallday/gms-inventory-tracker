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

async function getShowId(date, venueName) {
  const { data } = await supabase
    .from('shows')
    .select('id, show_date, city')
    .eq('tour_id', TOUR_ID)
    .eq('show_date', date)
    .maybeSingle();

  return data?.id || null;
}

async function getTourProductId(sku, size) {
  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('sku', sku)
    .maybeSingle();

  if (!product) return null;

  const { data: tourProduct } = await supabase
    .from('tour_products')
    .select('id, size')
    .eq('tour_id', TOUR_ID)
    .eq('product_id', product.id)
    .eq('size', size || 'OS')
    .maybeSingle();

  return tourProduct?.id || null;
}

async function testSalesExtraction() {
  const workbook = XLSX.readFile(filePath);
  const sheetName = 'BLK T ADMAT ITIN';

  console.log(`Testing sales extraction from: ${sheetName}\n`);

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

  // Find header row
  let headerRow = null;
  let headerIndex = -1;
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    if (row && row.some(cell => cell === 'Date' || cell === 'City')) {
      headerRow = row;
      headerIndex = i;
      break;
    }
  }

  console.log(`Header row at index: ${headerIndex}`);
  console.log(`Header:`, headerRow.slice(0, 30));

  // Find size columns
  const sizeColumns = {};
  headerRow.forEach((cell, idx) => {
    if (cell && typeof cell === 'string') {
      const normalized = cell.trim().toUpperCase();
      if (['SM', 'S', 'SMALL'].includes(normalized)) sizeColumns['S'] = idx;
      if (['MED', 'M', 'MEDIUM'].includes(normalized)) sizeColumns['M'] = idx;
      if (['LG', 'L', 'LARGE'].includes(normalized)) sizeColumns['L'] = idx;
      if (['XL'].includes(normalized)) sizeColumns['XL'] = idx;
      if (['2X', '2XL', 'XXL'].includes(normalized)) sizeColumns['2XL'] = idx;
      if (['3X', '3XL', 'XXXL'].includes(normalized)) sizeColumns['3XL'] = idx;
      if (['4X', '4XL'].includes(normalized)) sizeColumns['4XL'] = idx;
    }
  });

  console.log(`\nSize columns:`, sizeColumns);

  // Show first data row
  console.log(`\nFirst data row (index ${headerIndex + 1}):`, data[headerIndex + 1]);

  const firstDataRow = data[headerIndex + 1];
  const excelDate = firstDataRow[0];
  const city = firstDataRow[1];

  console.log(`\nExcel date: ${excelDate}`);
  console.log(`City: ${city}`);

  // Convert date
  const date = XLSX.SSF.parse_date_code(excelDate);
  const formattedDate = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  console.log(`Formatted date: ${formattedDate}`);

  // Get show ID
  const showId = await getShowId(formattedDate, city);
  console.log(`Show ID: ${showId || 'NOT FOUND'}`);

  // Try to get tour product for first size
  const firstSize = Object.keys(sizeColumns)[0];
  const colIdx = sizeColumns[firstSize];
  const quantity = firstDataRow[colIdx];

  console.log(`\nTest size: ${firstSize}, Column: ${colIdx}, Quantity: ${quantity}`);

  const tourProductId = await getTourProductId(sku, firstSize);
  console.log(`Tour product ID: ${tourProductId || 'NOT FOUND'}`);
}

testSalesExtraction().catch(console.error);
