import Anthropic from '@anthropic-ai/sdk';
import { getModelForTask, MODELS, type TaskType } from './models';

export interface ParsedDocument {
  [key: string]: any;
}

export type JsonSchema = Record<string, unknown>;

type MediaType = 'application/pdf' | 'image/jpeg' | 'image/png';

interface ParseOptions {
  /** Routes to a model via MODEL_ROUTING (default: 'document-parsing') */
  task?: TaskType;
  /** Reasoning effort for Sonnet/Opus (ignored for Haiku) */
  effort?: 'low' | 'medium' | 'high';
  maxTokens?: number;
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

/**
 * Structured outputs require every object to declare additionalProperties: false.
 * Applied recursively so parser schemas can stay readable.
 */
function strictSchema(schema: JsonSchema): JsonSchema {
  const out: JsonSchema = { ...schema };
  if (out.type === 'object') {
    out.additionalProperties = false;
    if (out.properties) {
      out.properties = Object.fromEntries(
        Object.entries(out.properties as Record<string, JsonSchema>).map(([k, v]) => [k, strictSchema(v)])
      );
    }
  }
  if (out.type === 'array' && out.items) {
    out.items = strictSchema(out.items as JsonSchema);
  }
  return out;
}

/** Fallback for callers that don't pass a schema: pull the JSON object out of free text. */
function extractJSON(text: string): ParsedDocument {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const body = codeBlock ? codeBlock[1] : text;
  const jsonMatch = body.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new AIParseError('Could not read the AI response', 'No JSON found in response: ' + text.substring(0, 300));
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new AIParseError('Could not read the AI response', 'Invalid JSON: ' + (e as Error).message);
  }
}

async function runStructured(
  content: Anthropic.Beta.BetaContentBlockParam[],
  schema: JsonSchema | undefined,
  { task = 'document-parsing', effort = 'medium', maxTokens = 32000 }: ParseOptions
): Promise<ParsedDocument> {
  const anthropic = getAnthropicClient();
  const model = getModelForTask(task);
  const isHaiku = model === MODELS.HAIKU;

  const outputConfig: Anthropic.Beta.BetaOutputConfig = {};
  if (schema) outputConfig.format = { type: 'json_schema', schema: strictSchema(schema) };
  // Haiku 4.5 does not accept the effort parameter
  if (!isHaiku) outputConfig.effort = effort;

  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await anthropic.beta.messages
      .stream({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content }],
        ...(Object.keys(outputConfig).length ? { output_config: outputConfig } : {}),
        // Server-side refusal fallback: if a safety classifier declines, the API
        // re-runs the request on a fallback model within the same call.
        ...(isHaiku ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
      })
      .finalMessage();
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new AIParseError('AI parsing is not configured', 'Invalid ANTHROPIC_API_KEY');
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new AIParseError('AI service is busy, please retry in a minute', error.message);
    }
    if (error instanceof Anthropic.APIError) {
      throw new AIParseError('AI service error', `${error.status ?? ''} ${error.message}`.trim());
    }
    throw error;
  }

  if (message.stop_reason === 'refusal') {
    throw new AIParseError('The AI declined to process this document', message.stop_details?.explanation ?? undefined);
  }
  if (message.stop_reason === 'max_tokens') {
    throw new AIParseError(
      'Document is too large to parse in one pass',
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

  if (!schema) return extractJSON(text);
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new AIParseError('Could not read the AI response', 'Invalid JSON: ' + (e as Error).message);
  }
}

/**
 * Parse a PDF or image with Claude. Pass a JSON schema to get schema-valid output.
 */
export async function parseDocument(
  base64Data: string,
  mediaType: MediaType,
  instructions: string,
  schema?: JsonSchema,
  options: ParseOptions = {}
): Promise<ParsedDocument> {
  const fileBlock: Anthropic.Beta.BetaContentBlockParam =
    mediaType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64Data } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } };

  return runStructured([fileBlock, { type: 'text', text: instructions }], schema, options);
}

/**
 * Parse plain text with Claude (for spreadsheet data, etc.)
 */
export async function parseText(
  text: string,
  instructions: string,
  schema?: JsonSchema,
  options: ParseOptions = {}
): Promise<ParsedDocument> {
  return runStructured(
    [{ type: 'text', text: `${instructions}\n\nData to parse:\n${text}` }],
    schema,
    options
  );
}
