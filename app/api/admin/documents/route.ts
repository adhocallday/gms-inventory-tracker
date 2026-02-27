import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * GET /api/admin/documents
 * List all parsed documents with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tourId = searchParams.get('tourId');
    const docType = searchParams.get('docType');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = createServiceClient();

    // Build query with filters
    let query = supabase
      .from('parsed_documents')
      .select(`
        *,
        tours:tour_id (name),
        shows:show_id (venue_name, show_date)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (tourId) {
      query = query.eq('tour_id', tourId);
    }
    if (docType) {
      query = query.eq('doc_type', docType);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Documents API] Error fetching documents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      documents: data || [],
      count: count || data?.length || 0
    });
  } catch (error: any) {
    console.error('[Documents API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/documents
 * Bulk delete documents by IDs
 */
export async function DELETE(request: NextRequest) {
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'No document IDs provided' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('parsed_documents')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('[Documents API] Error deleting documents:', error);
      return NextResponse.json(
        { error: 'Failed to delete documents' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: ids.length
    });
  } catch (error: any) {
    console.error('[Documents API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
