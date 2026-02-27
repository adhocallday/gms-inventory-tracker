/**
 * AI-powered document classification for PDF uploads
 * Detects document type (PO, Packing List, Sales Report, Settlement)
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type DocType = 'po' | 'packing-list' | 'sales-report' | 'settlement';

export interface ClassificationResult {
  detectedType: DocType;
  typeName: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  indicators: string[];
}

const DOC_TYPE_DESCRIPTIONS = {
  'po': {
    name: 'Purchase Order',
    indicators: [
      'PO Number or Order Number',
      'Vendor information',
      'Line items with quantities and prices',
      'Total amount',
      'Delivery date or ship date'
    ]
  },
  'packing-list': {
    name: 'Packing List',
    indicators: [
      'Packing list or packing slip heading',
      'Shipment or delivery number',
      'List of items with quantities',
      'SKUs or product codes',
      'May have "shipped" or "received" quantities'
    ]
  },
  'sales-report': {
    name: 'Sales Report',
    indicators: [
      'Sales data by show/date',
      'Venue or city names',
      'Revenue or gross sales figures',
      'Units sold or quantities',
      'May have per-head calculations'
    ]
  },
  'settlement': {
    name: 'Settlement',
    indicators: [
      'Settlement or final accounting heading',
      'Show revenue breakdown',
      'Deductions or fees',
      'Net amount or payout',
      'Promoter or venue details'
    ]
  }
};

/**
 * Classify a PDF document using Claude AI
 */
export async function classifyDocument(
  pdfText: string,
  firstPageImage?: string
): Promise<ClassificationResult> {
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

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: firstPageImage
            ? [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/png',
                    data: firstPageImage,
                  },
                },
                {
                  type: 'text',
                  text: prompt,
                },
              ]
            : prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from response');
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      detectedType: result.detectedType,
      typeName: DOC_TYPE_DESCRIPTIONS[result.detectedType as DocType].name,
      confidence: result.confidence,
      reasoning: result.reasoning,
      indicators: result.indicators,
    };
  } catch (error) {
    console.error('Document classification error:', error);
    throw new Error('Failed to classify document');
  }
}
