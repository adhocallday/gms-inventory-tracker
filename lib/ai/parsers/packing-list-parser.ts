import { parseDocument, type JsonSchema } from '../claude-client';

export interface PackingListLineItem {
  sku: string;
  description: string;
  size: string;
  quantityReceived: number;
}

export interface PackingListData {
  deliveryNumber?: string;
  poNumber: string;
  receivedDate: string;
  lineItems: PackingListLineItem[];
}

// JSON schema for structured output (guarantees schema-valid JSON)
const PACKING_LIST_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    deliveryNumber: { type: 'string', description: 'Delivery/shipment number' },
    poNumber: { type: 'string', description: 'Purchase order number' },
    receivedDate: { type: 'string', description: 'Received date in YYYY-MM-DD format' },
    lineItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sku: { type: 'string', description: 'Product SKU' },
          description: { type: 'string', description: 'Product description' },
          size: { type: 'string', description: 'Size: S, M, L, XL, 2XL, 3XL, or One-Size' },
          quantityReceived: { type: 'number', description: 'Quantity received' }
        },
        required: ['sku', 'description', 'size', 'quantityReceived']
      }
    }
  },
  required: ['poNumber', 'receivedDate', 'lineItems']
};

export async function parsePackingList(
  pdfBase64: string
): Promise<PackingListData> {
  const instructions = `
You are parsing a packing list/delivery receipt PDF. Vendor formats vary - be flexible.

Look for:
- Delivery/shipment number (may be called: Delivery #, Shipment #, Invoice #)
- PO reference (may be called: PO #, Purchase Order, Reference, Order #)
- Date received/shipped
- Line items with SKU, description, size, quantity

Return ONLY valid JSON:
{
  "deliveryNumber": "string or null",
  "poNumber": "string",
  "receivedDate": "YYYY-MM-DD",
  "lineItems": [
    {
      "sku": "string",
      "description": "string",
      "size": "S|M|L|XL|2XL|3XL|One-Size",
      "quantityReceived": number
    }
  ]
}

Rules:
- Standardize sizes: S, M, L, XL, 2XL, 3XL, One-Size
- quantityReceived = actual quantity in shipment
- Return ONLY the JSON, no explanation or markdown
`;

  return parseDocument(pdfBase64, 'application/pdf', instructions, PACKING_LIST_SCHEMA) as Promise<PackingListData>;
}
