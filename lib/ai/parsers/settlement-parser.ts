import { parseDocument } from '../claude-client';

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

export async function parseSettlementReport(
  pdfBase64: string
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

  return parseDocument(pdfBase64, 'application/pdf', instructions) as Promise<SettlementReportData>;
}
