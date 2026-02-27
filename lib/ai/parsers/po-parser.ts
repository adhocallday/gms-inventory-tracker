import { parseText, parseDocument } from '../claude-client';
import { extractTextFromBase64PDF } from '../pdf-utils';

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

// JSON Schema for tool-based extraction (guarantees valid JSON with Haiku)
const PO_SCHEMA = {
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

const EXTRACTION_INSTRUCTIONS = `
Parse this purchase order. Standard structure:
- Header: PO number, vendor name, order date, expected delivery
- Line items table: SKU, description, size, quantity, unit cost, line total
- Footer: Total amount

Return ONLY this JSON (no explanation):
{
  "poNumber": "string",
  "vendor": "string",
  "orderDate": "YYYY-MM-DD",
  "expectedDelivery": "YYYY-MM-DD or null",
  "lineItems": [{"sku": "string", "description": "string", "size": "S|M|L|XL|2XL|3XL|One-Size", "quantity": number, "unitCost": number, "total": number}],
  "totalAmount": number
}

Example output:
{"poNumber":"PO-2024-0315","vendor":"Merch Direct","orderDate":"2024-03-01","expectedDelivery":"2024-03-15","lineItems":[{"sku":"GHOSRX203729BK","description":"GHOST TOUR TEE","size":"L","quantity":100,"unitCost":12.50,"total":1250.00}],"totalAmount":15000.00}

Rules:
- Standardize sizes: S, M, L, XL, 2XL, 3XL, One-Size
- All numbers as numeric values, not strings
- Dates as YYYY-MM-DD
`;

export async function parsePurchaseOrder(
  pdfBase64: string
): Promise<PurchaseOrderData> {
  const startTime = Date.now();

  // Try text extraction + fast schema-based parsing (Haiku with tool_choice)
  try {
    const extractedText = await extractTextFromBase64PDF(pdfBase64);

    if (extractedText && extractedText.trim().length > 100) {
      console.log('[POParser] Using Haiku with schema (fast mode)');
      const result = await parseText(extractedText, EXTRACTION_INSTRUCTIONS, PO_SCHEMA);
      console.log(`[POParser] TOTAL: ${Date.now() - startTime}ms`);
      return result as PurchaseOrderData;
    }
  } catch (textError) {
    console.log('[POParser] Text extraction failed, falling back to document parsing:', textError);
  }

  // Fallback to full document parsing with schema
  console.log('[POParser] Using document-based parsing with schema');
  const result = await parseDocument(pdfBase64, 'application/pdf', EXTRACTION_INSTRUCTIONS, PO_SCHEMA);
  console.log(`[POParser] TOTAL: ${Date.now() - startTime}ms`);
  return result as PurchaseOrderData;
}
