#!/usr/bin/env node

const XLSX = require('xlsx');

const filePath = 'ghosttrackers/01 GHOST 2025 TOUR.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('='.repeat(60));
console.log('EXAMINING: Projection Sheet');
console.log('='.repeat(60));

const sheet = workbook.Sheets['Projection Sheet'];
if (!sheet) {
  console.log('⚠️  Projection Sheet not found');
  process.exit(1);
}

const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

console.log(`Total rows: ${data.length}\n`);

// Show first 30 rows to understand structure
console.log('First 30 rows:');
for (let i = 0; i < Math.min(30, data.length); i++) {
  console.log(`Row ${i}:`, data[i]);
}
