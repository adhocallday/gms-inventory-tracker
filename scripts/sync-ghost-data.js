#!/usr/bin/env node

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

// Env vars should be passed from shell
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials. Run with: export $(cat .env.local | grep -v "^#" | xargs) && node script.js');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const filePath = 'ghosttrackers/01 GHOST 2025 TOUR.xlsx';
const TOUR_ID = '123e4567-e89b-12d3-a456-426614174000';

async function main() {
  console.log('Reading Excel file...\n');
  const workbook = XLSX.readFile(filePath);

  // 1. Extract and compare products/costs
  console.log('=' .repeat(60));
  console.log('ANALYZING PRODUCTS & COSTS');
  console.log('='.repeat(60));

  const inventorySheet = workbook.Sheets['Inventory'];
  const inventoryRaw = XLSX.utils.sheet_to_json(inventorySheet, { header: 1 });

  // Find product data (starts around row 6)
  const products = [];
  for (let i = 6; i < inventoryRaw.length; i++) {
    const row = inventoryRaw[i];
    if (!row || !row[1]) break; // Stop at empty SKU

    const sku = row[1];
    const description = row[2];
    const supplier = row[3];
    const blankCost = row[4] || 0;
    const printCost = row[5] || 0;
    const fullPackage = row[6] || 0;
    const sales = row[9] || 0;

    if (sku && typeof sku === 'string' && sku.startsWith('GHOS')) {
      products.push({
        sku,
        description,
        supplier,
        blankCost: Number(blankCost),
        printCost: Number(printCost),
        fullPackage: Number(fullPackage),
        sales: Number(sales)
      });
    }
  }

  console.log(`Found ${products.length} products in Excel`);
  console.log('\nFirst 5 products:');
  products.slice(0, 5).forEach(p => {
    console.log(`  ${p.sku} - ${p.description} (Cost: $${p.fullPackage})`);
  });

  // Check what's in database
  const { data: dbProducts } = await supabase
    .from('products')
    .select('id, sku, description, product_type');

  console.log(`\n${dbProducts?.length || 0} products in database`);

  // Find products in Excel but not in DB
  const dbSkus = new Set(dbProducts?.map(p => p.sku) || []);
  const missingProducts = products.filter(p => !dbSkus.has(p.sku));

  if (missingProducts.length > 0) {
    console.log(`\n⚠️  ${missingProducts.length} products in Excel NOT in database:`);
    missingProducts.forEach(p => {
      console.log(`  - ${p.sku}: ${p.description}`);
    });
  } else {
    console.log('\n✅ All Excel products are in database');
  }

  // 2. Check Tour Dates
  console.log('\n' + '='.repeat(60));
  console.log('ANALYZING TOUR DATES');
  console.log('='.repeat(60));

  const tourDatesSheet = workbook.Sheets['Tour Dates'];
  const tourDatesRaw = XLSX.utils.sheet_to_json(tourDatesSheet, { defval: null });

  const shows = tourDatesRaw.slice(1).filter(row => row['Tour Dates'] && typeof row['Tour Dates'] === 'number').map(row => {
    const excelDate = row['Tour Dates'];
    const date = XLSX.SSF.parse_date_code(excelDate);
    const formattedDate = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;

    return {
      date: formattedDate,
      city: row['__EMPTY'],
      state: row['__EMPTY_1'],
      venue: row['__EMPTY_2'],
      country: row['__EMPTY_3']
    };
  });

  console.log(`Found ${shows.length} shows in Excel`);

  const { data: dbShows } = await supabase
    .from('shows')
    .select('show_date, venue_name, city, state')
    .eq('tour_id', TOUR_ID)
    .order('show_date');

  console.log(`${dbShows?.length || 0} shows in database`);

  // 3. Check Selling Prices
  console.log('\n' + '='.repeat(60));
  console.log('ANALYZING SELLING PRICES');
  console.log('='.repeat(60));

  const pricesSheet = workbook.Sheets['Selling Prices'];
  if (pricesSheet) {
    const pricesData = XLSX.utils.sheet_to_json(pricesSheet, { defval: null });
    console.log(`Found ${pricesData.length} price entries in Excel`);

    if (pricesData.length > 0) {
      console.log('\nSample prices:');
      pricesData.slice(0, 5).forEach(row => {
        const keys = Object.keys(row);
        console.log(`  ${row[keys[0]]} - $${row[keys[1]] || 'N/A'}`);
      });
    }

    // Check if we have suggested_retail in database
    const { data: tourProductPrices } = await supabase
      .from('tour_products')
      .select('product_id, size, suggested_retail')
      .eq('tour_id', TOUR_ID)
      .not('suggested_retail', 'is', null)
      .limit(5);

    console.log(`\n${tourProductPrices?.length || 0} tour products with prices in database (sample)`);
  }

  // 4. Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Excel: ${products.length} products, ${shows.length} shows`);
  console.log(`Database: ${dbProducts?.length || 0} products, ${dbShows?.length || 0} shows`);

  if (missingProducts.length > 0) {
    console.log(`\n⚠️  Action needed: ${missingProducts.length} products to add`);
  } else {
    console.log('\n✅ Database is in sync with Excel data');
  }
}

main().catch(console.error);
