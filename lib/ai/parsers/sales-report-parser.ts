import { parseWithAgent, parseDocument, parseText } from '../claude-client';
import { extractTextFromBase64PDF } from '../pdf-utils';
import { SALES_REPORT_AGENT } from '../agents';

export interface SalesLineItem {
  sku: string;
  description: string;
  size: string;
  sold: number;
  unitPrice: number;
  gross: number;
}

export interface SalesReportData {
  showDate: string;
  venueName: string;
  city?: string;
  state?: string;
  attendance?: number;
  totalGross: number;
  lineItems: SalesLineItem[];
}

// JSON Schema for tool-based extraction (guarantees valid JSON with Haiku)
const SALES_REPORT_SCHEMA = {
  type: 'object',
  properties: {
    showDate: { type: 'string', description: 'Show date in YYYY-MM-DD format' },
    venueName: { type: 'string', description: 'Venue name' },
    city: { type: 'string', description: 'City name' },
    state: { type: 'string', description: 'State abbreviation' },
    attendance: { type: 'number', description: 'Attendance count' },
    totalGross: { type: 'number', description: 'Total gross sales amount' },
    lineItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sku: { type: 'string', description: 'Product SKU (strip size suffix)' },
          description: { type: 'string', description: 'Product description' },
          size: { type: 'string', description: 'Size: S, M, L, XL, 2XL, 3XL, or One-Size' },
          sold: { type: 'number', description: 'Quantity sold' },
          unitPrice: { type: 'number', description: 'Unit price' },
          gross: { type: 'number', description: 'Gross sales for this item' }
        },
        required: ['sku', 'description', 'size', 'sold', 'unitPrice', 'gross']
      }
    }
  },
  required: ['showDate', 'venueName', 'totalGross', 'lineItems']
};

// Fallback instructions for document parsing (when text extraction fails)
const FALLBACK_INSTRUCTIONS = `
Parse this AtVenu sales report PDF. Extract:
- showDate (YYYY-MM-DD)
- venueName
- city, state
- totalGross
- lineItems: [{sku (strip size suffix), description, size, sold, unitPrice, gross}]

Return ONLY valid JSON.
`;

export async function parseSalesReport(
  pdfBase64: string
): Promise<SalesReportData> {
  const startTime = Date.now();

  // Try text extraction + fast schema-based parsing (Haiku with tool_choice)
  try {
    const textStartTime = Date.now();
    const extractedText = await extractTextFromBase64PDF(pdfBase64);
    console.log(`[SalesReportParser] Text extraction: ${Date.now() - textStartTime}ms (${extractedText?.length ?? 0} chars)`);

    // Only use schema parsing if we got meaningful content
    if (extractedText && extractedText.trim().length > 100) {
      console.log('[SalesReportParser] Using Haiku with schema (fast mode)');

      const parseStartTime = Date.now();
      const result = await parseText(extractedText, FALLBACK_INSTRUCTIONS, SALES_REPORT_SCHEMA);

      console.log(`[SalesReportParser] Schema parse: ${Date.now() - parseStartTime}ms`);
      console.log(`[SalesReportParser] TOTAL: ${Date.now() - startTime}ms`);

      return result as SalesReportData;
    }
  } catch (textError) {
    console.log('[SalesReportParser] Schema parsing failed, falling back to document parsing:', textError);
  }

  // Fallback to full document parsing with schema (handles scanned PDFs)
  console.log('[SalesReportParser] Using document-based parsing with schema');
  const aiStartTime = Date.now();
  const result = await parseDocument(pdfBase64, 'application/pdf', FALLBACK_INSTRUCTIONS, SALES_REPORT_SCHEMA) as SalesReportData;
  console.log(`[SalesReportParser] Document parsing: ${Date.now() - aiStartTime}ms`);
  console.log(`[SalesReportParser] TOTAL: ${Date.now() - startTime}ms`);
  return result;
}
