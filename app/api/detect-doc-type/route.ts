import { NextRequest, NextResponse } from 'next/server';
import { classifyDocument } from '@/lib/ai/document-classifier';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window === 'undefined') {
  const pdfjsWorker = require('pdfjs-dist/build/pdf.worker.entry');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

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
    const loadingTask = pdfjs.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;

    const firstPage = await pdfDocument.getPage(1);
    const textContent = await firstPage.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');

    // Generate PDF preview (data URL for first page)
    const viewport = firstPage.getViewport({ scale: 1.5 });

    // Create canvas in node environment
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await firstPage.render(renderContext).promise;

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
