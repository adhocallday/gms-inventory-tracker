#!/usr/bin/env node

const XLSX = require('xlsx');
const fs = require('fs');

const filePath = process.argv[2] || 'ghosttrackers/01 GHOST 2025 TOUR.xlsx';

console.log(`Reading: ${filePath}\n`);

const workbook = XLSX.readFile(filePath);

console.log('Sheet Names:', workbook.SheetNames);
console.log('');

workbook.SheetNames.forEach((sheetName, idx) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Sheet ${idx + 1}: ${sheetName}`);
  console.log('='.repeat(60));

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });

  console.log(`Rows: ${data.length}`);

  if (data.length > 0) {
    console.log('\nColumns:', Object.keys(data[0]).join(', '));
    console.log('\nFirst 3 rows:');
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
  }
});
