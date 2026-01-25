import { NextRequest, NextResponse } from 'next/server';
import { classifyDocument } from '@/lib/ai/document-classifier';

// Dynamic import for pdfjs to avoid bundling issues
const getPdfJs = async () => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjs;
};

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

    // Extract text from first page
    const pdfjs = await getPdfJs();

    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({
      data: uint8Array,
      standardFontDataUrl: undefined,
      useSystemFonts: true,
      disableFontFace: true,
    });
    const pdfDocument = await loadingTask.promise;

    const firstPage = await pdfDocument.getPage(1);
    const textContent = await firstPage.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');

    console.log(`[Detect Doc Type] Classifying ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    console.log(`[Detect Doc Type] Extracted ${pageText.length} characters from first page`);

    // Classify the document using AI
    const classification = await classifyDocument(pageText);

    console.log(`[Detect Doc Type] Result: ${classification.typeName} (${classification.confidence} confidence)`);

    return NextResponse.json({
      classification,
      preview: {
        pageCount: pdfDocument.numPages,
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
