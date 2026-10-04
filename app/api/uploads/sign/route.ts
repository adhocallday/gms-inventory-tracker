import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/client';
import { DOCUMENTS_BUCKET } from '@/lib/ai/read-upload';

const MAX_UPLOAD_BYTES = 32 * 1024 * 1024; // Claude's PDF request limit

/**
 * POST /api/uploads/sign
 * Returns a one-time signed upload URL in the documents bucket so the browser can
 * upload PDFs larger than Vercel's 4.5 MB function body limit directly to storage.
 */
export async function POST(request: NextRequest) {
  const { fileName, size, contentType } = await request.json().catch(() => ({}));

  if (typeof fileName !== 'string' || !fileName) {
    return NextResponse.json({ error: 'Missing fileName' }, { status: 400 });
  }
  if (contentType !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
  }
  if (typeof size !== 'number' || size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'File is larger than 32 MB' }, { status: 400 });
  }

  const safeName = fileName.replace(/[^\w.\-]+/g, '_').slice(-100);
  const path = `uploads/${crypto.randomUUID()}-${safeName}`;

  const supabase = createServiceClient();
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('[uploads/sign] Failed to sign upload:', error);
    return NextResponse.json({ error: 'Could not prepare upload' }, { status: 500 });
  }

  return NextResponse.json({ path: data.path, token: data.token });
}
