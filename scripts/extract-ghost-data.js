#!/usr/bin/env node

const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'ghosttrackers/01 GHOST 2025 TOUR.xlsx';
const workbook = XLSX.readFile(filePath);

// Extract Tour Dates
console.log('='.repeat(60));
console.log('TOUR DATES');
console.log('='.repeat(60));
const tourDatesSheet = workbook.Sheets['Tour Dates'];
const tourDates = XLSX.utils.sheet_to_json(tourDatesSheet, { defval: null });

// Skip header row
const shows = tourDates.slice(1).filter(row => row['Tour Dates'] && typeof row['Tour Dates'] === 'number').map(row => {
  // Excel date is number of days since 1900-01-01
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

console.log(`Total shows: ${shows.length}`);
console.log('First 5 shows:');
shows.slice(0, 5).forEach(show => {
  console.log(`  ${show.date} - ${show.venue}, ${show.city}, ${show.state}`);
});

// Extract Inventory Summary
console.log('\n' + '='.repeat(60));
console.log('INVENTORY DATA');
console.log('='.repeat(60));
const inventorySheet = workbook.Sheets['Inventory'];
const inventoryData = XLSX.utils.sheet_to_json(inventorySheet, { header: 1 });

// Find the product summary section
let productSummaryStart = -1;
for (let i = 0; i < inventoryData.length; i++) {
  const row = inventoryData[i];
  if (row && row.some(cell => cell && cell.toString().includes('PRODUCT SUMMARY'))) {
    productSummaryStart = i;
    break;
  }
}

if (productSummaryStart > -1) {
  console.log(`Found product summary at row ${productSummaryStart}`);
  // Show a few rows
  console.log('\nSample inventory rows:');
  for (let i = productSummaryStart; i < Math.min(productSummaryStart + 10, inventoryData.length); i++) {
    const row = inventoryData[i];
    if (row && row.length > 0) {
      console.log(`  Row ${i}:`, row.slice(0, 10));
    }
  }
}

// Extract COGS data
console.log('\n' + '='.repeat(60));
console.log('COGS DATA');
console.log('='.repeat(60));
const cogsSheet = workbook.Sheets['COGS NEW TEMPLATE'];
if (cogsSheet) {
  const cogsData = XLSX.utils.sheet_to_json(cogsSheet, { defval: null });
  console.log(`COGS rows: ${cogsData.length}`);
  if (cogsData.length > 0) {
    console.log('COGS columns:', Object.keys(cogsData[0]));
    console.log('\nFirst 3 COGS entries:');
    cogsData.slice(0, 3).forEach((row, idx) => {
      console.log(`  ${idx + 1}:`, JSON.stringify(row, null, 2));
    });
  }
}

// Extract Selling Prices
console.log('\n' + '='.repeat(60));
console.log('SELLING PRICES');
console.log('='.repeat(60));
const pricesSheet = workbook.Sheets['Selling Prices'];
if (pricesSheet) {
  const pricesData = XLSX.utils.sheet_to_json(pricesSheet, { defval: null });
  console.log(`Price rows: ${pricesData.length}`);
  if (pricesData.length > 0) {
    console.log('Price columns:', Object.keys(pricesData[0]));
    console.log('\nFirst 5 price entries:');
    pricesData.slice(0, 5).forEach((row, idx) => {
      console.log(`  ${idx + 1}:`, JSON.stringify(row, null, 2));
    });
  }
}

// Save extracted data
const output = {
  shows,
  meta: {
    totalShows: shows.length,
    firstShow: shows[0]?.date,
    lastShow: shows[shows.length - 1]?.date
  }
};

fs.writeFileSync('ghosttrackers/extracted-data.json', JSON.stringify(output, null, 2));
console.log('\n✅ Data saved to ghosttrackers/extracted-data.json');
