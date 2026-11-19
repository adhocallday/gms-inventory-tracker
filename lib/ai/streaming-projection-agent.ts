/**
 * Streaming Projection Agent
 *
 * Streams projection analysis and chat as SSE-friendly events. Thinking runs
 * with display "summarized" and its deltas are relayed as `thinking` events,
 * so the UI shows progress instead of a long pause. The structured JSON
 * result is parsed once the message completes; chat override suggestions come
 * from suggest_overrides tool_use blocks.
 *
 * @module streaming-projection-agent
 */

import type Anthropic from '@anthropic-ai/sdk';
import { AIParseError, getAnthropicClient, toAIParseError } from './claude-client';
import { getModelName } from './models';
import {
  analysisTask,
  buildChatRequest,
  buildProjectionRequest,
  comprehensiveTask,
  finishChatMessage,
  finishProjectionMessage,
  type ProjectionContext,
  type ProjectionTask,
} from './projection-agent';
import type { SuggestedOverride } from './chat-tools';
import type { CurrentSkuValues } from '@/lib/projections/current-values';

export type { SuggestedOverride } from './chat-tools';

/**
 * Stream event types for UI consumption
 */
export interface StreamEvent {
  type: 'phase' | 'thinking' | 'content' | 'json' | 'override_suggestion' | 'complete' | 'error';
  phase?: string;
  content?: string;
  data?: any;
  progress?: number;
  overrides?: SuggestedOverride[];
}

function errorMessage(error: unknown): string {
  const e = toAIParseError(error);
  if (e instanceof AIParseError) return e.message;
  return (e as Error)?.message || 'Stream failed';
}

/**
 * Stream a structured projection task: thinking summaries as `thinking`
 * events, progress as `phase` events, then the parsed result as `json`.
 */
async function* streamProjectionTask<T>(
  context: ProjectionContext,
  t: ProjectionTask<T>,
  phases: { start: string; writing: string; done: string }
): AsyncGenerator<StreamEvent> {
  const request = buildProjectionRequest(context, t);
  console.log(`[StreamingAgent] ${t.task} using ${getModelName(request.model)}`);
  yield { type: 'phase', phase: phases.start, progress: 5 };

  const started = Date.now();
  try {
    const stream = getAnthropicClient().beta.messages.stream(request);
    let thinkingStarted = false;
    let writingStarted = false;
    let skuCount = 0;
    const totalSkus = new Set((context.productSummary ?? []).map((r: any) => r.sku)).size || 10;

    for await (const event of stream) {
      if (event.type !== 'content_block_delta') continue;
      if (event.delta.type === 'thinking_delta') {
        if (!thinkingStarted) {
          thinkingStarted = true;
          yield { type: 'phase', phase: 'Reasoning about the data...', progress: 15 };
        }
        if (event.delta.thinking) yield { type: 'thinking', content: event.delta.thinking };
      } else if (event.delta.type === 'text_delta') {
        if (!writingStarted) {
          writingStarted = true;
          yield { type: 'phase', phase: phases.writing, progress: 60 };
        }
        const matches = event.delta.text.match(/"sku"/g);
        if (matches) {
          skuCount += matches.length;
          yield {
            type: 'phase',
            phase: `${phases.writing} (${skuCount} SKUs)`,
            progress: Math.min(60 + (skuCount / totalSkus) * 30, 90),
          };
        }
      }
    }

    const message = await stream.finalMessage();
    yield { type: 'phase', phase: 'Parsing results...', progress: 92 };
    const data = await finishProjectionMessage(message, context, t, started);
    yield { type: 'json', data };
    yield { type: 'phase', phase: phases.done, progress: 100 };
    yield { type: 'complete' };
  } catch (error) {
    console.error(`[StreamingAgent] ${t.task} failed:`, error);
    yield { type: 'error', content: errorMessage(error) };
  }
}

/**
 * Stream analysis with visible (summarized) reasoning
 */
export function streamAnalysis(context: ProjectionContext): AsyncGenerator<StreamEvent> {
  return streamProjectionTask(context, analysisTask(context), {
    start: 'Analyzing historical sales data...',
    writing: 'Writing analysis',
    done: 'Complete',
  });
}

/**
 * Stream comprehensive projections generation
 */
export function streamComprehensiveProjections(context: ProjectionContext): AsyncGenerator<StreamEvent> {
  return streamProjectionTask(context, comprehensiveTask(context), {
    start: 'Initializing projection model...',
    writing: 'Writing projections',
    done: 'Complete',
  });
}

/**
 * Stream chat: text deltas as `content`, thinking summaries as `thinking`,
 * then validated `override_suggestion` from suggest_overrides tool calls.
 */
export async function* streamChat(
  messages: Anthropic.MessageParam[],
  context: ProjectionContext,
  currentValues: CurrentSkuValues[]
): AsyncGenerator<StreamEvent> {
  const request = buildChatRequest(context, currentValues, messages);
  console.log(`[StreamingAgent] streamChat using ${getModelName(request.model)}`);

  const started = Date.now();
  try {
    const stream = getAnthropicClient().beta.messages.stream(request);
    for await (const event of stream) {
      if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
        yield { type: 'phase', phase: 'Preparing suggested changes...' };
      }
      if (event.type !== 'content_block_delta') continue;
      if (event.delta.type === 'text_delta') {
        yield { type: 'content', content: event.delta.text };
      } else if (event.delta.type === 'thinking_delta' && event.delta.thinking) {
        yield { type: 'thinking', content: event.delta.thinking };
      }
    }

    const reply = await finishChatMessage(await stream.finalMessage(), context, currentValues, started);
    if (reply.overrides.length > 0) {
      yield { type: 'override_suggestion', overrides: reply.overrides };
    }
    yield { type: 'complete' };
  } catch (error) {
    console.error('[StreamingAgent] Chat stream error:', error);
    yield { type: 'error', content: errorMessage(error) };
  }
}
