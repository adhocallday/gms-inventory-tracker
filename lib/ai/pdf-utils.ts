/**
 * PDF text extraction utilities for faster document parsing.
 * Extracts text from PDFs so we can send just text to Claude
 * instead of the full document (much faster).
 *
 * DEPENDENCY: pdf-parse v2.4.5+
 * API: Uses PDFParse class with load() + getText() pattern
 *
 * To revert: git checkout lib/ai/pdf-utils.ts
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse');

// pdf-parse v2 result structure
interface PDFTextResult {
  text: string;
  pages: Array<{ text: string }>;
  total: number;
}

/**
 * Extract text from a PDF buffer.
 * @param buffer - PDF file buffer
 * @returns Extracted text content
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // pdf-parse v2 requires Uint8Array, not Buffer
  const uint8 = new Uint8Array(buffer);
  const parser = new PDFParse(uint8);

  try {
    await parser.load();
    const result: PDFTextResult = await parser.getText();
    return result.text;
  } catch (error) {
    console.error('PDF text extraction failed:', error);
    throw new Error('Failed to extract text from PDF');
  } finally {
    parser.destroy();
  }
}

/**
 * Extract text from a base64-encoded PDF.
 * @param base64 - Base64 encoded PDF
 * @returns Extracted text content
 */
export async function extractTextFromBase64PDF(base64: string): Promise<string> {
  const buffer = Buffer.from(base64, 'base64');
  return extractTextFromPDF(buffer);
}
