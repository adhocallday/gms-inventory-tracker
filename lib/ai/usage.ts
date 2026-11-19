/**
 * Token usage and cost logging for every Claude call.
 *
 * Rows go into `ai_processing_logs` (usage columns added by migration
 * 009_ai_usage.sql). Logging never throws: if the table or columns are not
 * there yet, it logs once to the console and stops trying for this process.
 */
import { MODEL_PRICING, type Effort, type TaskType } from './models';

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export interface UsageRecord {
  task: TaskType | string;
  /** The model that served the call (`message.model`; may be a fallback). */
  model: string;
  effort?: Effort | null;
  usage: TokenUsage;
  latencyMs: number;
  stopReason: string | null;
  tourId?: string | null;
  /** parsed_documents.id or source hash, when the call is about one document. */
  docId?: string | null;
}

/** USD cost of one call's usage. Unknown models cost 0 (and are flagged in logs). */
export function calculateCostUsd(model: string, usage: TokenUsage): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const promptTokens = usage.input_tokens + cacheWrite + cacheRead;
  const rates =
    pricing.long && pricing.longContextThreshold && promptTokens > pricing.longContextThreshold
      ? pricing.long
      : pricing;
  const cost =
    (usage.input_tokens * rates.input +
      usage.output_tokens * rates.output +
      cacheWrite * rates.cacheWrite +
      cacheRead * rates.cacheRead) /
    1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function formatUsage(rec: Pick<UsageRecord, 'model' | 'usage'>): string {
  const u = rec.usage;
  return (
    `in=${u.input_tokens} out=${u.output_tokens} ` +
    `cache_write=${u.cache_creation_input_tokens ?? 0} cache_read=${u.cache_read_input_tokens ?? 0} ` +
    `cost=$${calculateCostUsd(rec.model, u).toFixed(4)}`
  );
}

let disabledReason: string | null = null;

/** Missing table or column: PostgREST PGRST204/PGRST205, Postgres 42P01/42703. */
function isSchemaError(error: { code?: string; message?: string }): boolean {
  return (
    ['PGRST204', 'PGRST205', '42P01', '42703'].includes(error.code ?? '') ||
    /column|relation|schema cache/i.test(error.message ?? '')
  );
}

export function usageRow(rec: UsageRecord) {
  return {
    status: 'ok',
    task: rec.task,
    model: rec.model,
    effort: rec.effort ?? null,
    input_tokens: rec.usage.input_tokens,
    output_tokens: rec.usage.output_tokens,
    cache_creation_input_tokens: rec.usage.cache_creation_input_tokens ?? 0,
    cache_read_input_tokens: rec.usage.cache_read_input_tokens ?? 0,
    cost_usd: calculateCostUsd(rec.model, rec.usage),
    latency_ms: Math.round(rec.latencyMs),
    stop_reason: rec.stopReason,
    tour_id: rec.tourId ?? null,
    doc_id: rec.docId ?? null,
  };
}

/** Record one call. Never throws; safe to await or fire and forget. */
export async function logUsage(rec: UsageRecord): Promise<void> {
  console.log(`[AI usage] ${rec.task} ${rec.model} ${formatUsage(rec)} ${rec.latencyMs}ms stop=${rec.stopReason}`);
  if (!MODEL_PRICING[rec.model]) {
    console.warn(`[AI usage] No pricing for ${rec.model}; cost logged as 0`);
  }
  if (disabledReason || process.env.AI_USAGE_LOG === 'off') return;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  try {
    const { createServiceClient } = await import('@/lib/supabase/client');
    const { error } = await createServiceClient().from('ai_processing_logs').insert(usageRow(rec));
    if (error) {
      if (isSchemaError(error)) {
        disabledReason = error.message;
        console.warn(`[AI usage] Usage columns missing (apply migration 009_ai_usage.sql); not logging: ${error.message}`);
      } else {
        console.warn(`[AI usage] Insert failed: ${error.message}`);
      }
    }
  } catch (e) {
    console.warn('[AI usage] Logging failed:', (e as Error).message);
  }
}

/** Test hook */
export function __resetUsageLogger() {
  disabledReason = null;
}
