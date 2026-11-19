import { NextRequest, NextResponse } from 'next/server';
import { listParsedDocuments } from '@/lib/data/parsed-documents';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Parsed documents with filters (lib/data/parsed-documents.ts, shared with the documents page). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const { data, count } = await listParsedDocuments({
      docType: searchParams.get('doc_type'),
      status: searchParams.get('status'),
      tourId: searchParams.get('tour_id'),
      search: searchParams.get('search'),
      limit,
      offset,
    });
    return NextResponse.json({ data, count, limit, offset });
  } catch (err: any) {
    console.error('Error fetching parsed documents:', err);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}
