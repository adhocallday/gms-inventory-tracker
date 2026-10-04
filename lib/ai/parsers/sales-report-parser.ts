import { parseDocument, type JsonSchema } from '../claude-client';

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

// JSON schema for structured output (guarantees schema-valid JSON)
const SALES_REPORT_SCHEMA: JsonSchema = {
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

export async function parseSalesReport(
  pdfBase64: string
): Promise<SalesReportData> {
  const instructions = `
You are parsing an AtVenu sales report PDF. Extract the following and return ONLY valid JSON:

{
  "showDate": "YYYY-MM-DD",
  "venueName": "string",
  "city": "string or null",
  "state": "string or null",
  "attendance": number or null,
  "totalGross": number,
  "lineItems": [
    {
      "sku": "string (base SKU WITHOUT size suffix like _SM, _MD, _LG, etc.)",
      "description": "string",
      "size": "string (S, M, L, XL, 2XL, 3XL, or One-Size)",
      "sold": number (quantity sold),
      "unitPrice": number,
      "gross": number (total revenue for this item)
    }
  ]
}

Important:
- Extract ALL products that were sold
- SKU should be the BASE product code (e.g., "GHOSRX203729BK" not "GHOSRX203729BK_SM")
- If the SKU in the PDF includes a size suffix like _SM, _MD, _LG, _XL, _2XL, _3XL, remove it
- Size should be extracted separately as a standardized value (S, M, L, XL, 2XL, 3XL, One-Size)
- Look for subtotals per product style (e.g., "Subtotal: SKELETOR ITIN TEE")
- totalGross is the overall gross sales for the show
- Return ONLY the JSON object
`;

  return parseDocument(pdfBase64, 'application/pdf', instructions, SALES_REPORT_SCHEMA) as Promise<SalesReportData>;
}
