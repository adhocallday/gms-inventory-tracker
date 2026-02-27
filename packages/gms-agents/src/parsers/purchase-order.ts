/**
 * Purchase Order Parser
 *
 * Parses purchase order PDFs and extracts structured data.
 *
 * @agent PurchaseOrderParser
 * @version 1.0.0
 * @model claude-sonnet-4-20250514
 *
 * @input PDF base64 string
 * @output PurchaseOrderData { poNumber, vendor, lineItems[], totalAmount }
 *
 * @example
 * import { parsePurchaseOrder } from '@gms/agents/parsers';
 * const data = await parsePurchaseOrder(pdfBase64);
 */

import { getClient } from '../client.js';
import { getModelForTask } from '../models.js';
import type { PurchaseOrderData, ParsedDocument } from './types.js';

const INSTRUCTIONS = `
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

/**
 * Parse a purchase order PDF and extract structured data
 *
 * @param pdfBase64 - Base64-encoded PDF content
 * @returns Parsed purchase order data
 */
export async function parsePurchaseOrder(pdfBase64: string): Promise<PurchaseOrderData> {
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

function extractJSON(text: string): PurchaseOrderData {
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
