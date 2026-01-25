#!/usr/bin/env node

const XLSX = require('xlsx');

const filePath = 'ghosttrackers/01 GHOST 2025 TOUR.xlsx';
const workbook = XLSX.readFile(filePath);

// Examine a sample product sheet to understand structure
const sheetName = 'BLK T ADMAT ITIN'; // One of the T-shirt sheets
console.log(`\n${'='.repeat(60)}`);
console.log(`Examining: ${sheetName}`);
console.log('='.repeat(60));

const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

console.log(`Total rows: ${data.length}\n`);

// Show first 20 rows to understand structure
console.log('First 20 rows:');
for (let i = 0; i < Math.min(20, data.length); i++) {
  console.log(`Row ${i}:`, data[i]);
}

// Try another sheet format
console.log('\n' + '='.repeat(60));
const sheetName2 = 'TOUR PROGRAM';
console.log(`Examining: ${sheetName2}`);
console.log('='.repeat(60));

const sheet2 = workbook.Sheets[sheetName2];
const data2 = XLSX.utils.sheet_to_json(sheet2, { header: 1, defval: null });

console.log(`Total rows: ${data2.length}\n`);
console.log('First 20 rows:');
for (let i = 0; i < Math.min(20, data2.length); i++) {
  console.log(`Row ${i}:`, data2[i]);
}
