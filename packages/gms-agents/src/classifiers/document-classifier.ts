/**
 * Document Classifier
 *
 * AI-powered document type detection for PDF uploads.
 * Detects: Purchase Order, Packing List, Sales Report, Settlement
 *
 * @agent DocumentClassifier
 * @version 1.0.0
 * @model claude-sonnet-4-20250514
 *
 * @input PDF text content or first page image
 * @output ClassificationResult { detectedType, confidence, reasoning }
 *
 * @example
 * import { classifyDocument } from '@gms/agents/classifiers';
 * const result = await classifyDocument(pdfText);
 */

import { getClient } from '../client.js';
import { getModelForTask } from '../models.js';

export type DocType = 'po' | 'packing-list' | 'sales-report' | 'settlement';

export interface ClassificationResult {
  detectedType: DocType;
  typeName: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  indicators: string[];
}

const DOC_TYPE_NAMES: Record<DocType, string> = {
  'po': 'Purchase Order',
  'packing-list': 'Packing List',
  'sales-report': 'Sales Report',
  'settlement': 'Settlement',
};

/**
 * Classify a PDF document using Claude AI
 *
 * @param pdfText - Text extracted from the PDF
 * @param firstPageImage - Optional base64-encoded image of the first page
 * @returns Classification result with detected type and confidence
 */
export async function classifyDocument(
  pdfText: string,
  firstPageImage?: string
): Promise<ClassificationResult> {
  const client = getClient();
  const model = getModelForTask('document-classification');

  const prompt = `You are analyzing a document to determine its type. The document is one of the following:

1. **Purchase Order (PO)** - Order form from a vendor for merchandise
2. **Packing List** - List of items shipped or received
3. **Sales Report** - Report of merchandise sales at shows/events
4. **Settlement** - Financial settlement report from a venue or promoter

Here is the text extracted from the first page of the document:

${pdfText.substring(0, 3000)}

Analyze this document and determine its type. Respond in JSON format:

{
  "detectedType": "po" | "packing-list" | "sales-report" | "settlement",
  "confidence": "high" | "medium" | "low",
  "reasoning": "Brief explanation of why you classified it this way",
  "indicators": ["List", "of", "key", "indicators", "found"]
}

Be specific about which indicators you found (e.g., "PO Number: 12345", "Venue: Madison Square Garden").`;

  const content = firstPageImage
    ? [
        {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: 'image/png' as const,
            data: firstPageImage,
          },
        },
        {
          type: 'text' as const,
          text: prompt,
        },
      ]
    : prompt;

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content }],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse JSON from response');
  }

  const result = JSON.parse(jsonMatch[0]);

  return {
    detectedType: result.detectedType,
    typeName: DOC_TYPE_NAMES[result.detectedType as DocType],
    confidence: result.confidence,
    reasoning: result.reasoning,
    indicators: result.indicators,
  };
}
