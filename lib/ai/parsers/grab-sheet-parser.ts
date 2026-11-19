import Anthropic from '@anthropic-ai/sdk';
import { AIParseError, getAnthropicClient } from '../claude-client';
import { GRAB_SHEET_PROFILES, type GrabSheetProfile } from '../models';
import type { ApiCallUsage } from '@/lib/grab-sheet/types';

/**
 * Grab-sheet vision calls. The models only read pixels; matching and saving
 * are rules in lib/grab-sheet (AI reads, rules decide).
 *
 * 1. detectTiles  (Opus 5.5, medium): every product tile on one page: SKU and
 *    name as printed, sizes and price if shown, the caption box and the
 *    product picture box, in pixels of the image sent.
 * 2. verifyCrop   (Haiku 5.5, low): reads the SKU back from one crop of
 *    picture + caption, and says whether the caption describes the item.
 */

export interface DetectedTile {
  sku: string;
  name: string;
  sizes: string[];
  price: number | null;
  caption_box: PixelBox;
  image_box: PixelBox;
  confidence: number;
}

export interface PixelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface VerifyRead {
  sku_text: string;
  item: string;
  caption_matches_item: boolean;
}

const BOX_SCHEMA = {
  type: 'object',
  properties: {
    x: { type: 'number', description: 'Left edge, pixels from the left of the image' },
    y: { type: 'number', description: 'Top edge, pixels from the top of the image' },
    w: { type: 'number', description: 'Width in pixels' },
    h: { type: 'number', description: 'Height in pixels' },
  },
  required: ['x', 'y', 'w', 'h'],
  additionalProperties: false,
} as const;

export const DETECT_SCHEMA = {
  type: 'object',
  properties: {
    tiles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sku: { type: 'string', description: 'SKU exactly as printed; empty string if none is printed' },
          name: { type: 'string', description: 'Product name as printed' },
          sizes: { type: 'array', items: { type: 'string' }, description: 'Sizes printed for this product; empty if none' },
          price: { anyOf: [{ type: 'number' }, { type: 'null' }], description: 'Price printed for this product, or null' },
          caption_box: BOX_SCHEMA,
          image_box: BOX_SCHEMA,
          confidence: { type: 'number', description: '0 to 1: how sure you are of the SKU read and the box pairing' },
        },
        required: ['sku', 'name', 'sizes', 'price', 'caption_box', 'image_box', 'confidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['tiles'],
  additionalProperties: false,
} as const;

export const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    sku_text: { type: 'string', description: 'The SKU code printed in the caption, exactly as printed; empty if none' },
    item: { type: 'string', description: 'A few words naming the item pictured, e.g. "black snapback cap"' },
    caption_matches_item: { type: 'boolean', description: 'True if the caption text plausibly names the pictured item' },
  },
  required: ['sku_text', 'item', 'caption_matches_item'],
  additionalProperties: false,
} as const;

function detectPrompt(width: number, height: number): string {
  return [
    `This image is one page of a merchandise grab sheet, ${width} × ${height} pixels.`,
    'The page is a grid of product tiles. Each tile has a product picture (often front and back views side by side) and a caption under or near it with the product name and a SKU code such as "GHOSRX203729BK".',
    '',
    'Return one entry per product tile:',
    '- sku: the SKU exactly as printed (keep every character; do not fix or complete it). Empty string if the tile has no SKU.',
    '- name: the product name as printed.',
    '- sizes and price: only if printed for that product; otherwise [] and null.',
    '- image_box: a tight box around that product\'s picture only, covering every view of the same product. It must not include the caption, sales figures or percentages, or any part of a neighbouring product.',
    '- caption_box: the box around that product\'s caption (name and SKU lines).',
    '- confidence: 0 to 1.',
    '',
    'Boxes are in pixels of this image, origin at the top-left.',
    'Ignore page titles, artist logos, and sales annotations such as "23,973 SOLD 15.04%": they are not products and must not be inside any box.',
    'Pair each caption with the picture it labels, which is normally directly above it.',
  ].join('\n');
}

const VERIFY_PROMPT = [
  'This is one product from a merchandise grab sheet: a product picture and its caption.',
  'Read the SKU code printed in the caption (letters then digits then letters, e.g. GHOSNS103665BK) exactly as printed.',
  'Say in a few words what item is pictured, and whether the caption text plausibly names that item.',
].join('\n');

/** Per-run spend guard: refuse a call once the running total reaches the cap. */
export class SpendGuard {
  readonly calls: ApiCallUsage[] = [];
  constructor(public capUsd = Infinity, private log?: (u: ApiCallUsage, total: number) => void) {}
  get totalUsd(): number {
    return this.calls.reduce((s, c) => s + c.costUsd, 0);
  }
  assertRoom(estimateUsd: number): void {
    if (this.totalUsd + estimateUsd > this.capUsd) {
      throw new AIParseError(
        'Stopped before the AI spend cap',
        `Spent $${this.totalUsd.toFixed(4)}; next call estimated $${estimateUsd.toFixed(4)}; cap $${this.capUsd.toFixed(2)}`
      );
    }
  }
  record(u: ApiCallUsage): void {
    this.calls.push(u);
    this.log?.(u, this.totalUsd);
  }
}

function costOf(profile: GrabSheetProfile, usage: Anthropic.Beta.BetaUsage): number {
  const p = profile.price;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  return (
    (usage.input_tokens * p.input + cacheWrite * p.input * 1.25 + cacheRead * p.cacheRead + usage.output_tokens * p.output) /
    1_000_000
  );
}

async function runVision<T>(args: {
  task: ApiCallUsage['task'];
  profile: GrabSheetProfile;
  label: string;
  image: { data: Buffer; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' };
  prompt: string;
  schema: Record<string, unknown>;
  guard?: SpendGuard;
  estimateUsd: number;
}): Promise<T> {
  const { profile, guard } = args;
  guard?.assertRoom(args.estimateUsd);
  const anthropic = getAnthropicClient();
  const started = Date.now();

  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await anthropic.beta.messages
      .stream({
        model: profile.model,
        max_tokens: profile.maxTokens,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: args.image.mediaType, data: args.image.data.toString('base64') } },
              { type: 'text', text: args.prompt },
            ],
          },
        ],
        output_config: {
          effort: profile.effort,
          format: { type: 'json_schema', schema: args.schema },
        },
        // Opus: server-side refusal fallback. Haiku 5.5 has none; its refusals
        // are handled below.
        ...(profile.serverFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
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

  guard?.record({
    task: args.task,
    model: message.model,
    label: args.label,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
    costUsd: costOf(profile, message.usage),
    latencyMs: Date.now() - started,
    stopReason: message.stop_reason,
  });

  if (message.stop_reason === 'refusal') {
    throw new AIParseError('The AI declined to read this image', message.stop_details?.explanation ?? undefined);
  }
  if (message.stop_reason === 'max_tokens') {
    throw new AIParseError('The AI response was cut off', `Output hit the ${profile.maxTokens} token limit`);
  }
  const text = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  if (!text) throw new AIParseError('No response from AI', `stop_reason: ${message.stop_reason}`);
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new AIParseError('Could not read the AI response', 'Invalid JSON: ' + (e as Error).message);
  }
}

/** Opus 5.5: finds every tile on one page (JPEG, ≤2576 px long edge). */
export async function detectTiles(
  page: { jpeg: Buffer; width: number; height: number; label: string },
  guard?: SpendGuard
): Promise<DetectedTile[]> {
  const out = await runVision<{ tiles: DetectedTile[] }>({
    task: 'grab-sheet-detect',
    profile: GRAB_SHEET_PROFILES.detect,
    label: page.label,
    image: { data: page.jpeg, mediaType: 'image/jpeg' },
    prompt: detectPrompt(page.width, page.height),
    schema: DETECT_SCHEMA,
    guard,
    estimateUsd: 0.4,
  });
  return out.tiles ?? [];
}

/** Haiku 5.5: reads the SKU back from one crop (picture + caption, JPEG). */
export async function verifyCrop(crop: { jpeg: Buffer; label: string }, guard?: SpendGuard): Promise<VerifyRead> {
  return runVision<VerifyRead>({
    task: 'grab-sheet-verify',
    profile: GRAB_SHEET_PROFILES.verify,
    label: crop.label,
    image: { data: crop.jpeg, mediaType: 'image/jpeg' },
    prompt: VERIFY_PROMPT,
    schema: VERIFY_SCHEMA,
    guard,
    estimateUsd: 0.005,
  });
}
