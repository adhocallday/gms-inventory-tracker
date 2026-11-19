import { describe, expect, it } from 'vitest';
import { calculateCostUsd, usageRow } from './usage';
import { summarizeUsage } from './usage-summary';

describe('calculateCostUsd', () => {
  it('prices Opus 5.5 input, output, cache writes and reads', () => {
    // 10k in @ $4, 2k out @ $20, 20k cache write @ $5, 30k cache read @ $0.20
    const cost = calculateCostUsd('claude-opus-5-5', {
      input_tokens: 10_000,
      output_tokens: 2_000,
      cache_creation_input_tokens: 20_000,
      cache_read_input_tokens: 30_000,
    });
    expect(cost).toBeCloseTo(0.04 + 0.04 + 0.1 + 0.006, 6);
  });

  it('prices Sonnet 5.5', () => {
    expect(calculateCostUsd('claude-sonnet-5-5', { input_tokens: 1_000_000, output_tokens: 100_000 })).toBeCloseTo(3, 6);
  });

  it('prices Haiku 5.5 at the short rate up to 100K prompt tokens', () => {
    expect(calculateCostUsd('claude-haiku-5-5', { input_tokens: 100_000, output_tokens: 1_000 })).toBeCloseTo(0.01 + 0.0005, 6);
  });

  it('prices Haiku 5.5 at the long rate above 100K prompt tokens (cache tokens count)', () => {
    const cost = calculateCostUsd('claude-haiku-5-5', {
      input_tokens: 60_000,
      output_tokens: 1_000,
      cache_read_input_tokens: 50_000,
    });
    expect(cost).toBeCloseTo(0.03 + 0.0025 + 0.0025, 6);
  });

  it('prices a fallback model and returns 0 for unknown models', () => {
    expect(calculateCostUsd('claude-opus-4-8', { input_tokens: 1_000_000, output_tokens: 0 })).toBe(5);
    expect(calculateCostUsd('claude-unknown', { input_tokens: 1_000_000, output_tokens: 0 })).toBe(0);
  });

  it('treats null cache counts as zero', () => {
    expect(
      calculateCostUsd('claude-sonnet-5-5', {
        input_tokens: 1_000,
        output_tokens: 0,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
      })
    ).toBeCloseTo(0.002, 6);
  });
});

describe('usageRow', () => {
  it('builds the ai_processing_logs row', () => {
    const row = usageRow({
      task: 'chat',
      model: 'claude-sonnet-5-5',
      effort: 'medium',
      usage: { input_tokens: 1000, output_tokens: 100, cache_read_input_tokens: 5000 },
      latencyMs: 1234.4,
      stopReason: 'end_turn',
      tourId: 't1',
    });
    expect(row).toMatchObject({
      task: 'chat',
      model: 'claude-sonnet-5-5',
      input_tokens: 1000,
      output_tokens: 100,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 5000,
      latency_ms: 1234,
      stop_reason: 'end_turn',
      tour_id: 't1',
      doc_id: null,
    });
    expect(row.cost_usd).toBeCloseTo(0.002 + 0.001 + 0.001, 6);
  });
});

describe('summarizeUsage', () => {
  it('groups by task, most expensive first', () => {
    const s = summarizeUsage([
      { task: 'chat', cost_usd: '0.01' },
      { task: 'projection-analysis', cost_usd: 0.5 },
      { task: 'chat', cost_usd: 0.02 },
    ]);
    expect(s.calls).toBe(3);
    expect(s.costUsd).toBeCloseTo(0.53, 6);
    expect(s.byTask.map(t => [t.task, t.calls])).toEqual([['projection-analysis', 1], ['chat', 2]]);
  });
});
