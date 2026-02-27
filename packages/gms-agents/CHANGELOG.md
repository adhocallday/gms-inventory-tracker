# Changelog

All notable changes to `@gms/agents` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-02-26

### Added

#### Document Parsers
- `parseSalesReport()` - Parse AtVenu sales report PDFs
- `parsePurchaseOrder()` - Parse purchase order documents
- `parsePackingList()` - Parse packing list/shipment receipts
- `parseSettlement()` - Parse financial settlement reports

#### Document Classifier
- `classifyDocument()` - Auto-detect document type from PDF content
- Supports: `po`, `packing-list`, `sales-report`, `settlement`

#### Model Routing
- `getModelForTask()` - Get appropriate Claude model for task type
- `MODELS` - Model ID constants (Opus, Sonnet, Haiku)
- `MODEL_ROUTING` - Task-to-model mapping
- `MODEL_INFO` - Model metadata for logging

#### Projection Agent Types
- `ProjectionContext` - Context data for projections
- `AIRecommendation` - Recommendation structure
- `ProjectionAnalysis` - Analysis result type
- `ComprehensiveProjection` - Full projection type
- `SizeAnalysisResult` - Size distribution analysis

#### Client Utilities
- `getClient()` - Get singleton Anthropic client
- `resetClient()` - Reset client instance

### Model Assignments

| Task | Model | Rationale |
|------|-------|-----------|
| `projection-analysis` | Opus | Complex trend analysis |
| `recommendations` | Opus | Business strategy reasoning |
| `size-distribution` | Opus | Multi-factor optimization |
| `comprehensive-projections` | Opus | Full forecast generation |
| `document-parsing` | Sonnet | Reliable structured extraction |
| `document-classification` | Sonnet | Pattern recognition |
| `chat` | Sonnet | Conversational balance |

---

## [Unreleased]

### Planned
- Add batch parsing support for multiple documents
- Add streaming response option for large documents
- Add Haiku support for simple validation tasks
- Add document comparison agent
