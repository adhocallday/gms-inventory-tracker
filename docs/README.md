# GMS Inventory Tracker Documentation

## Quick Links

- **[PDF Processing Guide](./PDF_PROCESSING.md)** - How we handle PDF uploads with Claude API
- **[Agent Architecture](./AGENT_ARCHITECTURE.md)** - How agents are isolated and organized

---

## Overview

This documentation covers critical architectural decisions and implementation details for the GMS Inventory Tracker application.

---

## Key Topics

### PDF Processing

**Problem:** Node.js PDF libraries fail in serverless environments (Vercel, AWS Lambda)

**Solution:** Use Claude API's native PDF reading capability

**Read:** [PDF_PROCESSING.md](./PDF_PROCESSING.md)

**Key Takeaways:**
- ❌ Don't use pdfjs-dist, pdf-parse, pdf.js-extract, or canvas
- ✅ Use `parseDocument()` from `lib/ai/claude-client.ts`
- ✅ Works reliably in production since Jan 25, 2026

---

### Agent Architecture

**Problem:** Risk of cross-contamination between different AI agents

**Solution:** Strict isolation with separate clients and clear boundaries

**Read:** [AGENT_ARCHITECTURE.md](./AGENT_ARCHITECTURE.md)

**Key Takeaways:**
- **Upload/Detection Agents:** Use `claude-client.ts` for document parsing
- **Projection Agent:** Uses its own Anthropic client for forecasting
- **No cross-imports:** Agents don't import from each other
- **Clear separation:** Parsing logic ≠ forecasting logic

---

## Quick Start

### For Developers

1. **Setting up PDF processing:**
   ```typescript
   import { parseDocument } from '@/lib/ai/claude-client';

   const result = await parseDocument(
     base64Pdf,
     'application/pdf',
     'Extract sales data from this report...'
   );
   ```

2. **Adding a new document parser:**
   - Create file in `lib/ai/parsers/`
   - Import `parseDocument` from `claude-client.ts`
   - Define instructions for Claude
   - Return structured JSON

3. **Creating a new agent:**
   - Create file in `lib/ai/`
   - Use its own Anthropic client
   - Create dedicated API routes
   - Don't import from other agents

---

## Common Pitfalls

### ❌ Don't Do This

```typescript
// DON'T: Use Node.js PDF libraries
import pdfParse from 'pdf-parse';  // Will fail in serverless!

// DON'T: Mix agent logic
import { generateProjections } from '@/lib/ai/projection-agent';
export async function parseDocument() {
  // ...
  await generateProjections();  // Wrong! Keep agents separate
}
```

### ✅ Do This Instead

```typescript
// ✅ Use Claude API for PDFs
import { parseDocument } from '@/lib/ai/claude-client';

// ✅ Keep agents isolated
// Upload agent: parses documents
// Projection agent: generates forecasts
// Never import between them
```

---

## Testing

### PDF Parsing

```bash
curl -X POST http://localhost:3002/api/detect-doc-type \
  -F "file=@./test-document.pdf"
```

### Projections

```bash
curl -X POST http://localhost:3002/api/projections/analyze \
  -H "Content-Type: application/json" \
  -d '{"tourId": "..."}'
```

---

## Architecture Diagrams

### PDF Processing Flow

```
User uploads PDF
    ↓
Convert to base64
    ↓
Claude API (native PDF reading)
    ↓
Structured JSON response
    ↓
Store in database
```

### Agent Boundaries

```
┌─────────────────────┐         ┌──────────────────────┐
│  Upload Agents      │         │  Projection Agent    │
│  • detect-doc-type  │         │  • analyze           │
│  • parse/po         │   NO    │  • recommend         │
│  • parse/sales      │  ───X   │  • generate-full     │
│  • parse/settlement │         │  • chat              │
└─────────────────────┘         └──────────────────────┘
         │                               │
         └───────────────┬───────────────┘
                         ↓
                 Shared Database
                 (not shared logic)
```

---

## Environment Setup

Required variables in `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Troubleshooting

### "DOMMatrix is not defined"

**Solution:** See [PDF_PROCESSING.md](./PDF_PROCESSING.md#troubleshooting)

### "Agent cross-contamination"

**Solution:** See [AGENT_ARCHITECTURE.md](./AGENT_ARCHITECTURE.md#isolation-principles)

### "Slow PDF processing"

**Solution:** Check PDF size, reduce max_tokens, enable caching

---

## Contributing

When adding new features:

1. Read relevant documentation first
2. Follow established patterns
3. Keep agents isolated
4. Update docs if architecture changes
5. Add tests for new functionality

---

## Version History

| Date | Document | Changes |
|------|----------|---------|
| Jan 25, 2026 | PDF_PROCESSING.md | Initial creation after solving DOMMatrix issues |
| Jan 25, 2026 | AGENT_ARCHITECTURE.md | Documented agent isolation principles |
| Jan 25, 2026 | README.md | Created documentation index |

---

## Support

Questions? Check:

1. This README
2. Specific topic docs (PDF_PROCESSING.md, etc.)
3. Code examples in the docs
4. Git commit history for context

**Last Updated:** January 25, 2026
