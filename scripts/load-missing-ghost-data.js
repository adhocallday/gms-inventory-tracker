#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOUR_ID = '123e4567-e89b-12d3-a456-426614174000';
const EXCEL_FILE = 'ghosttrackers/01 GHOST 2025 TOUR.xlsx';

// Excel date to JS Date
function excelDateToJS(excelDate) {
  return new Date((excelDate - 25569) * 86400 * 1000);
}

async function loadShowAttendanceAndRevenue() {
  console.log('\n1. LOADING SHOW ATTENDANCE & REVENUE');
  console.log('='.repeat(70));

  const workbook = XLSX.readFile(EXCEL_FILE);

  // Get gross sales data
  const grossSheet = workbook.Sheets['Tour Gross Sales'];
  const grossData = XLSX.utils.sheet_to_json(grossSheet, { header: 1, defval: null });

  // Find header row (should be row with "Date", "City", "Gross Sales")
  let headerIdx = -1;
  for (let i = 0; i < grossData.length; i++) {
    if (grossData[i][0] === 'Date') {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    console.error('❌ Could not find header row in Tour Gross Sales');
    return;
  }

  // Get per-head data
  const pheadsSheet = workbook.Sheets['Tour P-Heads'];
  const pheadsData = XLSX.utils.sheet_to_json(pheadsSheet, { header: 1, defval: null });

  // Find header row for p-heads
  let pheadHeaderIdx = -1;
  for (let i = 0; i < pheadsData.length; i++) {
    if (pheadsData[i][0] === 'Date') {
      pheadHeaderIdx = i;
      break;
    }
  }

  // Get existing shows from database
  const { data: existingShows, error: showsError } = await supabase
    .from('shows')
    .select('id, show_date, city, venue_name')
    .eq('tour_id', TOUR_ID)
    .order('show_date');

  if (showsError) {
    console.error('❌ Error fetching shows:', showsError.message);
    return;
  }

  console.log(`Found ${existingShows.length} shows in database`);

  // Process gross sales data
  const updates = [];
  for (let i = headerIdx + 1; i < grossData.length; i++) {
    const row = grossData[i];
    if (!row[0] || !row[1]) continue; // Skip empty rows

    const excelDate = row[0];
    const city = row[1];
    const grossSales = row[2] || 0;

    // Find corresponding per-head row
    let perHead = 0;
    if (pheadHeaderIdx >= 0) {
      for (let j = pheadHeaderIdx + 1; j < pheadsData.length; j++) {
        if (pheadsData[j][0] === excelDate && pheadsData[j][1] === city) {
          perHead = pheadsData[j][2] || 0;
          break;
        }
      }
    }

    // Calculate attendance from gross sales / per head
    const attendance = perHead > 0 ? Math.round(grossSales / perHead) : 0;

    // Find matching show in database
    const jsDate = excelDateToJS(excelDate);
    if (isNaN(jsDate.getTime())) {
      console.log(`  ⚠️  ${city}: Invalid date (${excelDate})`);
      continue;
    }
    const dateStr = jsDate.toISOString().split('T')[0];

    const matchingShow = existingShows.find(s => {
      const showDate = new Date(s.show_date).toISOString().split('T')[0];
      return showDate === dateStr && s.city.toLowerCase().includes(city.toLowerCase());
    });

    if (matchingShow) {
      updates.push({
        id: matchingShow.id,
        attendance: attendance,
        // We'll update gross_sales in sales records separately
      });
      console.log(`  ✅ ${city}: Attendance ${attendance}, Per Head $${perHead.toFixed(2)}, Gross $${grossSales.toFixed(2)}`);
    } else {
      console.log(`  ⚠️  ${city}: No matching show found (date: ${dateStr})`);
    }
  }

  // Update shows with attendance
  console.log(`\nUpdating ${updates.length} shows with attendance data...`);
  for (const update of updates) {
    const { error } = await supabase
      .from('shows')
      .update({ attendance: update.attendance })
      .eq('id', update.id);

    if (error) {
      console.error(`❌ Error updating show ${update.id}:`, error.message);
    }
  }

  console.log(`✅ Updated attendance for ${updates.length} shows`);
  return updates;
}

async function loadInventoryPOData() {
  console.log('\n2. LOADING INVENTORY & PO DATA FROM INVENTORY SHEET');
  console.log('='.repeat(70));

  const workbook = XLSX.readFile(EXCEL_FILE);
  const invSheet = workbook.Sheets['Inventory'];

  if (!invSheet) {
    console.error('❌ Inventory sheet not found');
    return;
  }

  const invData = XLSX.utils.sheet_to_json(invSheet, { header: 1, defval: null });

  console.log(`Total rows in Inventory sheet: ${invData.length}`);
  console.log('\nAnalyzing sheet structure...');

  // Look for PO/SKU data
  let foundPOs = 0;
  let foundSKUs = 0;

  for (let i = 0; i < Math.min(50, invData.length); i++) {
    const row = invData[i];
    if (!row) continue;

    // Look for rows that might contain SKUs
    const rowStr = row.join(' ').toLowerCase();
    if (rowStr.includes('ghos') || rowStr.includes('sku')) {
      console.log(`  Row ${i + 1}:`, row.filter(c => c !== null).slice(0, 10));
      foundSKUs++;
    }

    // Look for PO numbers or delivery info
    if (rowStr.includes('po') || rowStr.includes('delivery') || rowStr.includes('order')) {
      foundPOs++;
    }
  }

  console.log(`\n  Found ${foundSKUs} rows with potential SKU data`);
  console.log(`  Found ${foundPOs} rows with potential PO data`);

  if (foundSKUs === 0 && foundPOs === 0) {
    console.log('\n⚠️  Inventory sheet appears to be formatted differently than expected.');
    console.log('   May need manual review to extract PO data.');
  }
}

async function loadSalesRevenue(showUpdates) {
  console.log('\n3. LOADING SALES REVENUE DATA');
  console.log('='.repeat(70));

  const workbook = XLSX.readFile(EXCEL_FILE);

  // Get gross sales by show
  const grossSheet = workbook.Sheets['Tour Gross Sales'];
  const grossData = XLSX.utils.sheet_to_json(grossSheet, { header: 1, defval: null });

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < grossData.length; i++) {
    if (grossData[i][0] === 'Date') {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    console.error('❌ Could not find header row');
    return;
  }

  // Get existing shows
  const { data: existingShows } = await supabase
    .from('shows')
    .select('id, show_date, city')
    .eq('tour_id', TOUR_ID)
    .order('show_date');

  console.log(`Processing ${existingShows.length} shows for revenue data...`);

  let updatedSales = 0;

  for (const show of existingShows) {
    // Find gross sales for this show
    const showDateStr = new Date(show.show_date).toISOString().split('T')[0];

    let grossSales = 0;
    for (let i = headerIdx + 1; i < grossData.length; i++) {
      const row = grossData[i];
      if (!row[0] || !row[1]) continue;

      const excelDate = row[0];
      const city = row[1];
      const jsDate = excelDateToJS(excelDate);
      if (isNaN(jsDate.getTime())) continue;
      const dateStr = jsDate.toISOString().split('T')[0];

      if (dateStr === showDateStr && city.toLowerCase().includes(show.city.toLowerCase())) {
        grossSales = row[2] || 0;
        break;
      }
    }

    if (grossSales > 0) {
      // Get sales records for this show
      const { data: salesRecords } = await supabase
        .from('sales')
        .select('id, qty_sold')
        .eq('show_id', show.id);

      if (salesRecords && salesRecords.length > 0) {
        // Calculate total units sold for this show
        const totalUnits = salesRecords.reduce((sum, s) => sum + (s.qty_sold || 0), 0);

        if (totalUnits > 0) {
          // Distribute gross sales proportionally across sales records
          for (const sale of salesRecords) {
            const proportion = (sale.qty_sold || 0) / totalUnits;
            const saleGross = grossSales * proportion;
            const unitPrice = sale.qty_sold > 0 ? saleGross / sale.qty_sold : 0;

            const { error } = await supabase
              .from('sales')
              .update({
                unit_price: unitPrice,
                gross_sales: saleGross
              })
              .eq('id', sale.id);

            if (!error) {
              updatedSales++;
            }
          }

          console.log(`  ✅ ${show.city}: $${grossSales.toFixed(2)} distributed across ${salesRecords.length} sales records`);
        }
      }
    }
  }

  console.log(`\n✅ Updated ${updatedSales} sales records with revenue data`);
}

async function main() {
  console.log('LOADING MISSING GHOST 2025 DATA');
  console.log('='.repeat(70));
  console.log('Tour ID:', TOUR_ID);
  console.log('Excel File:', EXCEL_FILE);

  try {
    // Load show attendance and revenue
    const showUpdates = await loadShowAttendanceAndRevenue();

    // Load sales revenue
    if (showUpdates && showUpdates.length > 0) {
      await loadSalesRevenue(showUpdates);
    }

    // Try to load inventory/PO data
    await loadInventoryPOData();

    console.log('\n' + '='.repeat(70));
    console.log('✅ DATA LOADING COMPLETE');
    console.log('='.repeat(70));
    console.log('\nRun verification:');
    console.log('  npm run db:check-all');
    console.log('\nView dashboards:');
    console.log('  npm run dev');
    console.log('  http://localhost:3000/tours/' + TOUR_ID + '/cogs');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
