import { parseDocumentInput, type JsonSchema, type ParseOptions } from '../claude-client';
import { asDocumentInput, type DocumentInput } from '../document-input';

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

// JSON schema for structured output (guarantees schema-valid JSON)
const SETTLEMENT_SCHEMA: JsonSchema = {
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

export async function parseSettlementReport(
  input: DocumentInput | string,
  options: ParseOptions = {}
): Promise<SettlementReportData> {
  const instructions = `
You are parsing an AtVenu settlement report PDF. The structure is consistent:
- Header: Show date, venue name
- Financial summary: Gross sales, sales tax, CC fees
- Table with "Comp" column showing complimentary items given away

Return ONLY valid JSON:
{
  "showDate": "YYYY-MM-DD",
  "venueName": "string",
  "grossSales": number,
  "salesTax": number,
  "ccFees": number,
  "comps": [
    {
      "sku": "BASE_SKU",
      "description": "string",
      "size": "S|M|L|XL|2XL|3XL",
      "quantity": number
    }
  ]
}

Rules:
- Strip size suffix from SKU (GHOSRX203729BK_XL → GHOSRX203729BK)
- Comps are items with quantity > 0 in the "Comp" column
- Only include items that were comped (given free), not sold
- Return ONLY the JSON, no explanation or markdown
`;

  return parseDocumentInput(asDocumentInput(input), instructions, SETTLEMENT_SCHEMA, options) as Promise<SettlementReportData>;
}
