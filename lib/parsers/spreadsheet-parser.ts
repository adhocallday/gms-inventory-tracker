import * as XLSX from 'xlsx';

export interface SpreadsheetRow {
  [key: string]: string | number | boolean | null;
}

/**
 * Parse a spreadsheet file (CSV, XLS, XLSX) into structured data.
 * Returns the data as an array of objects where keys are column headers.
 *
 * @param buffer - The file buffer
 * @param filename - Original filename (used to detect format)
 * @returns Array of row objects
 */
export function parseSpreadsheet(buffer: Buffer, filename: string): SpreadsheetRow[] {
  try {
    // Read the workbook
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true, // Parse dates as Date objects
      cellNF: false,   // Don't format numbers as strings
      cellText: false  // Don't include text representation
    });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      console.warn('[SpreadsheetParser] No sheets found in workbook');
      return [];
    }

    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON (array of objects)
    const data = XLSX.utils.sheet_to_json<SpreadsheetRow>(sheet, {
      raw: false,        // Use formatted strings for display
      defval: null,      // Default value for empty cells
      blankrows: false   // Skip blank rows
    });

    console.log(`[SpreadsheetParser] Parsed ${data.length} rows from "${sheetName}"`);

    return data;
  } catch (error) {
    console.error('[SpreadsheetParser] Error parsing spreadsheet:', error);
    throw new Error(`Failed to parse spreadsheet: ${(error as Error).message}`);
  }
}

/**
 * Convert spreadsheet data to a text format suitable for Claude parsing.
 * Creates a structured text representation that Claude can easily understand.
 *
 * @param rows - Array of row objects from parseSpreadsheet
 * @returns Formatted text representation
 */
export function spreadsheetToText(rows: SpreadsheetRow[]): string {
  if (rows.length === 0) {
    return 'No data found in spreadsheet.';
  }

  // Get all unique column headers
  const headers = Array.from(
    new Set(rows.flatMap(row => Object.keys(row)))
  );

  // Build text representation
  const lines: string[] = [];

  // Header row
  lines.push(`COLUMNS: ${headers.join(' | ')}`);
  lines.push('---');

  // Data rows
  for (const row of rows) {
    const values = headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      return String(val);
    });
    lines.push(values.join(' | '));
  }

  return lines.join('\n');
}

/**
 * Detect if a file is a spreadsheet based on MIME type or extension.
 *
 * @param mimeType - File MIME type
 * @param filename - Original filename
 * @returns True if file is a spreadsheet
 */
export function isSpreadsheetFile(mimeType: string, filename: string): boolean {
  // Check MIME types
  const spreadsheetMimeTypes = [
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet'
  ];

  if (spreadsheetMimeTypes.includes(mimeType.toLowerCase())) {
    return true;
  }

  // Check file extensions
  const ext = filename.toLowerCase().split('.').pop();
  const spreadsheetExtensions = ['csv', 'xls', 'xlsx', 'ods', 'tsv'];

  return spreadsheetExtensions.includes(ext || '');
}
