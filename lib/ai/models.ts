/**
 * GMS AI Model Configuration
 *
 * Centralized model definitions and task-based routing for all AI agents.
 * This enables intelligent model selection based on task complexity.
 *
 * @module models
 * @version 1.0.0
 */

/**
 * Available Claude models
 */
export const MODELS = {
  /** Claude Opus 4 - Most capable, best for complex reasoning */
  OPUS: 'claude-opus-4-20250514',

  /** Claude Sonnet 4 - Balanced performance, reliable JSON output */
  SONNET: 'claude-sonnet-4-20250514',

  /** Claude Haiku 3.5 - Fastest, best for simple tasks */
  HAIKU: 'claude-3-5-haiku-20241022',
} as const;

export type ModelName = (typeof MODELS)[keyof typeof MODELS];

/**
 * Task types supported by the model router
 */
export type TaskType =
  // Complex reasoning tasks → Opus
  | 'projection-analysis'
  | 'recommendations'
  | 'size-distribution'
  | 'comprehensive-projections'
  // Document parsing → Sonnet
  | 'document-parsing'
  | 'document-classification'
  // Conversational → Sonnet
  | 'chat';

/**
 * Task-based model routing configuration
 *
 * - **Opus**: Complex reasoning, trend analysis, business recommendations
 * - **Sonnet**: Document parsing, classification, conversational AI
 * - **Haiku**: Reserved for simple, high-volume tasks (future)
 */
export const MODEL_ROUTING: Record<TaskType, ModelName> = {
  // Complex reasoning tasks → Opus (most capable)
  'projection-analysis': MODELS.OPUS,
  'recommendations': MODELS.OPUS,
  'size-distribution': MODELS.OPUS,
  'comprehensive-projections': MODELS.OPUS,

  // Document parsing → Sonnet (reliable JSON, good accuracy)
  'document-parsing': MODELS.SONNET,
  'document-classification': MODELS.SONNET,

  // Conversational → Sonnet (balanced performance)
  'chat': MODELS.SONNET,
} as const;

/**
 * Get the appropriate model for a given task type
 *
 * @param task - The type of AI task to perform
 * @returns The model ID to use for this task
 *
 * @example
 * const model = getModelForTask('projection-analysis');
 * // Returns: 'claude-opus-4-20250514'
 *
 * @example
 * const model = getModelForTask('document-parsing');
 * // Returns: 'claude-sonnet-4-20250514'
 */
export function getModelForTask(task: TaskType): ModelName {
  return MODEL_ROUTING[task];
}

/**
 * Model metadata for logging and debugging
 */
export const MODEL_INFO: Record<
  ModelName,
  { name: string; tier: 'opus' | 'sonnet' | 'haiku'; costTier: 'high' | 'medium' | 'low' }
> = {
  [MODELS.OPUS]: { name: 'Claude Opus 4', tier: 'opus', costTier: 'high' },
  [MODELS.SONNET]: { name: 'Claude Sonnet 4', tier: 'sonnet', costTier: 'medium' },
  [MODELS.HAIKU]: { name: 'Claude Haiku 3.5', tier: 'haiku', costTier: 'low' },
};

/**
 * Get human-readable model name
 */
export function getModelName(modelId: ModelName): string {
  return MODEL_INFO[modelId]?.name || modelId;
}
