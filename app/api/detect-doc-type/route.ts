import { NextRequest, NextResponse } from 'next/server';
import { classifyDocument } from '@/lib/ai/document-classifier';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';

// Configure PDF.js worker for Node.js environment
// Disable worker in server environment
pdfjs.GlobalWorkerOptions.workerSrc = '';

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

    // Generate PDF preview (data URL for first page)
    const viewport = firstPage.getViewport({ scale: 1.0 });

    // Create canvas in node environment
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    // Render PDF page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    try {
      await firstPage.render(renderContext).promise;
    } catch (renderError) {
      console.warn('PDF render warning:', renderError);
      // Continue even if render fails - we have the text
    }

    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL('image/png');

    // Classify the document
    const classification = await classifyDocument(pageText);

    return NextResponse.json({
      classification,
      preview: {
        dataUrl,
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
