import { parseDocument } from '../claude-client';

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
      "sku": "string",
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
- Look for subtotals per product style (e.g., "Subtotal: SKELETOR ITIN TEE")
- Sizes should be standardized (S, M, L, XL, 2XL, 3XL, One-Size)
- totalGross is the overall gross sales for the show
- Return ONLY the JSON object
`;

  return parseDocument(pdfBase64, 'application/pdf', instructions) as Promise<SalesReportData>;
}
