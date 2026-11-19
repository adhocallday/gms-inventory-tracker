/**
 * Projection agent: analysis, recommendations, full projections and size
 * curves on Opus 5.5 (effort high), plus the non-streaming chat on Sonnet 5.5.
 *
 * Every JSON-returning call uses structured outputs (output_config.format),
 * so there is no code-fence parsing. Tour data goes in a cached system block
 * (lib/ai/projection-prompt.ts); per-call inputs go in the user message.
 * Records keyed by size or SKU are requested as arrays (structured outputs
 * need fixed keys) and converted back to the shapes the UI uses.
 */
import type Anthropic from '@anthropic-ai/sdk';
import {
  getAnthropicClient,
  readTextOrThrow,
  strictSchema,
  toAIParseError,
  AIParseError,
  type JsonSchema,
} from './claude-client';
import { fallbackParams, getModelName, getModelProfile, type TaskType } from './models';
import { logUsage } from './usage';
import { projectionInputs, projectionSystem } from './projection-prompt';
import {
  SUGGEST_OVERRIDES_TOOL,
  currentProjectionBlock,
  parseOverrideToolUses,
  type SuggestedOverride,
} from './chat-tools';
import type { CurrentSkuValues } from '@/lib/projections/current-values';

// Types
export interface ProjectionContext {
  tourId: string;
  tourName: string;
  productSummary: any[]; // from product_summary_view (size-level rows)
  showSummary: any[]; // from show_summary_view
  inventoryBalances: any[];
  poOpenQuantities: any[];
  expectedAttendance: number;
  expectedPerHead: number;
  warehouseLocations?: Array<{
    id: string;
    name: string;
    location_type: string;
    display_order: number;
  }>;
}

export interface AIRecommendation {
  sku: string;
  size?: string | null;
  bucket?: string | null;
  recommendedUnits: number;
  reasoning: string;
  confidence: number;
  type: 'baseline' | 'size_adjustment' | 'risk_mitigation' | 'product_priority';
  supportingData?: any;
}

export interface ProjectionAnalysis {
  sizeCurveRecommendations: {
    sku: string;
    historicalCurve: Record<string, number>;
    recommendedCurve: Record<string, number>;
    reasoning: string;
  }[];
  productPerformance: {
    topPerformers: { sku: string; totalSold: number; margin: number; reasoning: string }[];
    underperformers: { sku: string; totalSold: number; margin: number; reasoning: string }[];
    opportunities: { sku: string; reasoning: string }[];
  };
  stockoutRisks: {
    sku: string;
    size?: string | null;
    forecastDemand: number;
    currentSupply: number;
    riskLevel: 'critical' | 'high' | 'medium' | 'low';
    recommendation: string;
  }[];
}

export interface ComprehensiveProjection {
  sku: string;
  baselineUnits: number;
  retailPrice: number;
  sizeBreakdown: Record<string, number>; // {S: 50, M: 100, ...}
  warehouseAllocations: Record<string, number>; // {Road: 500, Warehouse: 200, ...}
  confidence: number;
  reasoning: string;
}

export interface SizeAnalysisResult {
  analysis: {
    [sku: string]: {
      historicalCurve: Record<string, number>;
      recommendedCurve: Record<string, number>;
      confidence: number;
      reasoning: string;
      insights: string[];
    };
  };
  globalInsights: {
    audienceDemographic: string;
    sizeTrends: string[];
    recommendations: string[];
  };
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const STR = { type: 'string' };
const NUM = { type: 'number' };
const INT = { type: 'integer' };
const NULLABLE_STR = { type: ['string', 'null'] };

const obj = (properties: Record<string, unknown>): JsonSchema => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
});
const arr = (items: unknown): JsonSchema => ({ type: 'array', items });

const CURVE = arr(obj({ size: STR, share: { type: 'number', description: '0-1; shares sum to 1' } }));

const ANALYSIS_SCHEMA = obj({
  sizeCurveRecommendations: arr(obj({ sku: STR, historicalCurve: CURVE, recommendedCurve: CURVE, reasoning: STR })),
  productPerformance: obj({
    topPerformers: arr(obj({ sku: STR, totalSold: NUM, margin: NUM, reasoning: STR })),
    underperformers: arr(obj({ sku: STR, totalSold: NUM, margin: NUM, reasoning: STR })),
    opportunities: arr(obj({ sku: STR, reasoning: STR })),
  }),
  stockoutRisks: arr(
    obj({
      sku: STR,
      size: NULLABLE_STR,
      forecastDemand: NUM,
      currentSupply: NUM,
      riskLevel: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
      recommendation: STR,
    })
  ),
});

const RECOMMENDATIONS_SCHEMA = obj({
  recommendations: arr(
    obj({
      sku: STR,
      size: NULLABLE_STR,
      bucket: NULLABLE_STR,
      recommendedUnits: INT,
      reasoning: STR,
      confidence: { type: 'number', description: '0-1' },
      type: { type: 'string', enum: ['baseline', 'size_adjustment', 'risk_mitigation', 'product_priority'] },
    })
  ),
});

function projectionsSchema(locations: string[]): JsonSchema {
  return obj({
    projections: arr(
      obj({
        sku: STR,
        baselineUnits: INT,
        retailPrice: NUM,
        sizeBreakdown: arr(obj({ size: STR, units: INT })),
        warehouseAllocations: arr(obj({ location: { type: 'string', enum: locations }, units: INT })),
        confidence: { type: 'number', description: '0-1' },
        reasoning: STR,
      })
    ),
  });
}

const SIZE_ANALYSIS_SCHEMA = obj({
  analysis: arr(
    obj({
      sku: STR,
      historicalCurve: CURVE,
      recommendedCurve: CURVE,
      confidence: { type: 'number', description: '0-1' },
      reasoning: STR,
      insights: arr(STR),
    })
  ),
  globalInsights: obj({ audienceDemographic: STR, sizeTrends: arr(STR), recommendations: arr(STR) }),
});

// ---------------------------------------------------------------------------
// Converters (array shapes → the record shapes the UI uses)
// ---------------------------------------------------------------------------

type Pair<K extends string> = { size?: string; location?: string } & Record<K, number>;

function toRecord<K extends string>(list: Pair<K>[] | undefined, key: 'size' | 'location', value: K) {
  const out: Record<string, number> = {};
  for (const item of list ?? []) {
    const k = item[key];
    if (k) out[k] = Number(item[value]) || 0;
  }
  return out;
}

/** Normalize a curve to sum to 1 (logs when the model's curve was off). */
export function normalizeCurve(curve: Record<string, number>, label: string): Record<string, number> {
  const sum = Object.values(curve).reduce((s, v) => s + (v || 0), 0);
  if (sum > 0 && Math.abs(sum - 1) > 0.05) {
    console.warn(`[ProjectionAgent] ${label} sums to ${sum.toFixed(3)}; normalizing`);
    return Object.fromEntries(Object.entries(curve).map(([k, v]) => [k, v / sum]));
  }
  return curve;
}

function toAnalysis(raw: any): ProjectionAnalysis {
  return {
    sizeCurveRecommendations: (raw.sizeCurveRecommendations ?? []).map((r: any) => ({
      sku: r.sku,
      historicalCurve: toRecord(r.historicalCurve, 'size', 'share'),
      recommendedCurve: normalizeCurve(toRecord(r.recommendedCurve, 'size', 'share'), `${r.sku} recommended curve`),
      reasoning: r.reasoning,
    })),
    productPerformance: raw.productPerformance,
    stockoutRisks: raw.stockoutRisks ?? [],
  };
}

function toProjections(raw: any): ComprehensiveProjection[] {
  return (raw.projections ?? []).map((p: any) => {
    const proj: ComprehensiveProjection = {
      sku: p.sku,
      baselineUnits: p.baselineUnits,
      retailPrice: p.retailPrice,
      sizeBreakdown: toRecord(p.sizeBreakdown, 'size', 'units'),
      warehouseAllocations: toRecord(p.warehouseAllocations, 'location', 'units'),
      confidence: p.confidence,
      reasoning: p.reasoning,
    };
    const sizeTotal = Object.values(proj.sizeBreakdown).reduce((s, v) => s + v, 0);
    const whTotal = Object.values(proj.warehouseAllocations).reduce((s, v) => s + v, 0);
    if (Object.keys(proj.sizeBreakdown).length && Math.abs(sizeTotal - proj.baselineUnits) > 1) {
      console.warn(`[ProjectionAgent] Size breakdown mismatch for ${proj.sku}: ${sizeTotal} vs ${proj.baselineUnits}`);
    }
    if (Object.keys(proj.warehouseAllocations).length && Math.abs(whTotal - proj.baselineUnits) > 1) {
      console.warn(`[ProjectionAgent] Warehouse allocation mismatch for ${proj.sku}: ${whTotal} vs ${proj.baselineUnits}`);
    }
    return proj;
  });
}

function toSizeAnalysis(raw: any): SizeAnalysisResult {
  const analysis: SizeAnalysisResult['analysis'] = {};
  for (const a of raw.analysis ?? []) {
    analysis[a.sku] = {
      historicalCurve: normalizeCurve(toRecord(a.historicalCurve, 'size', 'share'), `${a.sku} historical curve`),
      recommendedCurve: normalizeCurve(toRecord(a.recommendedCurve, 'size', 'share'), `${a.sku} recommended curve`),
      confidence: a.confidence,
      reasoning: a.reasoning,
      insights: a.insights ?? [],
    };
  }
  return { analysis, globalInsights: raw.globalInsights };
}

// ---------------------------------------------------------------------------
// Task definitions (shared with the streaming agent)
// ---------------------------------------------------------------------------

export interface ProjectionTask<T> {
  task: TaskType;
  /** Used in error messages */
  what: string;
  user: string;
  schema: JsonSchema;
  transform: (raw: any) => T;
}

export function analysisTask(context: ProjectionContext): ProjectionTask<ProjectionAnalysis> {
  return {
    task: 'projection-analysis',
    what: 'analysis',
    schema: ANALYSIS_SCHEMA,
    transform: toAnalysis,
    user: `${projectionInputs(context)}

Analyze the tour data:
1. sizeCurveRecommendations: for each product with sized sales, the historical curve (share of units by size) and a recommended curve, with reasoning for any deviation.
2. productPerformance: the top 5 products by units and margin, underperformers (low sell-through or margin), and opportunities. margin is (avgPrice - unitCost) / avgPrice.
3. stockoutRisks: products or sizes whose forecast demand for the expected gross exceeds supply (onHand + onOrder), with a risk level and a specific recommendation.`,
  };
}

export function recommendationsTask(
  context: ProjectionContext,
  constraints?: { maxBudget?: number; priorityProducts?: string[]; avoidStockouts?: boolean }
): ProjectionTask<AIRecommendation[]> {
  return {
    task: 'recommendations',
    what: 'recommendation',
    schema: RECOMMENDATIONS_SCHEMA,
    transform: raw => raw.recommendations ?? [],
    user: `${projectionInputs(context)}
CONSTRAINTS: ${JSON.stringify(constraints ?? {})}

Generate specific unit recommendations for this tour: a baseline unit forecast per product, and size adjustments (S/M/L/XL/2XL/3XL) where the curve should change. Give 2-3 sentences of reasoning and a 0-1 confidence for each. size and bucket are null when they do not apply.`,
  };
}

export function comprehensiveTask(context: ProjectionContext): ProjectionTask<ComprehensiveProjection[]> {
  const locations = (context.warehouseLocations ?? []).map(l => l.name);
  const names = locations.length ? locations : ['Road', 'Warehouse', 'Web'];
  return {
    task: 'comprehensive-projections',
    what: 'projection',
    schema: projectionsSchema(names),
    transform: toProjections,
    user: `${projectionInputs(context)}
WAREHOUSE LOCATIONS: ${names.join(', ')}

Generate projections with one entry per SKU:
1. baselineUnits: the SKU's share of tour-to-date gross, applied to the expected gross, divided by its avgPrice.
2. retailPrice: the SKU's avgPrice.
3. sizeBreakdown: baselineUnits split by the SKU's historical size shares; include every size the SKU sold. Units must sum to baselineUnits.
4. warehouseAllocations: baselineUnits split across every location listed (typically Road 50-60%, Warehouse 20-30%, Web 5-10%, others by regional demand). Units must sum to baselineUnits.
5. confidence: 0.9+ for SKUs with strong history, lower for sparse data; reasoning: 1-2 sentences.`,
  };
}

export function sizeAnalysisTask(context: ProjectionContext): ProjectionTask<SizeAnalysisResult> {
  return {
    task: 'size-distribution',
    what: 'size analysis',
    schema: SIZE_ANALYSIS_SCHEMA,
    transform: toSizeAnalysis,
    user: `Analyze the size distribution of every sized product in the tour data (products.sizes holds units sold per size).

Industry standard curve for reference: S 12%, M 26%, L 28%, XL 20%, 2XL 9%, 3XL 5%.

Data quality checks:
1. A near-uniform distribution (each size about 16-17%) is suspicious and may be test data.
2. M and L are usually the largest sizes.
3. Under 100 units total is low confidence.
4. Flag anomalies that suggest data issues.

For each SKU give:
- historicalCurve: actual share of units by size.
- recommendedCurve: if the history is suspicious, the industry curve; if realistic, the history with minor adjustments; if the sample is small, weighted toward the industry curve. Shares sum to 1.
- confidence: by sample size (under 50 units 0.3-0.5, 50-200 0.5-0.7, 200+ 0.7-0.9), minus 0.2 for suspicious patterns.
- reasoning that cites the actual unit counts, and insights flagging any data quality concerns.

Also give global insights: what the quantities suggest about the audience, size trends with quantities, and recommendations (say when the data quality calls for industry defaults).
Size keys: S, M, L, XL, 2XL, 3XL, or OS for non-sized items.`,
  };
}

// ---------------------------------------------------------------------------
// Request building and running
// ---------------------------------------------------------------------------

export function buildProjectionRequest<T>(context: ProjectionContext, t: ProjectionTask<T>) {
  const profile = getModelProfile(t.task);
  return {
    model: profile.model,
    max_tokens: profile.maxTokens,
    system: projectionSystem(context),
    messages: [{ role: 'user' as const, content: t.user }],
    thinking: { type: 'adaptive' as const, display: profile.thinkingDisplay },
    output_config: {
      effort: profile.effort,
      format: { type: 'json_schema' as const, schema: strictSchema(t.schema) },
    },
    ...fallbackParams(profile.model),
  };
}

/** Log usage, check stop_reason, parse and transform a finished projection message. */
export async function finishProjectionMessage<T>(
  message: Anthropic.Beta.BetaMessage,
  context: ProjectionContext,
  t: ProjectionTask<T>,
  startedAt: number
): Promise<T> {
  const profile = getModelProfile(t.task);
  await logUsage({
    task: t.task,
    model: message.model,
    effort: profile.effort,
    usage: message.usage,
    latencyMs: Date.now() - startedAt,
    stopReason: message.stop_reason,
    tourId: context.tourId,
  });
  const text = readTextOrThrow(message, profile.maxTokens, t.what);
  try {
    return t.transform(JSON.parse(text));
  } catch (e) {
    throw new AIParseError('Could not read the AI response', 'Invalid JSON: ' + (e as Error).message);
  }
}

export async function runProjectionTask<T>(context: ProjectionContext, t: ProjectionTask<T>): Promise<T> {
  const request = buildProjectionRequest(context, t);
  console.log(`[ProjectionAgent] ${t.task} using ${getModelName(request.model)} (effort ${request.output_config.effort})`);
  const started = Date.now();
  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await getAnthropicClient().beta.messages.stream(request).finalMessage();
  } catch (error) {
    throw toAIParseError(error);
  }
  return finishProjectionMessage(message, context, t, started);
}

export function analyzeProjectionData(context: ProjectionContext): Promise<ProjectionAnalysis> {
  return runProjectionTask(context, analysisTask(context));
}

export function generateRecommendations(
  context: ProjectionContext,
  constraints?: { maxBudget?: number; priorityProducts?: string[]; avoidStockouts?: boolean }
): Promise<AIRecommendation[]> {
  return runProjectionTask(context, recommendationsTask(context, constraints));
}

export function generateComprehensiveProjections(context: ProjectionContext): Promise<ComprehensiveProjection[]> {
  return runProjectionTask(context, comprehensiveTask(context));
}

export function analyzeSizeDistribution(context: ProjectionContext): Promise<SizeAnalysisResult> {
  return runProjectionTask(context, sizeAnalysisTask(context));
}

// ---------------------------------------------------------------------------
// Chat (shared request builder; streaming in streaming-projection-agent.ts)
// ---------------------------------------------------------------------------

const CHAT_ROLE = `You are the merchandise projection assistant in MerchFlow Tracker. You help the user understand and adjust the projection for this tour.

Answer questions from the tour data and the current projection; cite real figures and do not invent any. Be concise.

When the user asks to change the projection (for example "increase hoodies by 20%", "double the XL quantities", "we expect 50% more attendance"), first explain in a sentence or two what you will change, then call suggest_overrides with the new unit values. Compute each new value from the current value in CURRENT PROJECTION. Use size null to change a SKU's total units, or a size to change that size. The user reviews the suggestions before anything is applied. Do not call the tool for questions, analysis, or when the user cancels a change.`;

export function buildChatRequest(
  context: ProjectionContext,
  currentValues: CurrentSkuValues[],
  messages: Anthropic.MessageParam[]
) {
  const profile = getModelProfile('chat');
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    ...projectionSystem(context).map((b, i) => (i === 0 ? { ...b, text: CHAT_ROLE + '\n\n' + b.text } : b)),
    {
      type: 'text',
      text: currentProjectionBlock(currentValues, context),
      cache_control: { type: 'ephemeral' },
    },
  ];
  return {
    model: profile.model,
    max_tokens: profile.maxTokens,
    system,
    messages,
    tools: [SUGGEST_OVERRIDES_TOOL],
    tool_choice: { type: 'auto' as const },
    thinking: { type: 'adaptive' as const, display: profile.thinkingDisplay },
    output_config: { effort: profile.effort },
    ...fallbackParams(profile.model),
  };
}

export interface ChatReply {
  text: string;
  overrides: SuggestedOverride[];
}

/** Turn a finished chat message into reply text + validated overrides; logs usage. */
export async function finishChatMessage(
  message: Anthropic.Beta.BetaMessage,
  context: ProjectionContext,
  currentValues: CurrentSkuValues[],
  startedAt: number
): Promise<ChatReply> {
  await logUsage({
    task: 'chat',
    model: message.model,
    effort: getModelProfile('chat').effort,
    usage: message.usage,
    latencyMs: Date.now() - startedAt,
    stopReason: message.stop_reason,
    tourId: context.tourId,
  });
  if (message.stop_reason === 'refusal') {
    throw new AIParseError('The AI declined to answer this message', message.stop_details?.explanation ?? undefined);
  }
  const text = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');
  // A tool call cut off by max_tokens may carry partial input: don't suggest it.
  const { overrides, rejected } =
    message.stop_reason === 'max_tokens'
      ? { overrides: [], rejected: ['response cut off'] }
      : parseOverrideToolUses(message.content as any, currentValues);
  if (rejected.length) console.warn('[ProjectionAgent] Rejected override suggestions:', rejected);
  return { text, overrides };
}

/** Non-streaming chat (legacy /api/projections/chat). */
export async function chatWithAgent(
  messages: Anthropic.MessageParam[],
  context: ProjectionContext,
  currentValues: CurrentSkuValues[]
): Promise<ChatReply> {
  const request = buildChatRequest(context, currentValues, messages);
  const started = Date.now();
  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await getAnthropicClient().beta.messages.stream(request).finalMessage();
  } catch (error) {
    throw toAIParseError(error);
  }
  return finishChatMessage(message, context, currentValues, started);
}
