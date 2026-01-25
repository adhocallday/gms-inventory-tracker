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

    // Extract text from PDF using pdf.js-extract (Node.js compatible)
    const PDFExtract = require('pdf.js-extract').PDFExtract;
    const pdfExtract = new PDFExtract();

    // pdf.js-extract needs a file path or buffer, we'll use buffer
    const data = await pdfExtract.extractBuffer(buffer);

    // Combine all text from all pages
    const pageText = data.pages
      .map((page: any) =>
        page.content
          .map((item: any) => item.str)
          .join(' ')
      )
      .join(' ');

    console.log(`[Detect Doc Type] Extracted ${pageText.length} characters from ${data.pages.length} pages`);

    // Classify the document using AI
    const classification = await classifyDocument(pageText);

    console.log(`[Detect Doc Type] Result: ${classification.typeName} (${classification.confidence} confidence)`);

    return NextResponse.json({
      classification,
      preview: {
        pageCount: data.pages.length,
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
