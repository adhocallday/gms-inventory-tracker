# Agent Architecture & Isolation

## Overview

This application uses **specialized AI agents** for different tasks. Each agent is **isolated** to prevent cross-contamination and ensure maintainability.

---

## Agent Types

### 1. Upload/Detection Agents

**Purpose:** Document upload, type detection, and content parsing

**Files:**
- `lib/ai/claude-client.ts` - Shared PDF parsing utility
- `app/api/detect-doc-type/route.ts` - Document type detection
- `app/api/parse/[docType]/route.ts` - Main parsing router
- `lib/ai/parsers/po-parser.ts` - Purchase order parser
- `lib/ai/parsers/packing-list-parser.ts` - Packing list parser
- `lib/ai/parsers/sales-report-parser.ts` - Sales report parser
- `lib/ai/parsers/settlement-parser.ts` - Settlement parser

**Model:** `claude-sonnet-4-20250514`

**Capabilities:**
- PDF reading (native document type)
- Structured data extraction
- Tour/show matching from metadata
- Field validation

**NOT Used For:**
- Forecasting
- Analytics
- Projections
- Business insights

---

### 2. Projection Agent

**Purpose:** Inventory forecasting and projection recommendations

**Files:**
- `lib/ai/projection-agent.ts` - Forecasting logic
- `app/api/projections/analyze/route.ts` - Analysis endpoint
- `app/api/projections/recommend/route.ts` - Recommendations
- `app/api/projections/chat/route.ts` - Conversational interface
- `app/api/projections/generate-full/route.ts` - Full projection generation

**Model:** `claude-sonnet-4-20250514`

**Capabilities:**
- Historical data analysis
- Size curve recommendations
- Product performance insights
- Stockout risk assessment
- Multi-scenario planning

**NOT Used For:**
- Document parsing
- Data extraction
- Tour/show matching

---

## Isolation Principles

### ✅ CORRECT: Agent Separation

**Upload Agent:**
```typescript
// lib/ai/parsers/sales-report-parser.ts
import { parseDocument } from '../claude-client';  // ✅ Uses shared utility

export async function parseSalesReport(pdfBase64: string) {
  const instructions = `Extract sales data...`;
  return parseDocument(pdfBase64, 'application/pdf', instructions);
}
```

**Projection Agent:**
```typescript
// lib/ai/projection-agent.ts
import Anthropic from '@anthropic-ai/sdk';  // ✅ Has its own client

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

export async function generateRecommendations(context: ProjectionContext) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    messages: [...]
  });
  // ...
}
```

**Key Differences:**
- Upload agents use **`parseDocument()`** from `claude-client.ts`
- Projection agent uses **direct Anthropic client**
- No imports between agents
- Separate prompt engineering
- Different data contracts

---

### ❌ WRONG: Agent Cross-Contamination

**DON'T DO THIS:**

```typescript
// ❌ BAD: Importing projection logic in upload parser
import { generateRecommendations } from '@/lib/ai/projection-agent';

export async function parseSalesReport(pdfBase64: string) {
  const data = await parseDocument(...);
  const recommendations = await generateRecommendations(...);  // ❌ Wrong!
  return { data, recommendations };
}
```

**Why This Is Bad:**
- Mixes concerns (parsing vs forecasting)
- Increases latency (two AI calls)
- Creates tight coupling
- Hard to test independently
- Confusing data flow

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  User Uploads PDF                                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Upload Agent (claude-client.ts)                            │
│  • Detects document type                                    │
│  • Extracts tour/show metadata                              │
│  • Parses line items                                        │
│  • Returns structured JSON                                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Database (parsed_documents)                                │
│  • Stores extracted data                                    │
│  • Status: draft, staged, posted                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  User Reviews & Posts Document                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Database (purchase_orders, sales_transactions, etc.)       │
│  • Posted data                                              │
│  • Becomes historical data                                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Projection Agent (projection-agent.ts)                     │
│  • Queries historical data                                  │
│  • Generates forecasts                                      │
│  • Recommends inventory levels                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Points:**
- Upload agents create data
- Projection agents consume data
- No circular dependencies
- Clear separation of concerns

---

## Shared Utilities

### What CAN Be Shared

✅ **Database clients:**
```typescript
import { createServiceClient } from '@/lib/supabase/client';
```

✅ **Type definitions:**
```typescript
type DocType = 'po' | 'packing-list' | 'sales-report' | 'settlement';
```

✅ **Utility functions:**
```typescript
import { toNumber, extractBaseSku } from '@/lib/utils';
```

### What Should NOT Be Shared

❌ **AI prompt logic** - Keep prompts separate per agent

❌ **Agent-specific state** - Don't share contexts

❌ **Business logic** - Parsing logic ≠ forecasting logic

---

## Testing Strategy

### Upload Agents

**Test with real PDFs:**
```bash
# Sales report
curl -X POST http://localhost:3002/api/parse/sales-report \
  -F "file=@./test-sales-report.pdf"

# Purchase order
curl -X POST http://localhost:3002/api/parse/po \
  -F "file=@./test-po.pdf"
```

**Verify:**
- Correct document type detection
- Accurate data extraction
- Tour/show matching works
- Field validation

### Projection Agent

**Test with database fixtures:**
```bash
# Generate analysis
curl -X POST http://localhost:3002/api/projections/analyze \
  -H "Content-Type: application/json" \
  -d '{"tourId": "...", "expectedAttendance": 50000}'

# Get recommendations
curl -X POST http://localhost:3002/api/projections/recommend \
  -H "Content-Type: application/json" \
  -d '{"tourId": "...", "scenarioId": "..."}'
```

**Verify:**
- Accurate historical analysis
- Reasonable forecasts
- Size curve logic
- Stockout detection

---

## Adding New Agents

### Steps to Add a New Agent

1. **Create agent file:**
   ```
   lib/ai/new-agent.ts
   ```

2. **Use its own Anthropic client:**
   ```typescript
   const anthropic = new Anthropic({ apiKey: ... });
   ```

3. **Create dedicated API routes:**
   ```
   app/api/new-feature/route.ts
   ```

4. **Don't import from other agents**

5. **Document in this file**

### Example: Adding a "Comp Analysis Agent"

**File:** `lib/ai/comp-analyzer.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

export async function analyzeComps(compsData: any[]) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Analyze these comps and identify patterns...`
    }]
  });
  // ...
}
```

**API Route:** `app/api/comps/analyze/route.ts`

```typescript
import { analyzeComps } from '@/lib/ai/comp-analyzer';

export async function POST(request: NextRequest) {
  const { compsData } = await request.json();
  const analysis = await analyzeComps(compsData);
  return NextResponse.json({ analysis });
}
```

**Key:**
- ✅ New agent file (separate from others)
- ✅ Own Anthropic client
- ✅ Dedicated API route
- ✅ No cross-imports

---

## Performance Considerations

### Concurrent Agent Calls

**OK:** Multiple upload agents processing different files
```typescript
// These can run in parallel
await Promise.all([
  parseSalesReport(pdf1),
  parsePurchaseOrder(pdf2),
  parseSettlement(pdf3)
]);
```

**AVOID:** Nesting agent calls
```typescript
// ❌ Don't do this
const parsed = await parseDocument(...);
const analysis = await analyzeComps(parsed.comps);  // Extra latency!
```

### Caching Strategy

**Upload agents:**
- Cache by `source_hash` (PDF file hash)
- Store in `parsed_documents` table
- Reuse if same PDF uploaded

**Projection agent:**
- Cache by `scenario_id` + `context_hash`
- Store in `ai_projection_recommendations`
- Invalidate when historical data changes

---

## Monitoring & Debugging

### Log Prefixes

Each agent uses distinct log prefixes:

**Upload agents:**
```typescript
console.log('[Detect Doc Type] Analyzing file...');
console.log('[Parse PO] Extracted 15 line items');
console.log('[Parse Sales Report] Matched show: ...');
```

**Projection agent:**
```typescript
console.log('[Projection Agent] Generating analysis...');
console.log('[Projection Agent] Stockout risk: ...');
console.log('[Projection Agent] Recommendation: ...');
```

### Error Tracking

Each agent has its own error logging:

```typescript
// Upload agent
await supabase.from('ai_processing_logs').insert({
  doc_type: 'sales-report',
  status: 'error',
  error_message: error.message
});

// Projection agent
await supabase.from('ai_projection_logs').insert({
  scenario_id: scenarioId,
  status: 'error',
  error_message: error.message
});
```

---

## Migration Notes

### Historical Context

**Before (Jan 2026):**
- Mixed agent logic
- Shared Anthropic client
- Cross-contamination issues

**After (Jan 2026):**
- Clear agent boundaries
- Separate clients
- Isolated concerns

**Commits:**
- `d6ceac3` - Upload agent isolation
- `df2d13f` - Tour/show matching in upload agent

---

## Best Practices Summary

1. ✅ **One agent, one purpose**
2. ✅ **Separate Anthropic clients**
3. ✅ **No cross-imports between agents**
4. ✅ **Clear data contracts**
5. ✅ **Dedicated API routes**
6. ✅ **Distinct log prefixes**
7. ✅ **Independent testing**
8. ✅ **Documented boundaries**

---

## Related Documentation

- **PDF Processing:** See `docs/PDF_PROCESSING.md`
- **API Routes:** See `app/api/README.md`
- **Database Schema:** See `supabase/migrations/`

**Last Updated:** January 25, 2026
**Maintainer:** Engineering Team
