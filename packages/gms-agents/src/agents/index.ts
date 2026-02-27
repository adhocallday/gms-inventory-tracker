/**
 * Intelligent Agents
 *
 * Complex AI agents for business intelligence and forecasting.
 * These agents use Claude Opus for sophisticated reasoning.
 *
 * @module agents
 * @version 1.0.0
 *
 * Note: The projection agent is currently tightly coupled to the
 * gms-inventory-tracker application. Use the types exported here
 * and import the agent directly from the main app's lib/ai folder.
 */

// Export types for use with the projection agent
export type {
  ProjectionContext,
  AIRecommendation,
  ProjectionAnalysis,
  ComprehensiveProjection,
  SizeAnalysisResult,
} from './types.js';
