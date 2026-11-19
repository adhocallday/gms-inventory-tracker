import crypto from 'crypto';

/**
 * What a document parser reads: one PDF, or photographed pages in reading order.
 * Images are sent to Claude as image blocks, so the scanner and the iPad app
 * never have to wrap photos in a PDF.
 */

export type PageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';
export type SniffedMediaType = 'application/pdf' | PageMediaType | 'image/heic';

export interface PageImage {
  /** Base64 without a data: prefix */
  data: string;
  mediaType: PageMediaType;
}

export type DocumentInput = { kind: 'pdf'; data: string } | { kind: 'images'; pages: PageImage[] };

export const MAX_PAGES = 10;
/** Inline multipart uploads stay under Vercel's 4.5 MB body limit. */
export const MAX_INLINE_PAGE_BYTES = 4 * 1024 * 1024;
/** Claude's per-image limit, for pages staged in storage. */
export const MAX_PAGE_BYTES = 5 * 1024 * 1024;

const PAGE_TYPES = new Set<string>(['image/jpeg', 'image/png', 'image/webp']);
export const isPageMediaType = (t: string | null): t is PageMediaType => t !== null && PAGE_TYPES.has(t);

/**
 * Detect a file's real type from its leading bytes. File names and declared
 * content types are not trusted (the iPad app used to send JPEGs that were
 * then labelled as PDFs).
 */
export function sniffMediaType(buf: Uint8Array): SniffedMediaType | null {
  if (buf.length < 12) return null;
  const ascii = (start: number, end: number) => String.fromCharCode(...buf.subarray(start, end));

  if (ascii(0, 5) === '%PDF-') return 'application/pdf';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && ascii(1, 4) === 'PNG' && buf[4] === 0x0d && buf[5] === 0x0a) return 'image/png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  // ISO-BMFF: [size]['ftyp'][major brand]. HEIC/HEIF brands from iPhone and iPad cameras.
  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12);
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return 'image/heic';
  }
  return null;
}

/**
 * Duplicate-detection hash over the concatenated page bytes. A single file
 * hashes exactly as before (sha256 of its bytes), so existing drafts still match.
 */
export function hashPages(buffers: Uint8Array[]): string {
  const hash = crypto.createHash('sha256');
  for (const b of buffers) hash.update(b);
  return hash.digest('hex');
}

/** Parsers accept the old base64-PDF string too, so scripts that pass one keep working. */
export function asDocumentInput(input: DocumentInput | string): DocumentInput {
  return typeof input === 'string' ? { kind: 'pdf', data: input } : input;
}

/** Classification only needs the first pages. */
export function firstPages(input: DocumentInput, count: number): DocumentInput {
  return input.kind === 'images' ? { kind: 'images', pages: input.pages.slice(0, count) } : input;
}
