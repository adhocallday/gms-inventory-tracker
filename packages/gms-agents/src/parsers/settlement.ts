/**
 * Settlement Report Parser
 *
 * Parses AtVenu settlement report PDFs and extracts structured data.
 *
 * @agent SettlementParser
 * @version 1.0.0
 * @model claude-sonnet-4-20250514
 *
 * @input PDF base64 string
 * @output SettlementReportData { showDate, venueName, grossSales, comps[] }
 *
 * @example
 * import { parseSettlement } from '@gms/agents/parsers';
 * const data = await parseSettlement(pdfBase64);
 */

import { getClient } from '../client.js';
import { getModelForTask } from '../models.js';
import type { SettlementReportData, ParsedDocument } from './types.js';

const INSTRUCTIONS = `
You are parsing an AtVenu settlement report PDF. The structure is consistent:
- Header: Show date, venue name
- Financial summary: Gross sales, sales tax, CC fees
- Table with "Comp" column showing complimentary items given away

Return ONLY valid JSON:
{
  "showDate": "YYYY-MM-DD",
  "venueName": "string",
  "grossSales": number,
  "salesTax": number,
  "ccFees": number,
  "comps": [
    {
      "sku": "BASE_SKU",
      "description": "string",
      "size": "S|M|L|XL|2XL|3XL",
      "quantity": number
    }
  ]
}

Rules:
- Strip size suffix from SKU (GHOSRX203729BK_XL → GHOSRX203729BK)
- Comps are items with quantity > 0 in the "Comp" column
- Only include items that were comped (given free), not sold
- Return ONLY the JSON, no explanation or markdown
`;

/**
 * Parse a settlement report PDF and extract structured data
 *
 * @param pdfBase64 - Base64-encoded PDF content
 * @returns Parsed settlement report data
 */
export async function parseSettlement(pdfBase64: string): Promise<SettlementReportData> {
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

function extractJSON(text: string): SettlementReportData {
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
