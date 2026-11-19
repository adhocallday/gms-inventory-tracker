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
  // Chosen by the extraction eval (docs/ai-model-eval.md, 2026-11-19): Sonnet 5.5 at
  // medium matched Opus 5.5 (low and medium) on every document at about half the cost.
  'document-parsing': profile(MODELS.SONNET, 'medium', 32000),
  'admin-parsing': profile(MODELS.SONNET, 'medium', 32000),

  'grab-sheet-detect': profile(MODELS.OPUS, 'medium', 32000),
  'grab-sheet-verify': profile(MODELS.HAIKU, 'low', 2048),

  // Money decisions: effort set explicitly (Opus 5.5 defaults to medium).
  // The long whole-tour runs use medium: at high they took 3-3.7 min, near the
  // 300 s route limit (2026-11-19). The shorter calls stay at high.
  'projection-analysis': profile(MODELS.OPUS, 'medium', 64000, 'summarized'),
  'recommendations': profile(MODELS.OPUS, 'high', 64000),
  'size-distribution': profile(MODELS.OPUS, 'high', 64000),
  'comprehensive-projections': profile(MODELS.OPUS, 'medium', 64000, 'summarized'),

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
/**
 * Grab-sheet calls, derived from the task profiles and pricing above so model IDs
 * and prices live in one place.
 */
function grabSheetProfile(task: 'grab-sheet-detect' | 'grab-sheet-verify') {
  const { model, effort, maxTokens } = MODEL_PROFILES[task];
  return {
    model,
    effort,
    maxTokens,
    // Server-side refusal fallback exists for Opus/Sonnet, not Haiku.
    serverFallback: model !== MODELS.HAIKU,
    price: MODEL_PRICING[model],
  };
}

export const GRAB_SHEET_PROFILES = {
  detect: grabSheetProfile('grab-sheet-detect'),
  verify: grabSheetProfile('grab-sheet-verify'),
};

export type GrabSheetProfile = (typeof GRAB_SHEET_PROFILES)[keyof typeof GRAB_SHEET_PROFILES];
