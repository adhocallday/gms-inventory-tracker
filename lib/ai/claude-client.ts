import Anthropic from '@anthropic-ai/sdk';
import { fallbackParams, getModelProfile, type Effort, type TaskType } from './models';
import { logUsage, type UsageRecord } from './usage';

export interface ParsedDocument {
  [key: string]: any;
}

export type JsonSchema = Record<string, unknown>;

export type MediaType = 'application/pdf' | 'image/jpeg' | 'image/png';

export interface CallResult {
  model: string;
  usage: UsageRecord['usage'];
  latencyMs: number;
  stopReason: string | null;
}

export interface ParseOptions {
  /** Picks the model profile in lib/ai/models.ts (default: 'document-parsing') */
  task?: TaskType;
  /** Overrides the profile's effort */
  effort?: Effort;
  /** Overrides the profile's max_tokens */
  maxTokens?: number;
  /** Overrides the profile's model (eval only; production code uses profiles) */
  model?: string;
  /** Attached to the usage log row */
  tourId?: string | null;
  docId?: string | null;
  /** Called after each API response with its usage (eval, tests) */
  onResult?: (result: CallResult) => void;
  /**
   * Overrides the media type the caller passes, so a PDF-only parser can be
   * fed a page photo (extraction eval). The scanner path replaces this.
   */
  mediaType?: MediaType;
}

/**
 * Error thrown by the AI layer. `message` is safe to show users;
 * `details` carries the underlying cause for logs and the review UI.
 */
export class AIParseError extends Error {
  constructor(message: string, public details?: string) {
    super(message);
    this.name = 'AIParseError';
  }
}

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AIParseError(
      'AI parsing is not configured',
      'ANTHROPIC_API_KEY is not set in this environment'
    );
  }
  client ??= new Anthropic();
  return client;
}

/** Replace the shared client (eval dry runs and tests). */
export function __setAnthropicClient(c: Anthropic | null) {
  client = c;
}

/** Map SDK errors to AIParseError with a user-facing message. */
export function toAIParseError(error: unknown): unknown {
  if (error instanceof Anthropic.AuthenticationError) {
    return new AIParseError('AI parsing is not configured', 'Invalid ANTHROPIC_API_KEY');
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AIParseError('AI service is busy, please retry in a minute', error.message);
  }
  if (error instanceof Anthropic.APIError) {
    return new AIParseError('AI service error', `${error.status ?? ''} ${error.message}`.trim());
  }
  return error;
}

/**
 * Structured outputs require every object to declare additionalProperties: false.
 * Applied recursively so parser schemas can stay readable.
 */
export function strictSchema(schema: JsonSchema): JsonSchema {
  const out: JsonSchema = { ...schema };
  if (out.type === 'object' || (Array.isArray(out.type) && out.type.includes('object'))) {
    out.additionalProperties = false;
    if (out.properties) {
      out.properties = Object.fromEntries(
        Object.entries(out.properties as Record<string, JsonSchema>).map(([k, v]) => [k, strictSchema(v)])
      );
    }
  }
  if (out.items) {
    out.items = strictSchema(out.items as JsonSchema);
  }
  if (Array.isArray(out.anyOf)) {
    out.anyOf = (out.anyOf as JsonSchema[]).map(strictSchema);
  }
  return out;
}

/** Throw on refusal or truncation; return the joined text blocks (thinking blocks skipped). */
export function readTextOrThrow(
  message: Pick<Anthropic.Beta.BetaMessage, 'stop_reason' | 'stop_details' | 'content'>,
  maxTokens: number,
  what = 'document'
): string {
  if (message.stop_reason === 'refusal') {
    throw new AIParseError(
      `The AI declined to process this ${what}`,
      message.stop_details?.explanation ?? message.stop_details?.category ?? undefined
    );
  }
  if (message.stop_reason === 'max_tokens') {
    throw new AIParseError(
      what === 'document' ? 'Document is too large to parse in one pass' : `The AI response for this ${what} was cut off`,
      `Output hit the ${maxTokens} token limit`
    );
  }
  const text = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');
  if (!text) {
    throw new AIParseError('No response from AI', `stop_reason: ${message.stop_reason}`);
  }
  return text;
}

async function runStructured(
  content: Anthropic.Beta.BetaContentBlockParam[],
  schema: JsonSchema,
  options: ParseOptions
): Promise<ParsedDocument> {
  const task = options.task ?? 'document-parsing';
  const profile = getModelProfile(task);
  const model = options.model ?? profile.model;
  const effort = options.effort ?? profile.effort;
  const maxTokens = options.maxTokens ?? profile.maxTokens;
  const anthropic = getAnthropicClient();

  const started = Date.now();
  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await anthropic.beta.messages
      .stream({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content }],
        output_config: { effort, format: { type: 'json_schema', schema: strictSchema(schema) } },
        // Server-side refusal fallback on Opus/Sonnet (Haiku has none; refusals handled below).
        ...fallbackParams(model),
      })
      .finalMessage();
  } catch (error) {
    throw toAIParseError(error);
  }

  const result: CallResult = {
    model: message.model,
    usage: message.usage,
    latencyMs: Date.now() - started,
    stopReason: message.stop_reason,
  };
  options.onResult?.(result);
  await logUsage({
    task,
    model: message.model,
    effort,
    usage: message.usage,
    latencyMs: result.latencyMs,
    stopReason: message.stop_reason,
    tourId: options.tourId,
    docId: options.docId,
  });

  const text = readTextOrThrow(message, maxTokens);
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new AIParseError('Could not read the AI response', 'Invalid JSON: ' + (e as Error).message);
  }
}

/**
 * Parse a PDF or image with Claude into schema-valid JSON (structured outputs).
 */
export async function parseDocument(
  base64Data: string,
  mediaType: MediaType,
  instructions: string,
  schema: JsonSchema,
  options: ParseOptions = {}
): Promise<ParsedDocument> {
  const type = options.mediaType ?? mediaType;
  const fileBlock: Anthropic.Beta.BetaContentBlockParam =
    type === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: type, data: base64Data } }
      : { type: 'image', source: { type: 'base64', media_type: type, data: base64Data } };

  return runStructured([fileBlock, { type: 'text', text: instructions }], schema, options);
}

/**
 * Parse plain text with Claude (for spreadsheet data, etc.)
 */
export async function parseText(
  text: string,
  instructions: string,
  schema: JsonSchema,
  options: ParseOptions = {}
): Promise<ParsedDocument> {
  return runStructured(
    [{ type: 'text', text: `${instructions}\n\nData to parse:\n${text}` }],
    schema,
    { task: 'admin-parsing', ...options }
  );
}
