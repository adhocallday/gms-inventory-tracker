import { describe, expect, it } from 'vitest';
import {
  MODELS,
  MODEL_PRICING,
  MODEL_PROFILES,
  fallbackParams,
  getModelForTask,
  getModelProfile,
  supportsServerFallback,
  type TaskType,
} from './models';

describe('model profiles', () => {
  it('maps every task to the planned model and effort', () => {
    const expected: Record<TaskType, [string, string]> = {
      'document-classification': [MODELS.HAIKU, 'low'],
      'document-parsing': [MODELS.SONNET, 'medium'],
      'admin-parsing': [MODELS.SONNET, 'medium'],
      'grab-sheet-detect': [MODELS.OPUS, 'medium'],
      'grab-sheet-verify': [MODELS.HAIKU, 'low'],
      'projection-analysis': [MODELS.OPUS, 'medium'],
      'recommendations': [MODELS.OPUS, 'high'],
      'size-distribution': [MODELS.OPUS, 'high'],
      'comprehensive-projections': [MODELS.OPUS, 'medium'],
      'chat': [MODELS.SONNET, 'medium'],
    };
    for (const [task, [model, effort]] of Object.entries(expected) as [TaskType, [string, string]][]) {
      expect(getModelProfile(task).model, task).toBe(model);
      expect(getModelProfile(task).effort, task).toBe(effort);
      expect(getModelForTask(task)).toBe(model);
    }
    expect(Object.keys(MODEL_PROFILES).sort()).toEqual(Object.keys(expected).sort());
  });

  it('uses current model IDs only', () => {
    expect(MODELS).toEqual({ OPUS: 'claude-opus-5-5', SONNET: 'claude-sonnet-5-5', HAIKU: 'claude-haiku-5-5' });
  });

  it('leaves room for thinking on Haiku classification', () => {
    expect(getModelProfile('document-classification').maxTokens).toBe(2048);
  });

  it('shows summarized thinking on the streamed tasks', () => {
    expect(getModelProfile('chat').thinkingDisplay).toBe('summarized');
    expect(getModelProfile('projection-analysis').thinkingDisplay).toBe('summarized');
    expect(getModelProfile('document-parsing').thinkingDisplay).toBe('omitted');
  });

  it('sends server-side fallbacks on Opus and Sonnet only', () => {
    expect(supportsServerFallback(MODELS.OPUS)).toBe(true);
    expect(supportsServerFallback(MODELS.SONNET)).toBe(true);
    expect(supportsServerFallback(MODELS.HAIKU)).toBe(false);
    expect(fallbackParams(MODELS.SONNET)).toEqual({ betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
    expect(fallbackParams(MODELS.HAIKU)).toEqual({});
  });

  it('has pricing for every profile model', () => {
    for (const p of Object.values(MODEL_PROFILES)) expect(MODEL_PRICING[p.model]).toBeDefined();
  });
});
