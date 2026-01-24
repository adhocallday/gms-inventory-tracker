import { parseDocument } from '../claude-client';

export interface SettlementComp {
  sku: string;
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
You are parsing an AtVenu settlement report PDF. Extract the following and return ONLY valid JSON:

{
  "showDate": "YYYY-MM-DD",
  "venueName": "string",
  "grossSales": number,
  "salesTax": number,
  "ccFees": number,
  "comps": [
    {
      "sku": "string",
      "size": "string (S, M, L, XL, 2XL, 3XL, or One-Size)",
      "quantity": number
    }
  ]
}

Important:
- Look for the "Comp" column in the sales breakdown
- Comps are items given away for free (not sold)
- AtVenu does NOT indicate comp type (band/global/show/trailer) - just extract quantities
- Extract ALL items that have comp quantities > 0
- Return ONLY the JSON object
`;

  return parseDocument(pdfBase64, 'application/pdf', instructions) as Promise<SettlementReportData>;
}
