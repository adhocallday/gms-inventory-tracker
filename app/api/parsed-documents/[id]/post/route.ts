import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { postParsedDocument } from '@/lib/posting/post-parsed-document';
import { revalidateDashboards } from '@/lib/cache/revalidate';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const { updated, receipt } = await postParsedDocument(supabase, params.id);
    revalidateDashboards(updated?.tour_id);

    return NextResponse.json({ data: updated, receipt });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to post document', details: error.message },
      { status: 500 }
    );
  }
}
