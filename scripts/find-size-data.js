#!/usr/bin/env node

const XLSX = require('xlsx');

const filePath = 'ghosttrackers/01 GHOST 2025 TOUR.xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = 'BLK T ADMAT ITIN';

console.log(`Examining size data in: ${sheetName}\n`);

const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Find header row
let headerIndex = -1;
for (let i = 0; i < Math.min(5, data.length); i++) {
  const row = data[i];
  if (row && row.some(cell => cell === 'Date' || cell === 'City')) {
    headerIndex = i;
    break;
  }
}

console.log(`Header at index: ${headerIndex}\n`);

// Show all rows and check which ones have data in the size columns (23-29)
console.log('Checking rows for size data (columns 23-29):\n');

for (let i = headerIndex; i < Math.min(headerIndex + 35, data.length); i++) {
  const row = data[i];
  if (!row) continue;

  const hasSizeData = row.slice(23, 30).some(cell => cell != null && cell !== '' && cell !== 0);
  const sizeValues = row.slice(23, 30);

  if (hasSizeData || i === headerIndex) {
    console.log(`Row ${i}:`, {
      col0: row[0],
      col1: row[1],
      col2: row[2],
      sizes: sizeValues,
      hasSizeData
    });
  }
}
