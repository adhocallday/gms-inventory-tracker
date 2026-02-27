import { parseDocument } from '../claude-client';

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

  return parseDocument(pdfBase64, 'application/pdf', instructions) as Promise<PackingListData>;
}
