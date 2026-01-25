import { NextRequest, NextResponse } from 'next/server';
import { classifyDocument } from '@/lib/ai/document-classifier';

/**
 * POST /api/detect-doc-type
 * Detect document type using AI classification
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

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[Detect Doc Type] Parsing ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

    // Extract text from PDF using pdf-parse (CommonJS module)
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(buffer);
    const pageText = pdfData.text;

    console.log(`[Detect Doc Type] Extracted ${pageText.length} characters from ${pdfData.numpages} pages`);

    // Classify the document using AI
    const classification = await classifyDocument(pageText);

    console.log(`[Detect Doc Type] Result: ${classification.typeName} (${classification.confidence} confidence)`);

    return NextResponse.json({
      classification,
      preview: {
        pageCount: pdfData.numpages,
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
