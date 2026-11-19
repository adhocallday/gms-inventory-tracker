import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { parsePurchaseOrder } from '@/lib/ai/parsers/po-parser';
import { parsePackingList } from '@/lib/ai/parsers/packing-list-parser';
import { parseSalesReport } from '@/lib/ai/parsers/sales-report-parser';
import { parseSettlementReport } from '@/lib/ai/parsers/settlement-parser';
import { AIParseError } from '@/lib/ai/claude-client';
import { DOCUMENTS_BUCKET, fromPages, UploadError } from '@/lib/ai/read-upload';
import { hashPages, MAX_PAGE_BYTES, sniffMediaType, type DocumentInput } from '@/lib/ai/document-input';
import { clientIp, createRateLimiter } from '@/lib/http/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/parse-document  { filePath, fileType, tourId? }
 *
 * Public (outside the password gate) for the MerchFlow iPad app, which uploads
 * a photo or PDF to the `documents` bucket and then calls this route. The file
 * type is read from the bytes, not trusted from the client.
 */

const FILE_TYPES = ['po', 'packing-list', 'sales-report', 'settlement'] as const;
type FileType = (typeof FILE_TYPES)[number];
const isFileType = (v: unknown): v is FileType => typeof v === 'string' && (FILE_TYPES as readonly string[]).includes(v);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PDF_BYTES = 32 * 1024 * 1024;

// Each parse is a paid Claude call; 10 per minute per IP is plenty for a person scanning.
const rateLimit = createRateLimiter({ limit: 10, windowMs: 60_000 });

const PARSERS: Record<FileType, (input: DocumentInput) => Promise<unknown>> = {
  po: parsePurchaseOrder,
  'packing-list': parsePackingList,
  'sales-report': parseSalesReport,
  settlement: parseSettlementReport,
};

export async function POST(request: NextRequest) {
  const totalStart = Date.now();

  const limited = rateLimit(clientIp(request.headers));
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests, please wait a minute and try again' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
    );
  }

  const body = await request.json().catch(() => null);
  const { filePath, fileType } = body ?? {};
  const tourId = typeof body?.tourId === 'string' && UUID.test(body.tourId) ? body.tourId : null;

  if (typeof filePath !== 'string' || !filePath || filePath.includes('..') || filePath.length > 300) {
    return NextResponse.json({ error: 'Missing or invalid filePath' }, { status: 400 });
  }
  if (!isFileType(fileType)) {
    return NextResponse.json({ error: `fileType must be one of: ${FILE_TYPES.join(', ')}` }, { status: 400 });
  }

  const supabase = createServiceClient();
  let logId: string | undefined;

  try {
    const downloadStart = Date.now();
    const { data: fileData, error: downloadError } = await supabase.storage.from(DOCUMENTS_BUCKET).download(filePath);
    console.log(`[ParseDocument] Supabase download: ${Date.now() - downloadStart}ms`);
    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'File not found or download failed' }, { status: 404 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const sourceHash = hashPages([buffer]);
    const sniffed = sniffMediaType(buffer);

    // Read the real type from the bytes: a PDF goes in as a document, a photo
    // (JPEG, PNG, WebP; HEIC converted to JPEG) as one page image.
    let document: DocumentInput;
    if (sniffed === 'application/pdf') {
      if (buffer.length > MAX_PDF_BYTES) return NextResponse.json({ error: 'PDF is larger than 32 MB' }, { status: 413 });
      document = { kind: 'pdf', data: buffer.toString('base64') };
    } else if (sniffed) {
      try {
        document = (await fromPages([buffer], MAX_PAGE_BYTES)).document;
      } catch (e) {
        if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: e.status });
        throw e;
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Send a PDF or a JPEG, PNG, WebP or HEIC photo.' },
        { status: 415 }
      );
    }

    // A document that was already posted is never parsed again or reset to draft.
    const { data: existing } = await supabase
      .from('parsed_documents')
      .select('id, status, extracted_json')
      .eq('doc_type', fileType)
      .eq('source_hash', sourceHash)
      .maybeSingle();
    if (existing?.status === 'posted') {
      return NextResponse.json({
        success: true,
        data: existing.extracted_json,
        fileType,
        parsedDocumentId: existing.id,
        alreadyPosted: true,
      });
    }

    const { data: logEntry } = await supabase
      .from('ai_processing_logs')
      .insert({ doc_type: fileType, source_hash: sourceHash, source_filename: filePath, status: 'processing' })
      .select()
      .single();
    logId = logEntry?.id;

    const parseStart = Date.now();
    const parsed = await PARSERS[fileType](document);
    console.log(`[ParseDocument] Parser (${fileType}, ${sniffed}): ${Date.now() - parseStart}ms`);

    const { data: parsedDoc } = await supabase
      .from('parsed_documents')
      .upsert(
        {
          doc_type: fileType,
          source_hash: sourceHash,
          source_filename: filePath,
          tour_id: tourId,
          extracted_json: parsed,
          normalized_json: parsed,
          status: 'draft',
        },
        { onConflict: 'doc_type,source_hash' }
      )
      .select()
      .single();

    if (logId) {
      await supabase.from('ai_processing_logs').update({ status: 'ok', parsed_json: parsed }).eq('id', logId);
    }

    console.log(`[ParseDocument] TOTAL TIME: ${Date.now() - totalStart}ms`);
    return NextResponse.json({ success: true, data: parsed, fileType, parsedDocumentId: parsedDoc?.id ?? null });
  } catch (error: any) {
    console.error('Parse document error:', error);
    if (logId) {
      await supabase
        .from('ai_processing_logs')
        .update({ status: 'error', error_message: String(error?.message ?? error) })
        .eq('id', logId);
    }
    return NextResponse.json(
      {
        error: error instanceof AIParseError ? error.message : 'Failed to parse document',
        details: error instanceof AIParseError ? error.details : undefined,
      },
      { status: 500 }
    );
  }
}
