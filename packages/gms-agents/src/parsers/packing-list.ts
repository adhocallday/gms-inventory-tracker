/**
 * Packing List Parser
 *
 * Parses packing list/delivery receipt PDFs and extracts structured data.
 *
 * @agent PackingListParser
 * @version 1.0.0
 * @model claude-sonnet-4-20250514
 *
 * @input PDF base64 string
 * @output PackingListData { poNumber, receivedDate, lineItems[] }
 *
 * @example
 * import { parsePackingList } from '@gms/agents/parsers';
 * const data = await parsePackingList(pdfBase64);
 */

import { getClient } from '../client.js';
import { getModelForTask } from '../models.js';
import type { PackingListData, ParsedDocument } from './types.js';

const INSTRUCTIONS = `
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

/**
 * Parse a packing list PDF and extract structured data
 *
 * @param pdfBase64 - Base64-encoded PDF content
 * @returns Parsed packing list data
 */
export async function parsePackingList(pdfBase64: string): Promise<PackingListData> {
  const client = getClient();
  const model = getModelForTask('document-parsing');

  const response = await client.messages.create({
    model,
    max_tokens: 16384,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          } as unknown as { type: 'text'; text: string },
          {
            type: 'text',
            text: INSTRUCTIONS,
          },
        ],
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  return extractJSON(textContent.text);
}

function extractJSON(text: string): PackingListData {
  let responseText = text;

  if (responseText.includes('```')) {
    const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      responseText = codeBlockMatch[1];
    }
  }

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  return JSON.parse(jsonMatch[0]);
}
