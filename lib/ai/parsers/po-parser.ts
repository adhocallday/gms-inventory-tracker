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
You are parsing a purchase order PDF. Extract the following information and return ONLY valid JSON (no markdown, no explanation):

{
  "poNumber": "string",
  "vendor": "string",
  "orderDate": "YYYY-MM-DD",
  "expectedDelivery": "YYYY-MM-DD or null",
  "lineItems": [
    {
      "sku": "string",
      "description": "string",
      "size": "string (S, M, L, XL, 2XL, 3XL, or One-Size)",
      "quantity": number,
      "unitCost": number,
      "total": number
    }
  ],
  "totalAmount": number
}

Important:
- Extract ALL line items from the PO
- Sizes should be standardized (S, M, L, XL, 2XL, 3XL, One-Size)
- All numbers should be numeric (not strings)
- Dates in YYYY-MM-DD format
- Return ONLY the JSON object, nothing else
`;

  return parseDocument(pdfBase64, 'application/pdf', instructions) as Promise<PurchaseOrderData>;
}
