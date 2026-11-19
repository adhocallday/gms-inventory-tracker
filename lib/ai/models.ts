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
  /** Claude Opus 5.5 - Most capable, best for complex reasoning */
  OPUS: 'claude-opus-5-5',

  /** Claude Sonnet 5.5 - Balanced performance, reliable structured output */
  SONNET: 'claude-sonnet-5-5',

  /** Claude Haiku 4.5 - Fastest, best for simple tasks */
  HAIKU: 'claude-haiku-4-5',
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
  // Document parsing → Sonnet, classification → Haiku
  | 'document-parsing'
  | 'document-classification'
  // Conversational → Sonnet
  | 'chat';

/**
 * Task-based model routing configuration
 *
 * - **Opus**: Complex reasoning, trend analysis, business recommendations
 * - **Sonnet**: Document parsing, conversational AI
 * - **Haiku**: Document type classification (fast, cheap)
 */
export const MODEL_ROUTING: Record<TaskType, ModelName> = {
  // Complex reasoning tasks → Opus (most capable)
  'projection-analysis': MODELS.OPUS,
  'recommendations': MODELS.OPUS,
  'size-distribution': MODELS.OPUS,
  'comprehensive-projections': MODELS.OPUS,

  // Document parsing → Sonnet (reliable structured output, good accuracy)
  'document-parsing': MODELS.SONNET,

  // Classification → Haiku (only needs a short label)
  'document-classification': MODELS.HAIKU,

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
 * // Returns: 'claude-opus-5-5'
 *
 * @example
 * const model = getModelForTask('document-parsing');
 * // Returns: 'claude-sonnet-5-5'
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
  [MODELS.OPUS]: { name: 'Claude Opus 5.5', tier: 'opus', costTier: 'high' },
  [MODELS.SONNET]: { name: 'Claude Sonnet 5.5', tier: 'sonnet', costTier: 'medium' },
  [MODELS.HAIKU]: { name: 'Claude Haiku 4.5', tier: 'haiku', costTier: 'low' },
};

/**
 * Get human-readable model name
 */
export function getModelName(modelId: ModelName): string {
  return MODEL_INFO[modelId]?.name || modelId;
}

/**
 * Grab-sheet image recognition (lib/ai/parsers/grab-sheet-parser.ts).
 *
 * - detect: Opus 5.5 at medium effort finds every product tile on a page,
 *   reads its caption and returns the picture and caption boxes.
 * - verify: Haiku 5.5 at low effort reads the SKU back from one crop, a cheap
 *   second read that rejects mislabelled crops. Haiku 5.5 has no server-side
 *   refusal fallback, so callers handle `refusal` themselves.
 *
 * Prices are USD per million tokens, for the per-call cost log.
 */
export const GRAB_SHEET_PROFILES = {
  detect: {
    model: MODELS.OPUS,
    effort: 'medium',
    maxTokens: 32000,
    serverFallback: true,
    price: { input: 4, output: 20, cacheRead: 0.2 },
  },
  verify: {
    model: 'claude-haiku-5-5',
    effort: 'low',
    maxTokens: 2048,
    serverFallback: false,
    price: { input: 0.1, output: 0.5, cacheRead: 0.01 },
  },
} as const;

export type GrabSheetProfile = (typeof GRAB_SHEET_PROFILES)[keyof typeof GRAB_SHEET_PROFILES];
