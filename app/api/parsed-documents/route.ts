import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    // Get query parameters
    const docType = searchParams.get('doc_type');
    const status = searchParams.get('status');
    const tourId = searchParams.get('tour_id');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Build query
    let query = supabase
      .from('parsed_documents')
      .select(
        `
        *,
        tours:tour_id (
          id,
          name,
          artist
        ),
        shows:show_id (
          id,
          show_date,
          venue_name,
          city,
          state
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    // Apply filters
    if (docType) {
      query = query.eq('doc_type', docType);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (tourId) {
      query = query.eq('tour_id', tourId);
    }

    if (search) {
      query = query.or(
        `source_filename.ilike.%${search}%,source_hash.ilike.%${search}%`
      );
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching parsed documents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      count: count || 0,
      limit,
      offset,
    });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
