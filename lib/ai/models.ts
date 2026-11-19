/**
 * GMS AI model configuration.
 *
 * The only place model IDs live. Every Claude call picks a task profile here:
 * model, effort, max_tokens, thinking display and whether to send the
 * server-side refusal fallback. Pricing for cost logging is here too.
 *
 * Extraction ('document-parsing') stays on Sonnet 5.5 medium until the
 * extraction eval (scripts/eval-extraction-models.ts, report in
 * docs/ai-model-eval.md) picks per-doc-type models.
 */

/** Current Claude models */
export const MODELS = {
  /** Claude Opus 5.5: deepest reasoning and vision. Effort defaults to medium, so always set it. */
  OPUS: 'claude-opus-5-5',
  /** Claude Sonnet 5.5: balanced, interactive work and document extraction. */
  SONNET: 'claude-sonnet-5-5',
  /** Claude Haiku 5.5: fast and cheap. Thinks by default; no server-side fallback. */
  HAIKU: 'claude-haiku-5-5',
} as const;

export type ModelName = (typeof MODELS)[keyof typeof MODELS];

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export type ThinkingDisplay = 'omitted' | 'summarized';

export type TaskType =
  // Documents
  | 'document-classification'
  | 'document-parsing'
  | 'admin-parsing'
  // Grab sheets
  | 'grab-sheet-detect'
  | 'grab-sheet-verify'
  // Projections
  | 'projection-analysis'
  | 'recommendations'
  | 'size-distribution'
  | 'comprehensive-projections'
  | 'chat';

export interface ModelProfile {
  model: ModelName;
  effort: Effort;
  maxTokens: number;
  /** "summarized" on streamed calls whose thinking is shown as progress. */
  thinkingDisplay: ThinkingDisplay;
}

const profile = (
  model: ModelName,
  effort: Effort,
  maxTokens: number,
  thinkingDisplay: ThinkingDisplay = 'omitted'
): ModelProfile => ({ model, effort, maxTokens, thinkingDisplay });

/**
 * Task → profile. max_tokens includes thinking, so classification keeps
 * 2048 even though its answer is short.
 */
export const MODEL_PROFILES: Record<TaskType, ModelProfile> = {
  'document-classification': profile(MODELS.HAIKU, 'low', 2048),
  // Pending the §2 eval: Sonnet 5.5 medium vs Opus 5.5 low/medium per doc type.
  'document-parsing': profile(MODELS.SONNET, 'medium', 32000),
  'admin-parsing': profile(MODELS.SONNET, 'medium', 32000),

  'grab-sheet-detect': profile(MODELS.OPUS, 'medium', 32000),
  'grab-sheet-verify': profile(MODELS.HAIKU, 'low', 2048),

  // Money decisions: effort set explicitly (Opus 5.5 defaults to medium).
  'projection-analysis': profile(MODELS.OPUS, 'high', 64000, 'summarized'),
  'recommendations': profile(MODELS.OPUS, 'high', 64000),
  'size-distribution': profile(MODELS.OPUS, 'high', 64000),
  'comprehensive-projections': profile(MODELS.OPUS, 'high', 64000, 'summarized'),

  // Interactive; summarized thinking so the stream shows progress.
  'chat': profile(MODELS.SONNET, 'medium', 16000, 'summarized'),
};

export function getModelProfile(task: TaskType): ModelProfile {
  return MODEL_PROFILES[task];
}

/** Model ID for a task (kept for existing callers). */
export function getModelForTask(task: TaskType): ModelName {
  return MODEL_PROFILES[task].model;
}

/**
 * Server-side refusal fallback (`fallbacks: "default"`, beta header below).
 * Opus 5.5 and Sonnet 5.5 support it; Haiku 5.5 has none, so callers handle
 * `stop_reason: "refusal"` themselves.
 */
export const SERVER_FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export function supportsServerFallback(model: string): boolean {
  return model === MODELS.OPUS || model === MODELS.SONNET;
}

/** Spread into a beta messages request: betas + fallbacks where supported. */
export function fallbackParams(model: string): { betas?: string[]; fallbacks?: 'default' } {
  return supportsServerFallback(model)
    ? { betas: [SERVER_FALLBACK_BETA], fallbacks: 'default' }
    : {};
}

// ---------------------------------------------------------------------------
// Pricing (USD per million tokens, Anthropic first-party API).
// Cache writes are the 5-minute TTL rate. Fallback targets are included so a
// call served by a fallback model is still costed.
// ---------------------------------------------------------------------------

export interface ModelPricing {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
  /** Prompts above this many input tokens bill at `long` rates. */
  longContextThreshold?: number;
  long?: Omit<ModelPricing, 'longContextThreshold' | 'long'>;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  [MODELS.OPUS]: { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 },
  [MODELS.SONNET]: { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
  [MODELS.HAIKU]: {
    input: 0.1,
    output: 0.5,
    cacheWrite: 0.125,
    cacheRead: 0.01,
    longContextThreshold: 100_000,
    long: { input: 0.5, output: 2.5, cacheWrite: 0.625, cacheRead: 0.05 },
  },
  // Server-side fallback targets
  'claude-opus-5': { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  'claude-opus-4-8': { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  'claude-sonnet-5': { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
};

export const MODEL_INFO: Record<ModelName, { name: string; tier: 'opus' | 'sonnet' | 'haiku' }> = {
  [MODELS.OPUS]: { name: 'Claude Opus 5.5', tier: 'opus' },
  [MODELS.SONNET]: { name: 'Claude Sonnet 5.5', tier: 'sonnet' },
  [MODELS.HAIKU]: { name: 'Claude Haiku 5.5', tier: 'haiku' },
};

/** Human-readable model name */
export function getModelName(modelId: string): string {
  return MODEL_INFO[modelId as ModelName]?.name || modelId;
}
