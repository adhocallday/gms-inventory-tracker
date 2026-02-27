import { parseDocument } from '../claude-client';

export interface POLineItem {
  sku: string;
  description: string;
  size: string;
  quantity: number;
  unitCost: number;
  total: number;
}

export interface PurchaseOrderData {
  poNumber: string;
  vendor: string;
  orderDate: string;
  expectedDelivery?: string;
  lineItems: POLineItem[];
  totalAmount: number;
}

export async function parsePurchaseOrder(
  pdfBase64: string
): Promise<PurchaseOrderData> {
  const instructions = `
You are parsing a purchase order PDF. Extract the following and return ONLY valid JSON:

{
  "poNumber": "string",
  "vendor": "string",
  "orderDate": "YYYY-MM-DD",
  "expectedDelivery": "YYYY-MM-DD or null",
  "lineItems": [
    {
      "sku": "string",
      "description": "string",
      "size": "S|M|L|XL|2XL|3XL|One-Size",
      "quantity": number,
      "unitCost": number,
      "total": number
    }
  ],
  "totalAmount": number
}

Rules:
- Standardize sizes: S, M, L, XL, 2XL, 3XL, One-Size
- All numbers as numeric values, not strings
- Dates as YYYY-MM-DD format
- Return ONLY the JSON, no explanation or markdown
`;

  return parseDocument(pdfBase64, 'application/pdf', instructions) as Promise<PurchaseOrderData>;
}
