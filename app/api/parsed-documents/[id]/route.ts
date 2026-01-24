import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('parsed_documents')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { ui_overrides, normalized_json, status, tour_id, show_id } =
      await request.json();

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (ui_overrides !== undefined) updates.ui_overrides = ui_overrides;
    if (normalized_json !== undefined) updates.normalized_json = normalized_json;
    if (status !== undefined) updates.status = status;
    if (tour_id !== undefined) updates.tour_id = tour_id;
    if (show_id !== undefined) updates.show_id = show_id;

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('parsed_documents')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update parsed document', details: error.message },
      { status: 500 }
    );
  }
}
