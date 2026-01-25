# PDF Processing with Claude API

## Overview

This project uses **Claude's native PDF reading capability** via the Anthropic API to parse and analyze PDF documents. This approach avoids common serverless deployment issues associated with Node.js PDF libraries.

---

## ⚠️ CRITICAL: Do NOT Use Node.js PDF Libraries

### Failed Approaches (DO NOT USE)

The following libraries **will fail** in Vercel/serverless environments:

1. **`pdfjs-dist`** - Requires browser DOM APIs (DOMMatrix, canvas)
2. **`pdf-parse`** - Uses `pdfjs-dist` internally (same issues)
3. **`pdf.js-extract`** - Requires worker threads (fails in Lambda)
4. **`canvas`** - Requires native dependencies (not available in serverless)

### Why They Fail

```
Error: DOMMatrix is not defined
Error: Cannot find module './pdf.worker.js'
Error: Setting up fake worker failed
```

**Root Cause:** These libraries expect:
- Browser DOM APIs (DOMMatrix, OffscreenCanvas)
- Worker threads (not available in AWS Lambda)
- File system access
- Native dependencies (node-canvas, node-gyp)

None of these are available in serverless environments like Vercel/Netlify.

---

## ✅ Correct Solution: Claude API

### Architecture

```
User uploads PDF
    ↓
Convert to base64
    ↓
Send to Claude API (with 'document' type)
    ↓
Claude reads PDF natively
    ↓
Returns extracted data as JSON
```

### Key Files

- **`lib/ai/claude-client.ts`** - Shared PDF parsing utility
- **`app/api/detect-doc-type/route.ts`** - Document type detection
- **`app/api/parse/[docType]/route.ts`** - Document content parsing
- **`lib/ai/parsers/*.ts`** - Type-specific parsers (PO, sales report, etc.)

---

## Implementation Guide

### 1. Core Utility: `lib/ai/claude-client.ts`

This is the **battle-tested** function used by all PDF parsers:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

export async function parseDocument(
  base64Data: string,
  mediaType: 'application/pdf' | 'image/jpeg' | 'image/png',
  instructions: string
): Promise<ParsedDocument> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16384,
    messages: [{
      role: 'user',
      content: [
        ({
          type: 'document',  // ← KEY: Use 'document' type
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Data
          }
        } as any),  // ← Type assertion needed (SDK types lag behind API)
        {
          type: 'text',
          text: instructions
        }
      ]
    }]
  } as any);  // ← Also needed here

  // Extract and parse JSON from response
  const textContent = response.content.find(c => c.type === 'text');
  let responseText = textContent.text;

  // Remove markdown code blocks if present
  if (responseText.includes('```')) {
    const match = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) responseText = match[1];
  }

  // Extract JSON object
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch[0]);
}
```

### 2. Example: Document Type Detection

**File:** `app/api/detect-doc-type/route.ts`

```typescript
import { parseDocument } from '@/lib/ai/claude-client';

export async function POST(request: NextRequest) {
  // Get PDF file from form data
  const formData = await request.formData();
  const file = formData.get('file') as File;

  // Convert to base64
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Pdf = buffer.toString('base64');

  // Create instructions for Claude
  const instructions = `
    Analyze this PDF and determine its type.
    Return JSON: { "detectedType": "po" | "sales-report" | ... }
  `;

  // Parse with Claude
  const result = await parseDocument(
    base64Pdf,
    'application/pdf',
    instructions
  );

  return NextResponse.json({ classification: result });
}
```

### 3. Example: Sales Report Parser

**File:** `lib/ai/parsers/sales-report-parser.ts`

```typescript
import { parseDocument } from '../claude-client';

export async function parseSalesReport(pdfBase64: string) {
  const instructions = `
    Extract sales data from this AtVenu report.
    Return JSON with: showDate, venueName, totalGross, lineItems[]
  `;

  return parseDocument(pdfBase64, 'application/pdf', instructions);
}
```

---

## Best Practices

### 1. Always Use the Shared Utility

✅ **CORRECT:**
```typescript
import { parseDocument } from '@/lib/ai/claude-client';
const result = await parseDocument(base64, 'application/pdf', instructions);
```

❌ **WRONG:**
```typescript
// Don't create your own Anthropic client instance
const anthropic = new Anthropic();
const response = await anthropic.messages.create({...});
```

### 2. Type Assertions Are Required

The Anthropic SDK TypeScript types don't include `document` content type yet (as of Jan 2025), so you **must** use `as any`:

```typescript
{
  type: 'document',
  source: { ... }
} as any
```

This is **intentional and correct** - the API supports it, but TypeScript types haven't caught up.

### 3. Robust JSON Parsing

Claude sometimes wraps JSON in markdown code blocks:

```json
\`\`\`json
{ "data": "value" }
\`\`\`
```

The `parseDocument` utility handles this automatically by:
1. Stripping markdown code blocks
2. Extracting JSON with regex
3. Parsing with error handling

### 4. Model Selection

Use **`claude-sonnet-4-20250514`** for:
- Complex documents
- Multi-page PDFs
- Structured data extraction

This model has:
- Native PDF reading
- High accuracy for tabular data
- Good performance (10-30 seconds per document)

---

## Client-Side PDF Preview

For instant user feedback, we use **browser-based preview** instead of server-side rendering:

```typescript
// Create object URL from uploaded file
const previewUrl = URL.createObjectURL(file);
setPdfPreview(previewUrl);

// Display in iframe
<iframe src={previewUrl} className="w-full h-96" />

// Clean up when done
URL.revokeObjectURL(previewUrl);
```

**Benefits:**
- Instant preview (no server processing)
- Native browser PDF viewer
- No memory leaks (with proper cleanup)
- Works offline

---

## Troubleshooting

### Error: "DOMMatrix is not defined"

**Cause:** You're using a Node.js PDF library (pdfjs-dist, pdf-parse, etc.)

**Solution:** Remove the library and use `parseDocument` from `claude-client.ts`

### Error: "Cannot find module './pdf.worker.js'"

**Cause:** pdf.js-extract or pdfjs-dist trying to load worker in serverless

**Solution:** Use Claude API instead (no workers needed)

### Error: "Type 'document' is not assignable..."

**Cause:** TypeScript SDK types don't include 'document' yet

**Solution:** Use `as any` type assertion (this is correct and intentional)

### Slow Performance (>60 seconds)

**Cause:** Large PDF or too many API calls

**Solutions:**
1. Check PDF file size (keep under 10MB)
2. Reduce `max_tokens` if response is verbose
3. Cache results using `source_hash` (already implemented)

---

## Environment Variables

Required in `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Get your API key from: https://console.anthropic.com/

---

## Testing

### Local Testing

```bash
npm run dev

# Test with curl
curl -X POST http://localhost:3002/api/detect-doc-type \
  -F "file=@./test-document.pdf"
```

### Production Testing

After deployment to Vercel:
1. Upload a test PDF through the UI
2. Check Vercel logs for Claude API response
3. Verify parsed data in database

---

## Migration History

### Previous Attempts (All Failed)

1. **Version 1 (Commit b19c2d4):** pdfjs-dist with legacy build
2. **Version 2 (Commit e248db0):** Dynamic import for pdfjs
3. **Version 3 (Commit 71e7ff1):** Type assertions for canvas
4. **Version 4 (Commit fd17f13):** Removed canvas rendering
5. **Version 5 (Commit 71eb94b):** Switched to pdf-parse
6. **Version 6 (Commit 3f7d297):** Tried pdf.js-extract

### Current Solution (Working)

- **Commit d6ceac3:** Use proven `parseDocument` from claude-client
- **Commit 1fa4d89:** Removed all PDF library dependencies
- **Commit 5f1ccac:** Added client-side preview

**Status:** ✅ **WORKING IN PRODUCTION** (since Jan 25, 2026)

---

## Cost Optimization

Claude API charges per token:
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens

Typical PDF (5 pages) costs:
- Input: ~$0.01 (PDF → tokens)
- Output: ~$0.001 (JSON response)
- **Total: ~$0.011 per document**

### Optimization Tips

1. **Cache parsed results** (already implemented via `source_hash`)
2. **Limit max_tokens** to what you actually need
3. **Use smaller models** for simple documents (if available)
4. **Batch similar documents** if possible

---

## Future Enhancements

### Potential Improvements

1. **Support for multi-page analysis** (currently first page only for preview)
2. **OCR for scanned PDFs** (Claude handles this automatically)
3. **Image extraction** from PDFs
4. **Table detection** and structured parsing
5. **Handwriting recognition** (Claude Opus 4 can do this)

### When to Use Alternative Approaches

Claude API is ideal for:
- ✅ Serverless environments (Vercel, Netlify, AWS Lambda)
- ✅ Complex document understanding
- ✅ Extracting structured data
- ✅ Multi-modal content (text + images)

Consider alternatives when:
- ❌ Processing thousands of PDFs/hour (cost prohibitive)
- ❌ Simple text extraction (use lighter libraries)
- ❌ Real-time processing required (<1 second)

---

## Related Documentation

- **Claude API Docs:** https://docs.anthropic.com/claude/docs
- **PDF Vision Guide:** https://docs.anthropic.com/claude/docs/vision#pdfs
- **Agent Isolation:** See `docs/AGENT_ARCHITECTURE.md`

---

## Support

If you encounter issues:

1. Check Vercel deployment logs
2. Verify `ANTHROPIC_API_KEY` is set
3. Test locally with `npm run dev`
4. Review this document for common pitfalls
5. Check recent commits for working examples

**Last Updated:** January 25, 2026
**Maintainer:** Claude Sonnet 4.5 + Engineering Team
