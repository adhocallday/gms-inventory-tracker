import { createServiceClient } from '@/lib/supabase/client';
import { fetchAll } from '@/lib/supabase/fetch-all';

/**
 * Totals and rankings across every tour, from posted sales.
 * Shared by /admin/analytics (server-rendered) and GET /api/admin/analytics.
 */

export interface TourMetric {
  id: string;
  name: string;
  artist: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  showCount: number;
  totalGross: number;
  totalUnits: number;
  totalAttendance: number;
  avgPerHead: number;
}

export interface RecentShow {
  id: string;
  tourName: string;
  venueName: string | null;
  city: string | null;
  state: string | null;
  showDate: string | null;
  attendance: number | null;
  totalGross: number;
  totalUnits: number;
  perHead: number | null;
}

export interface AnalyticsData {
  summary: {
    totalGross: number;
    totalUnits: number;
    totalShows: number;
    totalTours: number;
    activeTours: number;
    totalAttendance: number;
    avgPerHead: number;
    showsWithoutSales: number;
  };
  tourRankings: { byGross: TourMetric[]; byPerHead: TourMetric[] };
  recentShows: RecentShow[];
  tours: TourMetric[];
}

export async function loadAnalytics(): Promise<AnalyticsData> {
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

  // Recent shows: the latest 10 shows with posted sales. The newest shows on
  // a tour often have no sales report posted yet; listing them showed $0
  // gross and 0 attendance under totals that came from posted sales.
  const showsWithSales = shows.filter((show) => byShow.has(show.id));
  const showsWithoutSales = shows.filter((show) => !byShow.has(show.id));
  const recentShows = showsWithSales.slice(0, 10).map(show => {
    const { gross: showGross, units: showUnits } = byShow.get(show.id) ?? { gross: 0, units: 0 };
    const tour = tours.find(t => t.id === show.tour_id);

    return {
      id: show.id,
      tourName: tour?.name || 'Unknown',
      venueName: show.venue_name,
      city: show.city,
      state: show.state,
      showDate: show.show_date,
      // null, not 0, when the settlement or report has no attendance
      attendance: show.attendance ?? null,
      totalGross: showGross,
      totalUnits: showUnits,
      perHead: show.attendance ? showGross / show.attendance : null
    };
  });

  return {
    summary: {
      totalGross,
      totalUnits,
      totalShows,
      totalTours: tours.length,
      activeTours: tours.filter(t => t.status === 'active').length,
      totalAttendance,
      avgPerHead,
      showsWithoutSales: showsWithoutSales.length
    },
    tourRankings: {
      byGross: topToursByGross,
      byPerHead: topToursByPerHead
    },
    recentShows,
    tours: tourMetrics
  };
}
