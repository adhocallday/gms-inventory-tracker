import { supabase } from '@/lib/supabase/client';

/** Vercel rejects function request bodies over 4.5 MB; stay safely under it. */
const DIRECT_UPLOAD_LIMIT = 4 * 1024 * 1024;

export type UploadBody = { body: BodyInit; headers?: HeadersInit };

/**
 * Read a fetch response as JSON, turning non-JSON failures (timeouts, 413s,
 * HTML error pages) into a readable Error instead of a JSON parse crash.
 */
export async function readJsonResponse<T = any>(response: Response): Promise<T> {
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // fall through to the status-based message below
  }

  if (!response.ok) {
    if (data?.error) {
      throw new Error(data.details ? `${data.error}: ${data.details}` : data.error);
    }
    if (response.status === 413) throw new Error('File is too large to upload');
    if (response.status === 504) throw new Error('The server timed out while processing this document. Please retry.');
    throw new Error(`Request failed (HTTP ${response.status})`);
  }
  if (data === null) throw new Error('Server returned an empty response');
  return data as T;
}

/**
 * Upload a large file straight to Supabase Storage via a signed URL and return
 * its storage path. Small files return null and are sent inline as form data.
 */
export async function stageLargeUpload(file: File): Promise<string | null> {
  if (file.size <= DIRECT_UPLOAD_LIMIT) return null;

  const signResponse = await fetch('/api/uploads/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, size: file.size, contentType: file.type || 'application/pdf' }),
  });
  const { path, token } = await readJsonResponse<{ path: string; token: string }>(signResponse);

  const { error } = await supabase.storage.from('documents').uploadToSignedUrl(path, token, file, {
    contentType: 'application/pdf',
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

/** Build the request body for a parse/detect route: inline form data or a storage path. */
export function buildUploadBody(
  file: File,
  stagedPath: string | null,
  fields: Record<string, string | undefined> = {}
): UploadBody {
  if (stagedPath) {
    return {
      body: JSON.stringify({ filePath: stagedPath, fileName: file.name, ...fields }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
  const formData = new FormData();
  formData.append('file', file);
  for (const [key, value] of Object.entries(fields)) {
    if (value) formData.append(key, value);
  }
  return { body: formData };
}
