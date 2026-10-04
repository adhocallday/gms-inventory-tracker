import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

export const DOCUMENTS_BUCKET = 'documents';

export interface UploadInput {
  buffer: Buffer;
  fileName: string;
  /** Extra string fields from the form data or JSON body (e.g. tourId, showId) */
  fields: Record<string, string | null>;
}

export class UploadError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'UploadError';
  }
}

/**
 * Read an uploaded document from either:
 * - multipart form data with a `file` field (small files), or
 * - a JSON body `{ filePath }` pointing at the Supabase `documents` bucket
 *   (used by the browser for files over Vercel's 4.5 MB request body limit).
 */
export async function readUploadedFile(request: NextRequest, fieldNames: string[] = []): Promise<UploadInput> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const body = await request.json();
    const filePath: unknown = body?.filePath;
    if (typeof filePath !== 'string' || !filePath) {
      throw new UploadError('Missing filePath', 400);
    }
    const supabase = createServiceClient();
    const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).download(filePath);
    if (error || !data) {
      throw new UploadError('Uploaded file not found in storage', 404);
    }
    return {
      buffer: Buffer.from(await data.arrayBuffer()),
      fileName: typeof body.fileName === 'string' ? body.fileName : filePath.split('/').pop()!,
      fields: Object.fromEntries(fieldNames.map(n => [n, body?.[n] ? String(body[n]) : null])),
    };
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    throw new UploadError('Missing PDF file', 400);
  }
  return {
    buffer: Buffer.from(await file.arrayBuffer()),
    fileName: file.name,
    fields: Object.fromEntries(fieldNames.map(n => [n, formData.get(n)?.toString() ?? null])),
  };
}
