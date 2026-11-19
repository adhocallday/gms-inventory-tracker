import { parseDocumentInput, type JsonSchema } from '../claude-client';
import { asDocumentInput, type DocumentInput } from '../document-input';

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

// JSON schema for structured output (guarantees schema-valid JSON)
const PO_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    poNumber: { type: 'string', description: 'Purchase order number' },
    vendor: { type: 'string', description: 'Vendor name' },
    orderDate: { type: 'string', description: 'Order date in YYYY-MM-DD format' },
    expectedDelivery: { type: 'string', description: 'Expected delivery date in YYYY-MM-DD format' },
    totalAmount: { type: 'number', description: 'Total order amount' },
    lineItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sku: { type: 'string', description: 'Product SKU' },
          description: { type: 'string', description: 'Product description' },
          size: { type: 'string', description: 'Size: S, M, L, XL, 2XL, 3XL, or One-Size' },
          quantity: { type: 'number', description: 'Quantity ordered' },
          unitCost: { type: 'number', description: 'Unit cost' },
          total: { type: 'number', description: 'Line item total' }
        },
        required: ['sku', 'description', 'size', 'quantity', 'unitCost', 'total']
      }
    }
  },
  required: ['poNumber', 'vendor', 'orderDate', 'lineItems', 'totalAmount']
};

export async function parsePurchaseOrder(
  input: DocumentInput | string
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

  return parseDocumentInput(asDocumentInput(input), instructions, PO_SCHEMA) as Promise<PurchaseOrderData>;
}
