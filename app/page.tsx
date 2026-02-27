import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { ToursGrid, type TourWithStats } from '@/components/tours/ToursGrid';
import { Button } from '@/components/ui/Button';
import { RecentActivityPanel, type RecentDocument } from '@/components/dashboard/RecentActivityPanel';
import { UpcomingShowsPanel, type UpcomingShow } from '@/components/dashboard/UpcomingShowsPanel';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { cn } from '@/lib/utils';

type TourRow = {
  id: string;
  name: string;
  artist: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

export default async function DashboardPage() {
  const { data: tours } = await supabase
    .from('tours')
    .select('id, name, artist, start_date, end_date, status')
    .order('start_date', { ascending: false });

  const tourList = (tours ?? []) as TourRow[];

  const { data: shows } = await supabase.from('shows').select('id, tour_id, show_date');
  const { data: tourProducts } = await supabase
    .from('tour_products')
    .select('id, tour_id');
  const { data: grossRows } = await supabase
    .from('cogs_summary')
    .select('tour_id, total_gross');

  // Recent parsed documents for activity feed
  const { data: recentDocs } = await supabase
    .from('parsed_documents')
    .select('id, doc_type, status, source_filename, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  // Count pending documents (draft or error status)
  const { count: pendingDocsCount } = await supabase
    .from('parsed_documents')
    .select('*', { count: 'exact', head: true })
    .in('status', ['draft', 'error']);

  // Upcoming shows (future dates)
  const { data: upcomingShowsRaw } = await supabase
    .from('shows')
    .select('id, tour_id, show_date, venue_name, city')
    .gt('show_date', new Date().toISOString())
    .order('show_date', { ascending: true })
    .limit(5);

  // Create tour name lookup
  const tourNameMap = new Map<string, string>();
  for (const tour of tours ?? []) {
    tourNameMap.set(tour.id, tour.name);
  }

  // Transform upcoming shows with tour names
  const upcomingShows: UpcomingShow[] = (upcomingShowsRaw ?? []).map((show) => ({
    id: show.id,
    tour_id: show.tour_id,
    show_date: show.show_date,
    venue_name: show.venue_name,
    city: show.city,
    tour_name: tourNameMap.get(show.tour_id) ?? 'Unknown Tour',
  }));

  const showsByTour = new Map<string, number>();
  const completedShowsByTour = new Map<string, number>();
  const today = new Date();

  for (const show of shows ?? []) {
    showsByTour.set(show.tour_id, (showsByTour.get(show.tour_id) ?? 0) + 1);

    // Check if show is in the past
    if (show.show_date && new Date(show.show_date) < today) {
      completedShowsByTour.set(show.tour_id, (completedShowsByTour.get(show.tour_id) ?? 0) + 1);
    }
  }

  const productsByTour = new Map<string, number>();
  for (const tp of tourProducts ?? []) {
    productsByTour.set(tp.tour_id, (productsByTour.get(tp.tour_id) ?? 0) + 1);
  }

  const grossByTour = new Map<string, number>();
  for (const row of grossRows ?? []) {
    const grossValue = Number(row.total_gross ?? 0);
    grossByTour.set(row.tour_id, (grossByTour.get(row.tour_id) ?? 0) + grossValue);
  }

  const totalGross = Array.from(grossByTour.values()).reduce(
    (sum, value) => sum + value,
    0
  );

  // Prepare tours with stats for client component
  const toursWithStats: TourWithStats[] = tourList.map((tour) => ({
    ...tour,
    showCount: showsByTour.get(tour.id) ?? 0,
    completedShowCount: completedShowsByTour.get(tour.id) ?? 0,
    productCount: productsByTour.get(tour.id) ?? 0,
    gross: grossByTour.get(tour.id) ?? 0,
  }));

  const totalProductsCount = Array.from(productsByTour.values()).reduce(
    (sum, value) => sum + value,
    0
  );
  const pendingDocs = pendingDocsCount ?? 0;

  const kpiCards = [
    {
      label: 'Tours tracked',
      value: tourList.length,
      trend: 'Live tours',
    },
    {
      label: 'Total gross sales',
      value: currencyFormatter.format(totalGross),
      trend: 'Revenue across tours',
      primary: true,
    },
    {
      label: 'Active tour products',
      value: totalProductsCount,
      trend: 'Cataloged SKUs',
    },
    {
      label: 'Pending documents',
      value: pendingDocs,
      trend: 'Needs approval',
    },
  ];

  return (
    <div className="space-y-10 py-6">
      <header className="space-y-3">
        <p className="g-kicker">Tour operations</p>
        <h1 className="text-4xl font-semibold g-title">Tour Dashboard</h1>
        <p className="text-sm text-[var(--color-text-secondary)] max-w-3xl">
          Live view of active tours, inventory status, and quick access to document review workflows.
        </p>
        <div className="pt-2">
          <Link href="/upload">
            <Button>Upload document</Button>
          </Link>
        </div>
      </header>

      <div className="kpi-grid">
        {kpiCards.map((card) => (
          <article
            key={card.label}
            className={cn('kpi-card', { 'kpi-primary': card.primary })}
          >
            <div className="kpi-label">{card.label}</div>
            <div className="kpi-value font-mono">{card.value}</div>
            <div className="kpi-trend flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background:
                    card.label === 'Pending documents'
                      ? 'var(--color-status-warning)'
                      : 'var(--color-text-secondary)',
                }}
              />
              <span>{card.trend}</span>
            </div>
          </article>
        ))}
      </div>

      {(pendingDocs > 0 || upcomingShows.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingDocs > 0 && (
            <InsightCard
              type="warning"
              title="Documents need review"
              description={`${pendingDocs} document${pendingDocs !== 1 ? 's' : ''} waiting for approval or have errors`}
              linkText="Review documents"
              linkHref="/dashboard/parsed-documents"
              className="insight-alert"
            />
          )}
          {upcomingShows.length > 0 && (
            <InsightCard
              type="info"
              title={`${upcomingShows.length} upcoming show${upcomingShows.length !== 1 ? 's' : ''}`}
              description={`Next: ${upcomingShows[0].venue_name || 'TBD'} on ${new Date(
                upcomingShows[0].show_date
              ).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}`}
              linkText="View show"
              linkHref={`/tours/${upcomingShows[0].tour_id}/shows/${upcomingShows[0].id}`}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivityPanel documents={(recentDocs ?? []) as RecentDocument[]} />
        <UpcomingShowsPanel shows={upcomingShows} />
      </div>

      <ToursGrid tours={toursWithStats} />
    </div>
  );
}
