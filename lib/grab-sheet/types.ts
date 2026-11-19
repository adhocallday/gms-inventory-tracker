/** Shared shapes for the grab-sheet pipeline, used by the server, the scripts and the review screen. */

/** A box on the page, normalised to 0–1 of the page width and height. */
export interface NormBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type MatchStatus = 'matched' | 'new' | 'unreadable' | 'conflict';
export type VerifyStatus = 'verified' | 'needs_review';

export interface TileVerification {
  status: VerifyStatus;
  /** SKU Haiku read back from the crop, normalised. */
  skuRead: string | null;
  /** Haiku's raw transcription before normalisation. */
  rawRead: string;
  /** Haiku's yes/no on whether the caption describes the item pictured. */
  captionMatchesItem: boolean | null;
  reason?: string;
}

export interface GrabSheetTile {
  /** Stable id within one run: `${pageKey}-t${n}`. */
  id: string;
  pageKey: string;
  sourceFile: string;
  /** 1-based page number across the whole source file. */
  sourcePage: number;
  /** SKU exactly as Opus transcribed it from the caption. */
  rawSku: string;
  /** SKU after skuFromCaption normalisation, or null when it isn't a valid SKU. */
  sku: string | null;
  name: string;
  sizes: string[];
  price: number | null;
  captionBox: NormBox;
  imageBox: NormBox;
  /** 0–1: Opus's confidence in the caption read and the box pairing. */
  confidence: number;
  /** Product crop, `data:image/webp;base64,...` (800 px). */
  cropDataUrl: string;
  verification: TileVerification;
  match: TileMatch;
}

export interface TileMatch {
  status: MatchStatus;
  productId: string | null;
  /** Catalog description when matched. */
  productName: string | null;
  /** For unreadable captions: a single catalog SKU that extends the read by one character. */
  suggestedSku?: string | null;
  /** Existing primary image id on the matched product, if any. */
  existingImageId?: string | null;
  /** Hamming distance between the crop and the existing primary image (0–64). */
  hashDistance?: number | null;
  note?: string;
}

export interface GrabSheetPageResult {
  pageKey: string;
  sourceFile: string;
  sourcePage: number;
  label: string;
  width: number;
  height: number;
  tiles: GrabSheetTile[];
}

export interface ApiCallUsage {
  task: 'grab-sheet-detect' | 'grab-sheet-verify';
  model: string;
  label: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  costUsd: number;
  latencyMs: number;
  stopReason: string | null;
}

/** What the API route returns for one page, and what the dry-run script saves (as a list of pages). */
export interface GrabSheetRunResult {
  version: 1;
  createdAt: string;
  sourceFile: string;
  pages: GrabSheetPageResult[];
  usage: ApiCallUsage[];
}
