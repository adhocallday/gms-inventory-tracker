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
You are parsing a packing list/delivery receipt PDF from a vendor. Different vendors format these differently, so be flexible in finding the information.

Extract and return ONLY valid JSON (no markdown, no explanation):

{
  "deliveryNumber": "string or null",
  "poNumber": "string (look for PO #, Purchase Order, Reference, etc.)",
  "receivedDate": "YYYY-MM-DD",
  "lineItems": [
    {
      "sku": "string",
      "description": "string",
      "size": "string (S, M, L, XL, 2XL, 3XL, or One-Size)",
      "quantityReceived": number
    }
  ]
}

Important:
- Look for PO number references like "PO #", "Purchase Order", "PO Number", "Reference"
- Extract ALL items that were delivered
- Sizes should be standardized (S, M, L, XL, 2XL, 3XL, One-Size)
- quantityReceived is the actual quantity delivered
- Return ONLY the JSON object
`;

  return parseDocument(pdfBase64, 'application/pdf', instructions) as Promise<PackingListData>;
}
