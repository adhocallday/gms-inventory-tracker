import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import {
  hashPages,
  MAX_INLINE_PAGE_BYTES,
  MAX_PAGE_BYTES,
  MAX_PAGES,
  sniffMediaType,
  type DocumentInput,
} from './document-input';
import { toClaudeImage, UnsupportedImageError } from './heic';

export const DOCUMENTS_BUCKET = 'documents';

export interface UploadInput {
  /** What the parser reads: one PDF or page images in order */
  document: DocumentInput;
  /** sha256 over the file (or the concatenated page) bytes, for duplicate detection */
  sourceHash: string;
  fileName: string;
  /** Total bytes received */
  byteLength: number;
  /** Extra string fields from the form data or JSON body (e.g. tourId, showId) */
  fields: Record<string, string | null>;
}

export class UploadError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'UploadError';
  }
}

/** One uploaded PDF, or one image treated as a single page. */
async function fromSingleFile(buffer: Buffer): Promise<{ document: DocumentInput; buffers: Buffer[] }> {
  if (sniffMediaType(buffer) === 'application/pdf') {
    return { document: { kind: 'pdf', data: buffer.toString('base64') }, buffers: [buffer] };
  }
  return fromPages([buffer], MAX_PAGE_BYTES);
}

/**
 * Validate page images by their bytes (JPEG, PNG, WebP; HEIC is converted to
 * JPEG). The hash is taken over the bytes as received.
 */
export async function fromPages(
  buffers: Buffer[],
  maxTotalBytes: number
): Promise<{ document: DocumentInput; buffers: Buffer[] }> {
  if (buffers.length === 0) throw new UploadError('No pages were uploaded', 400);
  if (buffers.length > MAX_PAGES) throw new UploadError(`Up to ${MAX_PAGES} pages per document`, 400);
  const total = buffers.reduce((sum, b) => sum + b.length, 0);
  if (total > maxTotalBytes) {
    throw new UploadError(`Pages total ${(total / 1024 / 1024).toFixed(1)} MB; the limit is ${Math.floor(maxTotalBytes / 1024 / 1024)} MB`, 413);
  }

  const pages = [];
  for (const [i, buffer] of buffers.entries()) {
    if (buffer.length > MAX_PAGE_BYTES) throw new UploadError(`Page ${i + 1} is larger than 5 MB`, 413);
    try {
      const image = await toClaudeImage(buffer);
      pages.push({ data: image.buffer.toString('base64'), mediaType: image.mediaType });
    } catch (e) {
      if (e instanceof UnsupportedImageError) throw new UploadError(`Page ${i + 1}: ${e.message}`, 415);
      throw e;
    }
  }
  return { document: { kind: 'images', pages }, buffers };
}

async function download(path: string): Promise<Buffer> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).download(path);
  if (error || !data) throw new UploadError('Uploaded file not found in storage', 404);
  return Buffer.from(await data.arrayBuffer());
}

function done(
  result: { document: DocumentInput; buffers: Buffer[] },
  fileName: string,
  fields: Record<string, string | null>
): UploadInput {
  return {
    document: result.document,
    sourceHash: hashPages(result.buffers),
    fileName,
    byteLength: result.buffers.reduce((sum, b) => sum + b.length, 0),
    fields,
  };
}

/**
 * Read an uploaded document from either:
 * - multipart form data with a `file` field (a PDF, or one image), or a
 *   `pages` / `pages[]` field repeated once per page image (up to 10, 4 MB total), or
 * - a JSON body `{ filePath }` or `{ pagePaths: [...] }` pointing at the Supabase
 *   `documents` bucket (used for files over Vercel's 4.5 MB request body limit).
 */
export async function readUploadedFile(request: NextRequest, fieldNames: string[] = []): Promise<UploadInput> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => null);
    const fields = Object.fromEntries(fieldNames.map(n => [n, body?.[n] ? String(body[n]) : null]));
    const pagePaths: unknown = body?.pagePaths;
    const filePath: unknown = body?.filePath;

    if (Array.isArray(pagePaths) && pagePaths.length) {
      if (!pagePaths.every((p): p is string => typeof p === 'string' && p.length > 0)) {
        throw new UploadError('Invalid pagePaths', 400);
      }
      if (pagePaths.length > MAX_PAGES) throw new UploadError(`Up to ${MAX_PAGES} pages per document`, 400);
      const buffers = await Promise.all(pagePaths.map(download));
      const name = typeof body.fileName === 'string' ? body.fileName : `${pagePaths.length} scanned pages`;
      return done(await fromPages(buffers, MAX_PAGES * MAX_PAGE_BYTES), name, fields);
    }
    if (typeof filePath !== 'string' || !filePath) {
      throw new UploadError('Missing filePath', 400);
    }
    const buffer = await download(filePath);
    const name = typeof body.fileName === 'string' ? body.fileName : filePath.split('/').pop()!;
    return done(await fromSingleFile(buffer), name, fields);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    throw new UploadError('Expected multipart form data or JSON', 400);
  }
  const fields = Object.fromEntries(fieldNames.map(n => [n, formData.get(n)?.toString() ?? null]));

  const pageFiles = [...formData.getAll('pages'), ...formData.getAll('pages[]')].filter(
    (v): v is File => typeof v === 'object' && v !== null && 'arrayBuffer' in v
  );
  if (pageFiles.length) {
    const buffers = await Promise.all(pageFiles.map(async f => Buffer.from(await f.arrayBuffer())));
    const name = pageFiles.length === 1 ? pageFiles[0].name : `${pageFiles.length} scanned pages`;
    return done(await fromPages(buffers, MAX_INLINE_PAGE_BYTES), name, fields);
  }

  const file = formData.get('file');
  if (!file || typeof file !== 'object' || !('arrayBuffer' in file)) {
    throw new UploadError('Missing file: send a PDF as `file` or page images as `pages`', 400);
  }
  return done(await fromSingleFile(Buffer.from(await file.arrayBuffer())), (file as File).name, fields);
}
