/**
 * Sales Report Parser
 *
 * Parses AtVenu sales report PDFs and extracts structured data.
 *
 * @agent SalesReportParser
 * @version 1.0.0
 * @model claude-sonnet-4-20250514
 *
 * @input PDF base64 string
 * @output SalesReportData { showDate, venueName, totalGross, lineItems[] }
 *
 * @example
 * import { parseSalesReport } from '@gms/agents/parsers';
 * const data = await parseSalesReport(pdfBase64);
 */

import { getClient } from '../client.js';
import { getModelForTask } from '../models.js';
import type { SalesReportData, ParsedDocument } from './types.js';

const INSTRUCTIONS = `
You are parsing an AtVenu sales report PDF. Extract the following and return ONLY valid JSON:

{
  "showDate": "YYYY-MM-DD",
  "venueName": "string",
  "city": "string or null",
  "state": "string or null",
  "attendance": number or null,
  "totalGross": number,
  "lineItems": [
    {
      "sku": "string (base SKU WITHOUT size suffix like _SM, _MD, _LG, etc.)",
      "description": "string",
      "size": "string (S, M, L, XL, 2XL, 3XL, or One-Size)",
      "sold": number (quantity sold),
      "unitPrice": number,
      "gross": number (total revenue for this item)
    }
  ]
}

Important:
- Extract ALL products that were sold
- SKU should be the BASE product code (e.g., "GHOSRX203729BK" not "GHOSRX203729BK_SM")
- If the SKU in the PDF includes a size suffix like _SM, _MD, _LG, _XL, _2XL, _3XL, remove it
- Size should be extracted separately as a standardized value (S, M, L, XL, 2XL, 3XL, One-Size)
- Look for subtotals per product style (e.g., "Subtotal: SKELETOR ITIN TEE")
- totalGross is the overall gross sales for the show
- Return ONLY the JSON object
`;

/**
 * Parse a sales report PDF and extract structured data
 *
 * @param pdfBase64 - Base64-encoded PDF content
 * @returns Parsed sales report data
 */
export async function parseSalesReport(pdfBase64: string): Promise<SalesReportData> {
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

/**
 * Extract JSON from Claude's response, handling markdown code blocks
 */
function extractJSON(text: string): SalesReportData {
  let responseText = text;

  // Remove markdown code blocks if present
  if (responseText.includes('```')) {
    const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      responseText = codeBlockMatch[1];
    }
  }

  // Extract JSON object
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  return JSON.parse(jsonMatch[0]);
}
