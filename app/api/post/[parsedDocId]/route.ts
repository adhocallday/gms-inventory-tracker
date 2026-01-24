import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { postParsedDocument } from '@/lib/posting/post-parsed-document';

export async function POST(
  _request: NextRequest,
  { params }: { params: { parsedDocId: string } }
) {
  try {
    const supabase = createServiceClient();
    const { updated, receipt } = await postParsedDocument(
      supabase,
      params.parsedDocId
    );
    return NextResponse.json({ data: updated, receipt });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to post document', details: error.message },
      { status: 500 }
    );
  }
}
