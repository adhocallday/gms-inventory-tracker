import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/documents/[id]
 * Get a single document by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('parsed_documents')
      .select(`
        *,
        tours:tour_id (id, name, artist),
        shows:show_id (id, venue_name, show_date, city, state)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }
      console.error('[Document API] Error fetching document:', error);
      return NextResponse.json(
        { error: 'Failed to fetch document' },
        { status: 500 }
      );
    }

    return NextResponse.json({ document: data });
  } catch (error: any) {
    console.error('[Document API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/documents/[id]
 * Delete a single document
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('parsed_documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Document API] Error deleting document:', error);
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Document API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/documents/[id]
 * Update document status or data
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const updates = await request.json();
    const supabase = createServiceClient();

    // Only allow updating specific fields
    const allowedFields = ['status', 'ui_overrides', 'normalized_json'];
    const filteredUpdates: Record<string, any> = {};

    for (const field of allowedFields) {
      if (field in updates) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    filteredUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('parsed_documents')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Document API] Error updating document:', error);
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      );
    }

    return NextResponse.json({ document: data });
  } catch (error: any) {
    console.error('[Document API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
