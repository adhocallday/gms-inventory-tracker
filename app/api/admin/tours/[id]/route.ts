import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * PATCH /api/admin/tours/[id]
 * Update tour information
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = params.id;
    const body = await request.json();
    const { name, artist, start_date, end_date, description, status } = body;

    const supabase = createServiceClient();

    const { data: tour, error } = await supabase
      .from('tours')
      .update({
        name,
        artist,
        start_date,
        end_date,
        description,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', tourId)
      .select()
      .single();

    if (error) {
      console.error('[PATCH tour] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tour });
  } catch (error: any) {
    console.error('[PATCH tour] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update tour' },
      { status: 500 }
    );
  }
}
