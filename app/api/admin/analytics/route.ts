import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

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

    // Fetch all data in parallel
    const [
      toursResult,
      showsResult,
      salesResult,
      productsResult
    ] = await Promise.all([
      // All tours with basic info
      supabase
        .from('tours')
        .select('id, name, artist, status, start_date, end_date')
        .order('start_date', { ascending: false }),

      // All shows with sales summary
      supabase
        .from('shows')
        .select(`
          id,
          tour_id,
          show_date,
          venue_name,
          city,
          state,
          attendance
        `)
        .order('show_date', { ascending: false }),

      // All sales data
      supabase
        .from('sales')
        .select(`
          id,
          show_id,
          tour_product_id,
          qty_sold,
          gross_sales,
          shows:show_id (
            tour_id,
            show_date,
            venue_name
          )
        `),

      // Product info with categories
      supabase
        .from('products')
        .select('id, sku, description, category')
    ]);

    if (toursResult.error) throw toursResult.error;
    if (showsResult.error) throw showsResult.error;
    if (salesResult.error) throw salesResult.error;

    const tours = toursResult.data || [];
    const shows = showsResult.data || [];
    const sales = salesResult.data || [];
    const products = productsResult.data || [];

    // Calculate summary metrics
    const totalGross = sales.reduce((sum, s) => sum + (s.gross_sales || 0), 0);
    const totalUnits = sales.reduce((sum, s) => sum + (s.qty_sold || 0), 0);
    const totalShows = shows.length;
    const totalAttendance = shows.reduce((sum, s) => sum + (s.attendance || 0), 0);
    const avgPerHead = totalAttendance > 0 ? totalGross / totalAttendance : 0;

    // Calculate tour-level metrics
    const tourMetrics = tours.map(tour => {
      const tourShows = shows.filter(s => s.tour_id === tour.id);
      const tourShowIds = new Set(tourShows.map(s => s.id));
      const tourSales = sales.filter(s => {
        const showData = s.shows as any;
        return showData?.tour_id === tour.id;
      });

      const tourGross = tourSales.reduce((sum, s) => sum + (s.gross_sales || 0), 0);
      const tourUnits = tourSales.reduce((sum, s) => sum + (s.qty_sold || 0), 0);
      const tourAttendance = tourShows.reduce((sum, s) => sum + (s.attendance || 0), 0);
      const tourPerHead = tourAttendance > 0 ? tourGross / tourAttendance : 0;

      return {
        id: tour.id,
        name: tour.name,
        artist: tour.artist,
        status: tour.status,
        startDate: tour.start_date,
        endDate: tour.end_date,
        showCount: tourShows.length,
        totalGross: tourGross,
        totalUnits: tourUnits,
        totalAttendance: tourAttendance,
        avgPerHead: tourPerHead
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

    // Calculate category breakdown
    const categoryMap = new Map<string, { gross: number; units: number }>();
    for (const sale of sales) {
      // We'd need to join with tour_products to get category, simplified for now
      const category = 'Unknown'; // Would need additional join
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { gross: 0, units: 0 });
      }
      const current = categoryMap.get(category)!;
      current.gross += sale.gross_sales || 0;
      current.units += sale.qty_sold || 0;
    }

    // Recent activity - last 10 shows
    const recentShows = shows.slice(0, 10).map(show => {
      const showSales = sales.filter(s => s.show_id === show.id);
      const showGross = showSales.reduce((sum, s) => sum + (s.gross_sales || 0), 0);
      const showUnits = showSales.reduce((sum, s) => sum + (s.qty_sold || 0), 0);
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
