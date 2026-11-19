import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/client';
import { DOCUMENTS_BUCKET } from '@/lib/ai/read-upload';

const MAX_XLSX_BYTES = 40 * 1024 * 1024;

/**
 * POST /api/admin/grab-sheet/sign → a one-time signed upload URL for a grab-sheet
 * workbook over Vercel's 4.5 MB body limit (documents bucket, grab-sheets/).
 */
export async function POST(request: NextRequest) {
  const { fileName, size } = await request.json().catch(() => ({}));
  if (typeof fileName !== 'string' || !/\.xlsx$/i.test(fileName)) {
    return NextResponse.json({ error: 'Only .xlsx workbooks are staged here' }, { status: 400 });
  }
  if (typeof size !== 'number' || size > MAX_XLSX_BYTES) {
    return NextResponse.json({ error: 'Workbook is larger than 40 MB' }, { status: 400 });
  }
  const path = `grab-sheets/${crypto.randomUUID()}.xlsx`;
  const { data, error } = await createServiceClient().storage.from(DOCUMENTS_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('[grab-sheet/sign]', error);
    return NextResponse.json({ error: 'Could not prepare upload' }, { status: 500 });
  }
  return NextResponse.json({ path: data.path, token: data.token });
}
