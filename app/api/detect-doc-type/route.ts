import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type DocType = 'po' | 'packing-list' | 'sales-report' | 'settlement';

interface ClassificationResult {
  detectedType: DocType;
  typeName: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  indicators: string[];
}

const DOC_TYPE_DESCRIPTIONS = {
  'po': 'Purchase Order',
  'packing-list': 'Packing List',
  'sales-report': 'Sales Report',
  'settlement': 'Settlement'
};

/**
 * POST /api/detect-doc-type
 * Detect document type using AI classification with native PDF support
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to base64 for Claude API
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Pdf = buffer.toString('base64');

    console.log(`[Detect Doc Type] Analyzing ${file.name} (${(file.size / 1024).toFixed(1)} KB) with Claude`);

    // Use Claude's native PDF reading to classify directly
    const prompt = `You are analyzing a PDF document to determine its type.

Possible document types:
1. Purchase Order (PO) - Contains vendor information, order details, SKUs, quantities, pricing
2. Packing List - Contains shipment details, received quantities, tracking information
3. Sales Report - Contains sales data, quantities sold, revenue by product
4. Settlement - Contains financial settlement information, fees, net amounts

Analyze this PDF and return ONLY a JSON object (no markdown formatting) with:
{
  "detectedType": "po" | "packing-list" | "sales-report" | "settlement",
  "confidence": "high" | "medium" | "low",
  "reasoning": "brief explanation of why this type was chosen",
  "indicators": ["indicator 1", "indicator 2", "indicator 3"]
}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Pdf,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse Claude's response
    let parsedResponse;
    try {
      // Remove markdown code blocks if present
      const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[Detect Doc Type] Failed to parse Claude response:', responseText);
      throw new Error('Failed to parse AI response');
    }

    const classification: ClassificationResult = {
      detectedType: parsedResponse.detectedType,
      typeName: DOC_TYPE_DESCRIPTIONS[parsedResponse.detectedType as DocType] || 'Unknown',
      confidence: parsedResponse.confidence || 'low',
      reasoning: parsedResponse.reasoning || 'No reasoning provided',
      indicators: parsedResponse.indicators || [],
    };

    console.log(`[Detect Doc Type] Result: ${classification.typeName} (${classification.confidence} confidence)`);

    return NextResponse.json({
      classification,
      preview: {
        pageCount: null, // We don't extract page count without parsing
      },
    });
  } catch (error: any) {
    console.error('[Detect doc type] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to detect document type' },
      { status: 500 }
    );
  }
}
