# @gms/agents

> Reusable AI agents for GMS merchandise management products.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./CHANGELOG.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Claude API](https://img.shields.io/badge/Claude-Opus%20%7C%20Sonnet-purple.svg)](https://anthropic.com)

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Architecture](#architecture)
- [Model Routing Strategy](#model-routing-strategy)
- [API Reference](#api-reference)
  - [Document Parsers](#document-parsers)
  - [Document Classifier](#document-classifier)
  - [Projection Agent Types](#projection-agent-types)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Contributing](#contributing)

---

## Overview

`@gms/agents` is a centralized library of AI-powered agents used across GMS merchandise management products. It provides:

- **Document Parsers**: Extract structured data from PDFs (sales reports, purchase orders, packing lists, settlements)
- **Document Classifier**: Automatically detect document types from uploaded files
- **Model Routing**: Intelligent selection of Claude models based on task complexity
- **Type Definitions**: Full TypeScript support for all agents and data structures

### Key Features

1. **Intelligent Model Selection**: Uses Opus for complex reasoning, Sonnet for parsing
2. **Structured Output**: All parsers return typed, validated data structures
3. **Reusability**: Single source of truth for AI agents across products
4. **Versioning**: Semantic versioning for predictable updates

---

## Installation

```bash
npm install @gms/agents
```

### Requirements

- Node.js 18+
- TypeScript 5.0+
- Anthropic API key (`ANTHROPIC_API_KEY` environment variable)

---

## Architecture

```
@gms/agents
├── parsers/           # Document parsing agents (Sonnet)
│   ├── sales-report   # AtVenu sales report PDFs
│   ├── purchase-order # PO documents
│   ├── packing-list   # Shipment receipts
│   └── settlement     # Financial settlements
├── classifiers/       # Document classification (Sonnet)
│   └── document       # Auto-detect document type
├── agents/            # Complex reasoning agents (Opus)
│   └── projection     # Trend analysis, recommendations (types only)
└── models             # Model routing configuration
```

### Data Flow

```
PDF Upload → Classifier → Parser → Structured Data
                ↓
         Document Type
         (po, packing-list, sales-report, settlement)
```

---

## Model Routing Strategy

The library implements task-based model routing to optimize for cost and capability:

### Model Selection Matrix

| Model | ID | Use Cases | Cost Tier |
|-------|-----|-----------|-----------|
| **Claude Opus 4** | `claude-opus-4-20250514` | Complex reasoning, trend analysis, business recommendations, size distribution analysis | High |
| **Claude Sonnet 4** | `claude-sonnet-4-20250514` | Document parsing, classification, conversational AI, structured extraction | Medium |
| **Claude Haiku 3.5** | `claude-3-5-haiku-20241022` | Reserved for high-volume, simple tasks | Low |

### Task Routing

```typescript
import { getModelForTask, MODEL_ROUTING } from '@gms/agents';

// Complex reasoning tasks → Opus
getModelForTask('projection-analysis');        // claude-opus-4-20250514
getModelForTask('recommendations');            // claude-opus-4-20250514
getModelForTask('size-distribution');          // claude-opus-4-20250514
getModelForTask('comprehensive-projections');  // claude-opus-4-20250514

// Document tasks → Sonnet
getModelForTask('document-parsing');           // claude-sonnet-4-20250514
getModelForTask('document-classification');    // claude-sonnet-4-20250514
getModelForTask('chat');                       // claude-sonnet-4-20250514
```

### When to Use Each Model

**Use Opus for:**
- Analyzing sales trends across multiple shows
- Generating restock recommendations
- Size distribution optimization
- Multi-factor inventory projections
- Business strategy recommendations

**Use Sonnet for:**
- Extracting data from PDFs
- Classifying document types
- Parsing structured content
- Conversational interfaces
- Quick data extraction tasks

---

## API Reference

### Document Parsers

All parsers accept base64-encoded PDF data and return structured, typed data.

#### `parseSalesReport(pdfBase64: string): Promise<SalesReportData>`

Parses AtVenu sales report PDFs containing merchandise sales data.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `pdfBase64` | `string` | Base64-encoded PDF file content |

**Returns:** `Promise<SalesReportData>`

```typescript
interface SalesReportData {
  showDate: string;         // YYYY-MM-DD format
  venueName: string;        // Venue name from report
  city?: string;            // City if available
  state?: string;           // State/province if available
  totalGross: number;       // Total gross sales
  totalNet: number;         // Total net sales (after fees)
  attendance?: number;      // Attendance if available
  perHead?: number;         // Per-head average if available
  lineItems: SalesLineItem[];
}

interface SalesLineItem {
  productName: string;      // Product description
  sku?: string;             // SKU if available
  category?: string;        // Product category
  size?: string;            // Size (S, M, L, XL, etc.)
  quantitySold: number;     // Units sold
  unitPrice: number;        // Price per unit
  grossRevenue: number;     // Total gross revenue
  netRevenue?: number;      // Net revenue after splits
}
```

**Example:**

```typescript
import { parseSalesReport } from '@gms/agents';
import type { SalesReportData } from '@gms/agents';

const pdfBase64 = fs.readFileSync('sales-report.pdf').toString('base64');

const data: SalesReportData = await parseSalesReport(pdfBase64);

console.log(`Show: ${data.venueName} on ${data.showDate}`);
console.log(`Gross: $${data.totalGross.toLocaleString()}`);
console.log(`Items sold: ${data.lineItems.length} products`);

for (const item of data.lineItems) {
  console.log(`  ${item.productName}: ${item.quantitySold} @ $${item.unitPrice}`);
}
```

---

#### `parsePurchaseOrder(pdfBase64: string): Promise<PurchaseOrderData>`

Parses purchase order documents from merchandise vendors.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `pdfBase64` | `string` | Base64-encoded PDF file content |

**Returns:** `Promise<PurchaseOrderData>`

```typescript
interface PurchaseOrderData {
  poNumber: string;         // Purchase order number
  orderDate: string;        // YYYY-MM-DD format
  vendor: string;           // Vendor name
  vendorAddress?: string;   // Vendor address
  shipTo?: string;          // Ship-to address
  expectedDelivery?: string; // Expected delivery date
  totalCost: number;        // Total order cost
  lineItems: POLineItem[];
}

interface POLineItem {
  productName: string;      // Product description
  sku: string;              // SKU
  size?: string;            // Size
  color?: string;           // Color
  quantity: number;         // Ordered quantity
  unitCost: number;         // Cost per unit
  totalCost: number;        // Line total
}
```

**Example:**

```typescript
import { parsePurchaseOrder } from '@gms/agents';

const data = await parsePurchaseOrder(pdfBase64);

console.log(`PO #${data.poNumber} from ${data.vendor}`);
console.log(`Total: $${data.totalCost.toLocaleString()}`);
console.log(`Items: ${data.lineItems.length}`);
```

---

#### `parsePackingList(pdfBase64: string): Promise<PackingListData>`

Parses packing list/shipment receipt documents.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `pdfBase64` | `string` | Base64-encoded PDF file content |

**Returns:** `Promise<PackingListData>`

```typescript
interface PackingListData {
  packingListNumber?: string;  // Packing list number
  receivedDate: string;        // YYYY-MM-DD format
  vendor: string;              // Vendor name
  poReference?: string;        // Related PO number
  trackingNumber?: string;     // Shipping tracking number
  carrier?: string;            // Shipping carrier
  lineItems: PackingListLineItem[];
}

interface PackingListLineItem {
  productName: string;      // Product description
  sku: string;              // SKU
  size?: string;            // Size
  color?: string;           // Color
  orderedQuantity?: number; // Original order qty
  shippedQuantity: number;  // Qty shipped
  receivedQuantity?: number; // Qty received (if different)
}
```

**Example:**

```typescript
import { parsePackingList } from '@gms/agents';

const data = await parsePackingList(pdfBase64);

console.log(`Received from ${data.vendor} on ${data.receivedDate}`);

for (const item of data.lineItems) {
  const received = item.receivedQuantity ?? item.shippedQuantity;
  console.log(`  ${item.sku}: ${received} units`);
}
```

---

#### `parseSettlement(pdfBase64: string): Promise<SettlementReportData>`

Parses financial settlement reports from venues/promoters.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `pdfBase64` | `string` | Base64-encoded PDF file content |

**Returns:** `Promise<SettlementReportData>`

```typescript
interface SettlementReportData {
  showDate: string;          // YYYY-MM-DD format
  venue: string;             // Venue name
  city?: string;             // City
  state?: string;            // State/province
  promoter?: string;         // Promoter name
  grossRevenue: number;      // Total gross revenue
  netRevenue: number;        // Net after deductions
  venueFee?: number;         // Venue percentage/fee
  creditCardFees?: number;   // CC processing fees
  otherDeductions?: number;  // Other deductions
  artistPayout: number;      // Final artist payout
  comps: SettlementComp[];   // Comped items
}

interface SettlementComp {
  description: string;       // What was comped
  quantity: number;          // How many
  value: number;             // Dollar value
  recipient?: string;        // Who received it
}
```

**Example:**

```typescript
import { parseSettlement } from '@gms/agents';

const data = await parseSettlement(pdfBase64);

console.log(`Settlement for ${data.venue} - ${data.showDate}`);
console.log(`Gross: $${data.grossRevenue.toLocaleString()}`);
console.log(`Net: $${data.netRevenue.toLocaleString()}`);
console.log(`Artist Payout: $${data.artistPayout.toLocaleString()}`);

if (data.comps.length > 0) {
  console.log(`Comps: ${data.comps.length} items`);
}
```

---

### Document Classifier

#### `classifyDocument(pdfText: string, firstPageImage?: string): Promise<ClassificationResult>`

Automatically detects the type of a document from its text content.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `pdfText` | `string` | Extracted text from the PDF |
| `firstPageImage` | `string` (optional) | Base64-encoded image of first page for visual analysis |

**Returns:** `Promise<ClassificationResult>`

```typescript
type DocType = 'po' | 'packing-list' | 'sales-report' | 'settlement';

interface ClassificationResult {
  detectedType: DocType;     // The detected document type
  typeName: string;          // Human-readable type name
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;         // Why this classification was chosen
  indicators: string[];      // Key indicators found in document
}
```

**Document Types:**

| Type | Name | Typical Indicators |
|------|------|-------------------|
| `po` | Purchase Order | PO number, vendor info, line items with costs |
| `packing-list` | Packing List | Shipment number, SKUs, shipped quantities |
| `sales-report` | Sales Report | Show date, venue, sales figures, per-head |
| `settlement` | Settlement | Net payout, deductions, venue fees |

**Example:**

```typescript
import { classifyDocument } from '@gms/agents';

// Extract text from PDF first (using your preferred method)
const pdfText = await extractTextFromPdf(pdfBuffer);

const result = await classifyDocument(pdfText);

console.log(`Type: ${result.typeName} (${result.confidence} confidence)`);
console.log(`Reasoning: ${result.reasoning}`);
console.log(`Indicators: ${result.indicators.join(', ')}`);

// Route to appropriate parser
switch (result.detectedType) {
  case 'sales-report':
    const salesData = await parseSalesReport(pdfBase64);
    break;
  case 'po':
    const poData = await parsePurchaseOrder(pdfBase64);
    break;
  // etc.
}
```

---

### Projection Agent Types

The projection agent implementation remains in the main application, but types are exported for consistency:

```typescript
import type {
  ProjectionContext,
  AIRecommendation,
  ProjectionAnalysis,
  ComprehensiveProjection,
  SizeAnalysisResult,
} from '@gms/agents';
```

#### `ProjectionContext`

Context data required for projection analysis.

```typescript
interface ProjectionContext {
  tourId: string;
  tourName: string;
  artistName: string;
  showsCompleted: number;
  showsRemaining: number;
  salesHistory: Array<{
    showId: string;
    showDate: string;
    venue: string;
    attendance: number;
    grossSales: number;
    perHead: number;
    topProducts: Array<{
      productId: string;
      productName: string;
      quantitySold: number;
      revenue: number;
    }>;
  }>;
  currentInventory: Array<{
    productId: string;
    productName: string;
    currentStock: number;
    sizeBreakdown?: Record<string, number>;
  }>;
  upcomingShows: Array<{
    showId: string;
    showDate: string;
    venue: string;
    city: string;
    expectedAttendance?: number;
  }>;
}
```

#### `AIRecommendation`

Recommendation structure from the projection agent.

```typescript
interface AIRecommendation {
  type: 'restock' | 'redistribute' | 'alert' | 'opportunity';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  reasoning: string;
  impact: string;
  suggestedAction?: string;
  affectedProducts?: string[];
  estimatedValue?: number;
}
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |

### Client Management

```typescript
import { getClient, resetClient } from '@gms/agents';

// Get the singleton Anthropic client
const client = getClient();

// Reset client (useful for testing or key rotation)
resetClient();
```

---

## Error Handling

All functions throw errors with descriptive messages:

```typescript
try {
  const data = await parseSalesReport(pdfBase64);
} catch (error) {
  if (error.message.includes('Failed to parse')) {
    // Parser couldn't extract data
    console.error('Invalid PDF format or content');
  } else if (error.message.includes('API')) {
    // Anthropic API error
    console.error('AI service unavailable');
  }
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Failed to parse sales report` | PDF content not recognized | Verify PDF is a valid sales report |
| `No text response from Claude` | Empty API response | Retry request |
| `Could not parse JSON from response` | Malformed AI output | Check PDF quality |
| `ANTHROPIC_API_KEY not set` | Missing env var | Set API key |

---

## Testing

```bash
# Run tests
npm test

# Build the package
npm run build

# Type check
npm run typecheck
```

### Testing Parsers

```typescript
import { parseSalesReport } from '@gms/agents';
import fs from 'fs';

// Load test PDF
const testPdf = fs.readFileSync('__tests__/fixtures/sales-report.pdf');
const base64 = testPdf.toString('base64');

// Parse and validate
const result = await parseSalesReport(base64);

expect(result.showDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
expect(result.totalGross).toBeGreaterThan(0);
expect(result.lineItems.length).toBeGreaterThan(0);
```

---

## Contributing

1. All changes must maintain backward compatibility
2. Add JSDoc comments to all exported functions
3. Update this README when adding new agents
4. Follow semantic versioning

### Adding a New Parser

1. Create `src/parsers/your-parser.ts`
2. Add types to `src/parsers/types.ts`
3. Export from `src/parsers/index.ts`
4. Add to main `src/index.ts` exports
5. Document in this README

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

---

## License

Private - GMS Internal Use Only

Copyright (c) 2025 GMS
