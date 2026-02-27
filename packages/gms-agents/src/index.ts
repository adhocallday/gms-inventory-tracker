/**
 * GMS AI Agents
 *
 * Reusable AI agents for GMS merchandise management products.
 *
 * @package @gms/agents
 * @version 1.0.0
 *
 * ## Model Routing
 *
 * - **Opus**: Complex reasoning (projections, recommendations, size analysis)
 * - **Sonnet**: Document parsing, classification, conversational AI
 * - **Haiku**: Reserved for future high-volume simple tasks
 *
 * ## Quick Start
 *
 * ```typescript
 * import { parseSalesReport, classifyDocument } from '@gms/agents';
 *
 * // Classify a document
 * const classification = await classifyDocument(pdfText);
 *
 * // Parse based on type
 * if (classification.detectedType === 'sales-report') {
 *   const data = await parseSalesReport(pdfBase64);
 * }
 * ```
 */

// Parsers
export {
  parseSalesReport,
  parsePurchaseOrder,
  parsePackingList,
  parseSettlement,
} from './parsers/index.js';

export type {
  SalesReportData,
  SalesLineItem,
  PurchaseOrderData,
  POLineItem,
  PackingListData,
  PackingListLineItem,
  SettlementReportData,
  SettlementComp,
  ParsedDocument,
} from './parsers/index.js';

// Classifiers
export { classifyDocument } from './classifiers/index.js';
export type { DocType, ClassificationResult } from './classifiers/index.js';

// Agent Types (projection agent remains in main app)
export type {
  ProjectionContext,
  AIRecommendation,
  ProjectionAnalysis,
  ComprehensiveProjection,
  SizeAnalysisResult,
} from './agents/index.js';

// Model configuration
export {
  MODELS,
  MODEL_ROUTING,
  getModelForTask,
  getModelName,
  MODEL_INFO,
} from './models.js';

export type { ModelName, TaskType } from './models.js';

// Client utilities
export { getClient, resetClient } from './client.js';
