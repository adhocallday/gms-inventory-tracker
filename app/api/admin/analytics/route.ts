import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { fetchAll } from '@/lib/supabase/fetch-all';

/**
 * GET /api/admin/analytics
 * Get aggregated analytics data across all tours
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tourId = searchParams.get('tourId'); // Optional filter
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');

    const supabase = createServiceClient();

    // Fetch all data in parallel. Shows and sales page through fetchAll:
    // a plain select is capped at 1000 rows, which under-counted revenue.
    const [toursResult, shows, sales] = await Promise.all([
      supabase
        .from('tours')
        .select('id, name, artist, status, start_date, end_date')
        .order('start_date', { ascending: false }),
      fetchAll<{
        id: string;
        tour_id: string;
        show_date: string | null;
        venue_name: string | null;
        city: string | null;
        state: string | null;
        attendance: number | null;
      }>((from, to) =>
        supabase
          .from('shows')
          .select('id, tour_id, show_date, venue_name, city, state, attendance')
          .order('show_date', { ascending: false })
          .order('id')
          .range(from, to)
      ),
      fetchAll<{ show_id: string; qty_sold: number | null; gross_sales: number | null }>((from, to) =>
        supabase.from('sales').select('show_id, qty_sold, gross_sales').order('id').range(from, to)
      ),
    ]);

    if (toursResult.error) throw toursResult.error;
    const tours = toursResult.data || [];

    // Aggregate sales per show in one pass
    const byShow = new Map<string, { gross: number; units: number }>();
    for (const sale of sales) {
      const agg = byShow.get(sale.show_id) ?? { gross: 0, units: 0 };
      agg.gross += Number(sale.gross_sales || 0);
      agg.units += Number(sale.qty_sold || 0);
      byShow.set(sale.show_id, agg);
    }

    // Roll shows up into tours
    const byTour = new Map<string, { gross: number; units: number; attendance: number; showCount: number }>();
    for (const show of shows) {
      const showAgg = byShow.get(show.id) ?? { gross: 0, units: 0 };
      const agg = byTour.get(show.tour_id) ?? { gross: 0, units: 0, attendance: 0, showCount: 0 };
      agg.gross += showAgg.gross;
      agg.units += showAgg.units;
      agg.attendance += Number(show.attendance || 0);
      agg.showCount += 1;
      byTour.set(show.tour_id, agg);
    }

    // Calculate summary metrics
    const totalGross = sales.reduce((sum, s) => sum + Number(s.gross_sales || 0), 0);
    const totalUnits = sales.reduce((sum, s) => sum + Number(s.qty_sold || 0), 0);
    const totalShows = shows.length;
    const totalAttendance = shows.reduce((sum, s) => sum + Number(s.attendance || 0), 0);
    const avgPerHead = totalAttendance > 0 ? totalGross / totalAttendance : 0;

    // Calculate tour-level metrics
    const tourMetrics = tours.map(tour => {
      const agg = byTour.get(tour.id) ?? { gross: 0, units: 0, attendance: 0, showCount: 0 };
      return {
        id: tour.id,
        name: tour.name,
        artist: tour.artist,
        status: tour.status,
        startDate: tour.start_date,
        endDate: tour.end_date,
        showCount: agg.showCount,
        totalGross: agg.gross,
        totalUnits: agg.units,
        totalAttendance: agg.attendance,
        avgPerHead: agg.attendance > 0 ? agg.gross / agg.attendance : 0
      };
    });

    // Sort by gross revenue descending
    const topToursByGross = [...tourMetrics]
      .filter(t => t.totalGross > 0)
      .sort((a, b) => b.totalGross - a.totalGross)
      .slice(0, 10);

    // Sort by per-head descending
    const topToursByPerHead = [...tourMetrics]
      .filter(t => t.avgPerHead > 0)
      .sort((a, b) => b.avgPerHead - a.avgPerHead)
      .slice(0, 10);

    // Recent activity - last 10 shows
    const recentShows = shows.slice(0, 10).map(show => {
      const { gross: showGross, units: showUnits } = byShow.get(show.id) ?? { gross: 0, units: 0 };
      const tour = tours.find(t => t.id === show.tour_id);

      return {
        id: show.id,
        tourName: tour?.name || 'Unknown',
        venueName: show.venue_name,
        city: show.city,
        state: show.state,
        showDate: show.show_date,
        attendance: show.attendance,
        totalGross: showGross,
        totalUnits: showUnits,
        perHead: show.attendance ? showGross / show.attendance : 0
      };
    });

    return NextResponse.json({
      summary: {
        totalGross,
        totalUnits,
        totalShows,
        totalTours: tours.length,
        activeTours: tours.filter(t => t.status === 'active').length,
        totalAttendance,
        avgPerHead
      },
      tourRankings: {
        byGross: topToursByGross,
        byPerHead: topToursByPerHead
      },
      recentShows,
      tours: tourMetrics
    });
  } catch (error: any) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
