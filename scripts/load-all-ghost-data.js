#!/usr/bin/env node

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Env vars should be passed from shell
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

// Helper to get show ID by date and venue
async function getShowId(date, venueName) {
  const { data } = await supabase
    .from('shows')
    .select('id')
    .eq('tour_id', TOUR_ID)
    .eq('show_date', date)
    .maybeSingle();

  return data?.id || null;
}

// Helper to get tour product ID
async function getTourProductId(sku, size) {
  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('sku', sku)
    .maybeSingle();

  if (!product) return null;

  const { data: tourProduct } = await supabase
    .from('tour_products')
    .select('id')
    .eq('tour_id', TOUR_ID)
    .eq('product_id', product.id)
    .eq('size', size || 'OS')
    .maybeSingle();

  return tourProduct?.id || null;
}

async function loadSalesData() {
  console.log('\n' + '='.repeat(60));
  console.log('LOADING SALES DATA FROM PRODUCT SHEETS');
  console.log('='.repeat(60));

  const workbook = XLSX.readFile(filePath);

  // Product sheets with sales data (these match individual SKU sheets)
  const productSheets = [
    'BLK T ADMAT ITIN',
    'BLK T SKELETA ITIN',
    'BLK T EMERITUS ITIN',
    'TANK TOP',
    'LADIES CROP TOP',
    'LADIES RAGLAN ',
    'BATWING HOODY',
    'PO HOODY',
    'SHORTS BLK',
    'TIE DYE T',
    'CRYSTAL WASHED T',
    'OIL WASHED T',
    'SHORTS RED',
    'TAMPA',
    'PHILLY',
    'BOSTON',
    'NEW YORK',
    'CHICAGO',
    'HAT',
    'MASK',
    'PLUSHIE',
    'CLEAR SLING BAG',
    'CHOKER',
    'KEYCHAIN',
    'PATCH SET',
    'TOUR PROGRAM',
    'COMIC BOOK #1',
    'COMIC BOOK #2',
    'COMIC BOOK #3',
    'COMIC BOOK #4',
    'FOILED COMIC BOOK #2',
    'FOILED COMIC BOOK #3',
    'FOILED COMIC BOOK #4',
    'ROLLING STONE',
    'LP SKELETA POLTER',
    'CD',
    'BLK STANDARD LP',
    'PURPLE LP LENTICULAR',
    'CASSETTE'
  ];

  let totalSalesRecords = 0;
  let sheetsProcessed = 0;

  for (const sheetName of productSheets) {
    if (!workbook.Sheets[sheetName]) {
      console.log(`⚠️  Sheet not found: ${sheetName}`);
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Find SKU in the sheet (usually in first few rows)
    let sku = null;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (row && row.length > 1) {
        const cellValue = row[1];
        if (cellValue && typeof cellValue === 'string' && cellValue.startsWith('GHOS')) {
          sku = cellValue;
          break;
        }
      }
    }

    if (!sku) {
      console.log(`⚠️  Could not find SKU in sheet: ${sheetName}`);
      continue;
    }

    console.log(`\nProcessing ${sheetName} (SKU: ${sku})...`);
    sheetsProcessed++;

    // Find header row (usually row 2)
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

    if (!headerRow) {
      console.log(`⚠️  Could not find header row in sheet: ${sheetName}`);
      continue;
    }

    // Find size columns (SM, MED, LG, XL, 2X, 3X, 4X)
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

    const hasSizes = Object.keys(sizeColumns).length > 0;
    console.log(`  ${hasSizes ? `Found ${Object.keys(sizeColumns).length} sizes: ${Object.keys(sizeColumns).join(', ')}` : 'No size columns (one-size product)'}`);

    // Extract sales data from rows
    const salesRecords = [];
    for (let i = headerIndex + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 3) continue;

      const excelDate = row[0];
      const city = row[1];
      const salesTotal = row[2] || row[6]; // Try column 2 (Sales) or column 6 (Used)

      // Skip if no date or no sales
      if (!excelDate || typeof excelDate !== 'number') continue;
      if (!salesTotal || salesTotal === 0) continue;

      // Convert Excel date to YYYY-MM-DD
      const date = XLSX.SSF.parse_date_code(excelDate);
      const formattedDate = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;

      // Get show ID
      const showId = await getShowId(formattedDate, city);
      if (!showId) {
        console.log(`  ⚠️  Could not find show for ${formattedDate} ${city}`);
        continue;
      }

      if (hasSizes) {
        // Create sales records per size
        for (const [size, colIdx] of Object.entries(sizeColumns)) {
          const quantity = row[colIdx];
          if (!quantity || quantity === 0) continue;

          const tourProductId = await getTourProductId(sku, size);
          if (!tourProductId) {
            console.log(`  ⚠️  Could not find tour_product for ${sku} size ${size}`);
            continue;
          }

          salesRecords.push({
            id: crypto.randomUUID(),
            tour_id: TOUR_ID,
            show_id: showId,
            tour_product_id: tourProductId,
            quantity_sold: Number(quantity),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      } else {
        // One-size product
        const tourProductId = await getTourProductId(sku, 'OS');
        if (!tourProductId) {
          console.log(`  ⚠️  Could not find tour_product for ${sku} OS`);
          continue;
        }

        salesRecords.push({
          id: crypto.randomUUID(),
          tour_id: TOUR_ID,
          show_id: showId,
          tour_product_id: tourProductId,
          quantity_sold: Number(salesTotal),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }

    if (salesRecords.length > 0) {
      console.log(`  Inserting ${salesRecords.length} sales records...`);

      // Insert in batches of 100
      for (let i = 0; i < salesRecords.length; i += 100) {
        const batch = salesRecords.slice(i, i + 100);
        const { error } = await supabase
          .from('sales')
          .insert(batch);

        if (error) {
          console.error(`  ❌ Error inserting batch: ${error.message}`);
        } else {
          console.log(`  ✅ Inserted batch ${Math.floor(i / 100) + 1} (${batch.length} records)`);
        }
      }

      totalSalesRecords += salesRecords.length;
    } else {
      console.log(`  No sales data found`);
    }
  }

  console.log(`\n✅ Processed ${sheetsProcessed} product sheets`);
  console.log(`   Total sales records to insert: ${totalSalesRecords}`);

  return { sheetsProcessed, totalSalesRecords };
}

async function loadProjections() {
  console.log('\n' + '='.repeat(60));
  console.log('LOADING PROJECTIONS DATA');
  console.log('='.repeat(60));

  const workbook = XLSX.readFile(filePath);
  const projectionSheet = workbook.Sheets['Projection Sheet'];

  if (!projectionSheet) {
    console.log('⚠️  Projection Sheet not found');
    return;
  }

  const data = XLSX.utils.sheet_to_json(projectionSheet, { defval: null });
  console.log(`Found ${data.length} rows in Projection Sheet`);

  // TODO: Parse and insert projection data
  // This typically includes forecasted sales by product/show

  return { projectionsLoaded: 0 };
}

async function main() {
  console.log('GHOST 2025 TOUR - COMPREHENSIVE DATA LOAD');
  console.log('='.repeat(60));

  try {
    // Load sales data from individual product sheets
    const salesResult = await loadSalesData();

    // Load projections
    const projectionsResult = await loadProjections();

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Product sheets processed: ${salesResult.sheetsProcessed}`);
    console.log(`✅ Sales records loaded: ${salesResult.totalSalesRecords}`);
    console.log(`✅ Projections loaded: ${projectionsResult?.projectionsLoaded || 0}`);

    console.log('\n⚠️  NOTE: This is a framework script');
    console.log('   Full data extraction requires understanding each sheet structure');
    console.log('   The Excel file has complex layouts that need manual mapping');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
