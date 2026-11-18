import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { ToursGrid, type TourWithStats } from '@/components/tours/ToursGrid';
import { Upload } from 'lucide-react';
import { buttonVariants } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatNumber } from '@/lib/format';
import { RecentActivityPanel, type RecentDocument } from '@/components/dashboard/RecentActivityPanel';
import { UpcomingShowsPanel, type UpcomingShow } from '@/components/dashboard/UpcomingShowsPanel';
import { cn } from '@/lib/utils';
import { fetchAll } from '@/lib/supabase/fetch-all';
import { FirstVisitRedirect } from '@/components/onboarding/FirstVisitRedirect';

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

// Dashboard data can be up to 30s stale; mutations call revalidatePath('/')
export const revalidate = 30;

export default async function DashboardPage() {
  // All dashboard queries are independent: run them in parallel. Row-level
  // aggregates page through fetchAll so totals aren't cut off at 1000 rows.
  // A failed aggregate renders as empty (like the other queries) instead of
  // failing the page, which is also prerendered at build time.
  const orEmpty = <T,>(promise: Promise<T[]>) =>
    promise.catch((error) => {
      console.error('[Dashboard] Query failed:', error);
      return [] as T[];
    });
  const [
    { data: tours },
    shows,
    tourProducts,
    grossRows,
    { data: recentDocs },
    { count: pendingDocsCount },
    { data: upcomingShowsRaw },
  ] = await Promise.all([
    supabase
      .from('tours')
      .select('id, name, artist, start_date, end_date, status')
      .order('start_date', { ascending: false }),
    orEmpty(
      fetchAll<{ tour_id: string; show_date: string | null }>((from, to) =>
        supabase.from('shows').select('tour_id, show_date').order('id').range(from, to)
      )
    ),
    orEmpty(
      fetchAll<{ tour_id: string }>((from, to) =>
        supabase.from('tour_products').select('tour_id').order('id').range(from, to)
      )
    ),
    orEmpty(
      fetchAll<{ tour_id: string; total_gross: number | null }>((from, to) =>
        supabase
          .from('cogs_summary')
          .select('tour_id, total_gross')
          .order('tour_id')
          .order('product_id')
          .order('size')
          .range(from, to)
      )
    ),
    // Recent parsed documents for activity feed
    supabase
      .from('parsed_documents')
      .select('id, doc_type, status, source_filename, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    // Count pending documents (draft or error status)
    supabase
      .from('parsed_documents')
      .select('id', { count: 'exact', head: true })
      .in('status', ['draft', 'error']),
    // Upcoming shows (future dates)
    supabase
      .from('shows')
      .select('id, tour_id, show_date, venue_name, city')
      .gt('show_date', new Date().toISOString())
      .order('show_date', { ascending: true })
      .limit(5),
  ]);

  const tourList = (tours ?? []) as TourRow[];

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

  const kpiCards: { label: string; value: string; note: string; href?: string; attention?: boolean }[] = [
    {
      label: 'Tours',
      value: formatNumber(tourList.length),
      note: `${tourList.filter((t) => t.status === 'active').length} active`,
    },
    {
      label: 'Gross sales',
      value: currencyFormatter.format(totalGross),
      note: 'All tours, posted sales',
    },
    {
      label: 'Tour products',
      value: formatNumber(totalProductsCount),
      note: 'SKU and size lines',
    },
    {
      label: 'Documents to review',
      value: formatNumber(pendingDocs),
      note: pendingDocs > 0 ? 'Drafts and parse errors. Review →' : 'Nothing waiting',
      href: '/dashboard/parsed-documents',
      attention: pendingDocs > 0,
    },
  ];

  return (
    <div className="space-y-8 py-6">
      <FirstVisitRedirect />
      <PageHeader
        title="Tours"
        subtitle="Every tour with its posted sales, and the documents waiting for review."
        actions={
          <Link href="/upload" className={buttonVariants()}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload document
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-tour="home-kpis">
        {kpiCards.map((card) => {
          const body = (
            <>
              <div className="text-[13px] font-medium text-[var(--color-text-secondary)]">{card.label}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">
                {card.value}
              </div>
              <div
                className={cn(
                  'mt-1 text-xs',
                  card.attention ? 'font-medium text-warn' : 'text-[var(--color-text-secondary)]'
                )}
              >
                {card.note}
              </div>
            </>
          );
          const base = 'rounded-lg border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] p-4';
          return card.href ? (
            <Link
              key={card.label}
              href={card.href}
              className={cn(base, 'transition-colors hover:border-[var(--color-text-muted)]')}
            >
              {body}
            </Link>
          ) : (
            <article key={card.label} className={base}>
              {body}
            </article>
          );
        })}
      </div>

      <div data-tour="tours-dashboard">
        <ToursGrid tours={toursWithStats} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-tour="home-activity">
        <RecentActivityPanel documents={(recentDocs ?? []) as RecentDocument[]} />
        <UpcomingShowsPanel shows={upcomingShows} />
      </div>
    </div>
  );
}
