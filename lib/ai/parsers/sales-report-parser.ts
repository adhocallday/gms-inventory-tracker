import { parseWithAgent, parseDocument } from '../claude-client';
import { extractTextFromBase64PDF } from '../pdf-utils';
import { SALES_REPORT_AGENT } from '../agents';

export interface SalesLineItem {
  sku: string;
  description: string;
  size: string;
  sold: number;
  unitPrice: number;
  gross: number;
}

export interface SalesReportData {
  showDate: string;
  venueName: string;
  city?: string;
  state?: string;
  attendance?: number;
  totalGross: number;
  lineItems: SalesLineItem[];
}

// Fallback instructions for document parsing (when text extraction fails)
const FALLBACK_INSTRUCTIONS = `
Parse this AtVenu sales report PDF. Extract:
- showDate (YYYY-MM-DD)
- venueName
- city, state
- totalGross
- lineItems: [{sku (strip size suffix), description, size, sold, unitPrice, gross}]

Return ONLY valid JSON.
`;

export async function parseSalesReport(
  pdfBase64: string
): Promise<SalesReportData> {
  const startTime = Date.now();

  // Try text extraction + agent parsing (with caching)
  try {
    const textStartTime = Date.now();
    const extractedText = await extractTextFromBase64PDF(pdfBase64);
    console.log(`[SalesReportParser] Text extraction: ${Date.now() - textStartTime}ms (${extractedText?.length ?? 0} chars)`);

    // Only use agent parsing if we got meaningful content
    if (extractedText && extractedText.trim().length > 100) {
      console.log('[SalesReportParser] Using agent with cached system prompt');

      const result = await parseWithAgent(SALES_REPORT_AGENT, extractedText);

      console.log(`[SalesReportParser] Agent parse: ${result.parseTimeMs}ms (cache ${result.cacheHit ? 'HIT' : 'MISS'})`);
      console.log(`[SalesReportParser] TOTAL: ${Date.now() - startTime}ms`);

      return result.data as SalesReportData;
    }
  } catch (textError) {
    console.log('[SalesReportParser] Agent parsing failed, falling back to document parsing:', textError);
  }

  // Fallback to full document parsing (slower but handles scanned PDFs)
  console.log('[SalesReportParser] Using document-based parsing (slower)');
  const aiStartTime = Date.now();
  const result = await parseDocument(pdfBase64, 'application/pdf', FALLBACK_INSTRUCTIONS) as SalesReportData;
  console.log(`[SalesReportParser] Document parsing: ${Date.now() - aiStartTime}ms`);
  console.log(`[SalesReportParser] TOTAL: ${Date.now() - startTime}ms`);
  return result;
}
