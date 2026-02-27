import { parseText, parseDocument } from '../claude-client';
import { extractTextFromBase64PDF } from '../pdf-utils';

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

// JSON Schema for tool-based extraction (guarantees valid JSON with Haiku)
const PACKING_LIST_SCHEMA = {
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

const EXTRACTION_INSTRUCTIONS = `
Parse this packing list/delivery receipt. Vendor formats vary - be flexible.

Look for:
- Delivery/shipment number (may be called: Delivery #, Shipment #, Invoice #)
- PO reference (may be called: PO #, Purchase Order, Reference, Order #)
- Date received/shipped
- Line items with SKU, description, size, quantity

Return ONLY this JSON (no explanation):
{
  "deliveryNumber": "string or null",
  "poNumber": "string",
  "receivedDate": "YYYY-MM-DD",
  "lineItems": [{"sku": "string", "description": "string", "size": "S|M|L|XL|2XL|3XL|One-Size", "quantityReceived": number}]
}

Example output:
{"deliveryNumber":"DEL-12345","poNumber":"PO-2024-0315","receivedDate":"2024-03-15","lineItems":[{"sku":"GHOSRX203729BK","description":"GHOST TOUR TEE","size":"L","quantityReceived":100}]}

Rules:
- Standardize sizes: S, M, L, XL, 2XL, 3XL, One-Size
- quantityReceived = actual quantity in shipment
`;

export async function parsePackingList(
  pdfBase64: string
): Promise<PackingListData> {
  const startTime = Date.now();

  // Try text extraction + fast schema-based parsing (Haiku with tool_choice)
  try {
    const extractedText = await extractTextFromBase64PDF(pdfBase64);

    if (extractedText && extractedText.trim().length > 100) {
      console.log('[PackingListParser] Using Haiku with schema (fast mode)');
      const result = await parseText(extractedText, EXTRACTION_INSTRUCTIONS, PACKING_LIST_SCHEMA);
      console.log(`[PackingListParser] TOTAL: ${Date.now() - startTime}ms`);
      return result as PackingListData;
    }
  } catch (textError) {
    console.log('[PackingListParser] Text extraction failed, falling back to document parsing:', textError);
  }

  // Fallback to full document parsing with schema
  console.log('[PackingListParser] Using document-based parsing with schema');
  const result = await parseDocument(pdfBase64, 'application/pdf', EXTRACTION_INSTRUCTIONS, PACKING_LIST_SCHEMA);
  console.log(`[PackingListParser] TOTAL: ${Date.now() - startTime}ms`);
  return result as PackingListData;
}
