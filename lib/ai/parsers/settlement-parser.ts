import { parseText, parseDocument } from '../claude-client';
import { extractTextFromBase64PDF } from '../pdf-utils';

export interface SettlementComp {
  sku: string;
  description: string;
  size: string;
  quantity: number;
}

export interface SettlementReportData {
  showDate: string;
  venueName: string;
  grossSales: number;
  salesTax: number;
  ccFees: number;
  comps: SettlementComp[];
}

// JSON Schema for tool-based extraction (guarantees valid JSON with Haiku)
const SETTLEMENT_SCHEMA = {
  type: 'object',
  properties: {
    showDate: { type: 'string', description: 'Show date in YYYY-MM-DD format' },
    venueName: { type: 'string', description: 'Venue name' },
    grossSales: { type: 'number', description: 'Gross sales amount' },
    salesTax: { type: 'number', description: 'Sales tax amount' },
    ccFees: { type: 'number', description: 'Credit card fees' },
    comps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sku: { type: 'string', description: 'Product SKU (strip size suffix)' },
          description: { type: 'string', description: 'Product description' },
          size: { type: 'string', description: 'Size: S, M, L, XL, 2XL, 3XL, or One-Size' },
          quantity: { type: 'number', description: 'Quantity comped' }
        },
        required: ['sku', 'description', 'size', 'quantity']
      }
    }
  },
  required: ['showDate', 'venueName', 'grossSales', 'salesTax', 'ccFees', 'comps']
};

const EXTRACTION_INSTRUCTIONS = `
Parse this AtVenu settlement report. The structure is consistent:
- Header: Show date, venue name
- Financial summary: Gross sales, sales tax, CC fees
- Table with "Comp" column showing complimentary items given away

Return ONLY this JSON (no explanation):
{
  "showDate": "YYYY-MM-DD",
  "venueName": "string",
  "grossSales": number,
  "salesTax": number,
  "ccFees": number,
  "comps": [{"sku": "BASE_SKU", "description": "string", "size": "S|M|L|XL|2XL|3XL", "quantity": number}]
}

Example output:
{"showDate":"2024-03-15","venueName":"Madison Square Garden","grossSales":45230.00,"salesTax":3618.40,"ccFees":1356.90,"comps":[{"sku":"GHOSRX203729BK","description":"GHOST TOUR TEE","size":"XL","quantity":2}]}

Rules:
- Strip size suffix from SKU (GHOSRX203729BK_XL → GHOSRX203729BK)
- Comps are items with quantity > 0 in the "Comp" column
- Only include items that were comped (given free), not sold
`;

export async function parseSettlementReport(
  pdfBase64: string
): Promise<SettlementReportData> {
  const startTime = Date.now();

  // Try text extraction + fast schema-based parsing (Haiku with tool_choice)
  try {
    const extractedText = await extractTextFromBase64PDF(pdfBase64);

    if (extractedText && extractedText.trim().length > 100) {
      console.log('[SettlementParser] Using Haiku with schema (fast mode)');
      const result = await parseText(extractedText, EXTRACTION_INSTRUCTIONS, SETTLEMENT_SCHEMA);
      console.log(`[SettlementParser] TOTAL: ${Date.now() - startTime}ms`);
      return result as SettlementReportData;
    }
  } catch (textError) {
    console.log('[SettlementParser] Text extraction failed, falling back to document parsing:', textError);
  }

  // Fallback to full document parsing with schema
  console.log('[SettlementParser] Using document-based parsing with schema');
  const result = await parseDocument(pdfBase64, 'application/pdf', EXTRACTION_INSTRUCTIONS, SETTLEMENT_SCHEMA);
  console.log(`[SettlementParser] TOTAL: ${Date.now() - startTime}ms`);
  return result as SettlementReportData;
}
