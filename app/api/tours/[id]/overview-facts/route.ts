import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { fetchAll } from '@/lib/supabase/fetch-all';
import { summarizeTour } from '@/components/onboarding/tour-facts';

/**
 * Headline figures for the guided tour's overview: gross, shows with sales,
 * units, attendance and per head, summed from the same posted records the
 * tour page and reports read (show_summary_view and sales).
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServiceClient();
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('id, name, artist')
      .eq('id', params.id)
      .maybeSingle();
    if (tourError) throw tourError;
    if (!tour) return NextResponse.json({ error: 'Tour not found' }, { status: 404 });

    const [shows, sales] = await Promise.all([
      fetchAll<{ show_id: string; total_gross: number | string | null; attendance: number | null }>((from, to) =>
        supabase
          .from('show_summary_view')
          .select('show_id, total_gross, attendance')
          .eq('tour_id', params.id)
          .order('show_id')
          .range(from, to),
      ),
      fetchAll<{ qty_sold: number | null }>((from, to) =>
        supabase
          .from('sales')
          .select('id, qty_sold, shows!inner(tour_id)')
          .eq('shows.tour_id', params.id)
          .order('id')
          .range(from, to),
      ),
    ]);

    return NextResponse.json({
      data: { tourName: tour.name, artist: tour.artist, ...summarizeTour(shows, sales) },
    });
  } catch (err) {
    console.error('[overview-facts] failed', err);
    return NextResponse.json({ error: 'Failed to load tour figures' }, { status: 500 });
  }
}
