import { fetchAll } from '@/lib/supabase/fetch-all';

export interface AiUsageSummary {
  /** False until migration 009_ai_usage.sql is applied */
  available: boolean;
  since: string;
  calls: number;
  costUsd: number;
  byTask: { task: string; calls: number; costUsd: number }[];
}

interface UsageRow {
  task: string;
  cost_usd: number | string | null;
}

/** Group usage rows by task, most expensive first. */
export function summarizeUsage(rows: UsageRow[]): Pick<AiUsageSummary, 'calls' | 'costUsd' | 'byTask'> {
  const byTask = new Map<string, { task: string; calls: number; costUsd: number }>();
  for (const r of rows) {
    const t = byTask.get(r.task) ?? { task: r.task, calls: 0, costUsd: 0 };
    t.calls += 1;
    t.costUsd += Number(r.cost_usd) || 0;
    byTask.set(r.task, t);
  }
  const list = Array.from(byTask.values()).sort((a, b) => b.costUsd - a.costUsd || b.calls - a.calls);
  return {
    calls: rows.length,
    costUsd: list.reduce((s, t) => s + t.costUsd, 0),
    byTask: list,
  };
}

/** AI calls and cost this calendar month (UTC), by task. Never throws. */
export async function loadAiUsage(now = new Date()): Promise<AiUsageSummary> {
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const empty: AiUsageSummary = { available: false, since, calls: 0, costUsd: 0, byTask: [] };
  try {
    // Imported here so summarizeUsage stays testable without Supabase env.
    const { createServiceClient } = await import('@/lib/supabase/client');
    const supabase = createServiceClient();
    const rows = await fetchAll<UsageRow>((from, to) =>
      supabase
        .from('ai_processing_logs')
        .select('task, cost_usd')
        .not('task', 'is', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, to)
    );
    return { available: true, since, ...summarizeUsage(rows) };
  } catch (error) {
    // Most likely the usage columns are not there yet (migration 009).
    console.warn('[AI usage] Summary unavailable:', (error as { message?: string })?.message ?? error);
    return empty;
  }
}
