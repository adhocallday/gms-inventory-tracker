import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

interface Show {
  id?: string;
  showDate: string;
  venueName: string;
  city: string;
  state: string;
  country: string;
  capacity?: number;
}

/**
 * POST /api/admin/tours/[id]/shows
 * Update shows for a tour (replaces existing shows)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = params.id;
    const body = await request.json();
    const { shows } = body as { shows: Show[] };

    const supabase = createServiceClient();

    // First, get existing show IDs
    const { data: existingShows } = await supabase
      .from('shows')
      .select('id')
      .eq('tour_id', tourId);

    const existingIds = new Set(existingShows?.map(s => s.id) || []);

    // Separate shows into update and insert
    const showsToUpdate = shows.filter(s => s.id && existingIds.has(s.id));
    const showsToInsert = shows.filter(s => !s.id);

    // Delete shows that are no longer in the list
    const incomingIds = new Set(shows.map(s => s.id).filter(Boolean));
    const idsToDelete = Array.from(existingIds).filter(id => !incomingIds.has(id));

    if (idsToDelete.length > 0) {
      await supabase
        .from('shows')
        .delete()
        .in('id', idsToDelete);
    }

    // Update existing shows
    for (const show of showsToUpdate) {
      await supabase
        .from('shows')
        .update({
          show_date: show.showDate,
          venue_name: show.venueName,
          city: show.city,
          state: show.state,
          country: show.country,
          capacity: show.capacity || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', show.id);
    }

    // Insert new shows
    if (showsToInsert.length > 0) {
      const insertData = showsToInsert.map(show => ({
        id: crypto.randomUUID(),
        tour_id: tourId,
        show_date: show.showDate,
        venue_name: show.venueName,
        city: show.city,
        state: show.state,
        country: show.country,
        capacity: show.capacity || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      await supabase
        .from('shows')
        .insert(insertData);
    }

    // Update tour dates based on shows
    if (shows.length > 0) {
      const dates = shows.map(s => s.showDate).filter(Boolean).sort();
      if (dates.length > 0) {
        await supabase
          .from('tours')
          .update({
            start_date: dates[0],
            end_date: dates[dates.length - 1],
            updated_at: new Date().toISOString()
          })
          .eq('id', tourId);
      }
    }

    return NextResponse.json({
      message: 'Shows updated successfully',
      updated: showsToUpdate.length,
      inserted: showsToInsert.length,
      deleted: idsToDelete.length
    });
  } catch (error: any) {
    console.error('[POST shows] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update shows' },
      { status: 500 }
    );
  }
}
