/**
 * Projection chat: the suggest_overrides tool, its parsing, and validation
 * of the client-supplied conversation history.
 *
 * Overrides arrive as tool_use blocks (strict schema), not text tags, so a
 * tag split across stream chunks can no longer lose them. Current values are
 * filled in server-side from the real projection, never taken from the model.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { currentValueFor, type CurrentSkuValues } from '@/lib/projections/current-values';

export const SUGGEST_OVERRIDES_TOOL_NAME = 'suggest_overrides';

/**
 * A proposed change to forecast units on the projection sheet.
 * `size: null` targets the SKU's total forecast units. `bucket` is always
 * null: these are the unit overrides the sheet reads (bucket null).
 */
export interface SuggestedOverride {
  sku: string;
  productName: string;
  size: string | null;
  bucket: null;
  currentValue: number;
  suggestedValue: number;
  reason: string;
}

export const SUGGEST_OVERRIDES_TOOL = {
  name: SUGGEST_OVERRIDES_TOOL_NAME,
  description:
    'Propose changes to forecast units on the projection sheet. The user reviews and applies them; nothing changes until they do. ' +
    'Call this only when the user asks for an adjustment. Use a SKU from CURRENT PROJECTION; set size to null to change the SKU total, ' +
    'or to one of that SKU\'s sizes to change that size. suggestedValue is the new whole number of units.',
  strict: true,
  input_schema: {
    type: 'object' as const,
    properties: {
      overrides: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            sku: { type: 'string' },
            size: { type: ['string', 'null'] },
            suggestedValue: { type: 'integer' },
            reason: { type: 'string', description: 'Short reason, e.g. "+20% per request"' },
          },
          required: ['sku', 'size', 'suggestedValue', 'reason'],
          additionalProperties: false,
        },
      },
    },
    required: ['overrides'],
    additionalProperties: false,
  },
} satisfies Anthropic.Tool;

interface RawOverride {
  sku?: unknown;
  size?: unknown;
  suggestedValue?: unknown;
  reason?: unknown;
}

/**
 * Turn suggest_overrides tool_use blocks into validated overrides with real
 * current values. Drops entries for unknown SKUs or sizes and negative or
 * non-integer values. Later entries for the same target replace earlier ones.
 */
export function parseOverrideToolUses(
  content: ReadonlyArray<{ type: string; name?: string; input?: unknown }>,
  currentValues: CurrentSkuValues[]
): { overrides: SuggestedOverride[]; rejected: string[] } {
  const byTarget = new Map<string, SuggestedOverride>();
  const rejected: string[] = [];

  for (const block of content) {
    if (block.type !== 'tool_use' || block.name !== SUGGEST_OVERRIDES_TOOL_NAME) continue;
    const list = (block.input as { overrides?: unknown })?.overrides;
    if (!Array.isArray(list)) {
      rejected.push('tool input has no overrides array');
      continue;
    }
    for (const raw of list as RawOverride[]) {
      const sku = typeof raw?.sku === 'string' ? raw.sku.trim() : '';
      const size = raw?.size === null || raw?.size === undefined ? null : String(raw.size).trim() || null;
      const value = raw?.suggestedValue;
      const row = currentValues.find(v => v.sku === sku);
      if (!row) {
        rejected.push(`unknown SKU ${sku || '(empty)'}`);
        continue;
      }
      const current = currentValueFor(currentValues, sku, size);
      if (current === undefined) {
        rejected.push(`${sku} has no size ${size}`);
        continue;
      }
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
        rejected.push(`${sku} ${size ?? 'total'}: invalid value ${String(value)}`);
        continue;
      }
      byTarget.set(`${sku}::${size ?? ''}`, {
        sku,
        productName: row.name,
        size,
        bucket: null,
        currentValue: current,
        suggestedValue: value,
        reason: typeof raw.reason === 'string' ? raw.reason.slice(0, 300) : '',
      });
    }
  }
  return { overrides: Array.from(byTarget.values()), rejected };
}

export const MAX_HISTORY_MESSAGES = 40;
export const MAX_MESSAGE_CHARS = 8000;

export type HistoryResult =
  | { ok: true; messages: Anthropic.MessageParam[] }
  | { ok: false; error: string };

/**
 * Validate client-supplied chat history: an array of {role, content} with
 * role 'user' or 'assistant' and non-empty string content. Keeps the most
 * recent MAX_HISTORY_MESSAGES and drops leading assistant turns (the API
 * needs a user turn first).
 */
export function validateHistory(history: unknown): HistoryResult {
  if (history === undefined || history === null) return { ok: true, messages: [] };
  if (!Array.isArray(history)) return { ok: false, error: 'history must be an array' };

  const messages: Anthropic.MessageParam[] = [];
  for (let i = 0; i < history.length; i++) {
    const m = history[i] as { role?: unknown; content?: unknown };
    if (!m || typeof m !== 'object') return { ok: false, error: `history[${i}] must be an object` };
    if (m.role !== 'user' && m.role !== 'assistant') {
      return { ok: false, error: `history[${i}].role must be "user" or "assistant"` };
    }
    if (typeof m.content !== 'string') return { ok: false, error: `history[${i}].content must be a string` };
    if (m.content.length > MAX_MESSAGE_CHARS) {
      return { ok: false, error: `history[${i}].content is too long` };
    }
    if (!m.content.trim()) continue;
    messages.push({ role: m.role, content: m.content });
  }

  const recent = messages.slice(-MAX_HISTORY_MESSAGES);
  while (recent.length && recent[0].role !== 'user') recent.shift();
  return { ok: true, messages: recent };
}

/** Compact current-projection block for the chat system prompt. */
export function currentProjectionBlock(
  values: CurrentSkuValues[],
  inputs: { expectedAttendance: number; expectedPerHead: number }
): string {
  const rows = values
    .filter(v => v.units > 0 || v.overridden)
    .sort((a, b) => b.units - a.units || a.sku.localeCompare(b.sku))
    .map(v => ({ sku: v.sku, name: v.name, price: v.price, units: v.units, sizes: v.sizes, ...(v.overridden ? { overridden: true } : {}) }));
  return (
    `CURRENT PROJECTION (forecast units shown on the projection sheet for the selected scenario)\n` +
    `Expected attendance: ${Math.round(Number(inputs.expectedAttendance) || 0)}; expected per-head: $${(Number(inputs.expectedPerHead) || 0).toFixed(2)}\n` +
    JSON.stringify(rows)
  );
}
