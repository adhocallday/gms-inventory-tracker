import { supabase } from '@/lib/supabase/client';
import { readJsonResponse } from '@/lib/http/read-json';

export { readJsonResponse };

/** Vercel rejects function request bodies over 4.5 MB; stay safely under it. */
const DIRECT_UPLOAD_LIMIT = 4 * 1024 * 1024;

export type UploadBody = { body: BodyInit; headers?: HeadersInit };

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
    contentType: file.type || 'application/pdf',
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
