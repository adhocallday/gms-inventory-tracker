import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { parsedDocId: string } }
) {
  const { reason } = await request.json().catch(() => ({ reason: null }));

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('parsed_documents')
    .update({
      status: 'rejected',
      validation: reason ? { rejected_reason: reason } : undefined,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.parsedDocId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
