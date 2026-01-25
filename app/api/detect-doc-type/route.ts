import { NextRequest, NextResponse } from 'next/server';
import { parseDocument } from '@/lib/ai/claude-client';

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
 * Detect document type using Claude's PDF reading capability
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

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Pdf = buffer.toString('base64');

    console.log(`[Detect Doc Type] Analyzing ${file.name} (${(file.size / 1024).toFixed(1)} KB) with Claude`);

    // Use the same parseDocument function that all other parsers use
    const instructions = `You are analyzing a PDF document to determine its type.

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

    const parsedResponse = await parseDocument(base64Pdf, 'application/pdf', instructions);

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
        pageCount: null,
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
