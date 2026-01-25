import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { ToursGrid, type TourWithStats } from '@/components/tours/ToursGrid';
import { Button } from '@/components/ui/Button';

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

  const { data: shows } = await supabase.from('shows').select('id, tour_id');
  const { data: tourProducts } = await supabase
    .from('tour_products')
    .select('id, tour_id');
  const { data: grossRows } = await supabase
    .from('cogs_summary')
    .select('tour_id, total_gross');

  const showsByTour = new Map<string, number>();
  for (const show of shows ?? []) {
    showsByTour.set(show.tour_id, (showsByTour.get(show.tour_id) ?? 0) + 1);
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
    productCount: productsByTour.get(tour.id) ?? 0,
    gross: grossByTour.get(tour.id) ?? 0,
  }));

  return (
    <div className="g-container py-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="g-kicker">Tour operations</p>
          <h1 className="text-3xl font-semibold g-title mt-3">
            Tour Dashboard
          </h1>
          <p className="text-sm text-[var(--g-text-dim)] mt-2 max-w-2xl">
            Live view of active tours, inventory status, and quick access to
            document review workflows.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/upload">
            <Button>Upload document</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="g-card p-6">
          <p className="text-xs text-[var(--g-text-muted)] uppercase tracking-wide">
            Tours tracked
          </p>
          <p className="text-3xl font-bold mt-2">
            {tourList.length}
          </p>
        </div>
        <div className="g-card p-6">
          <p className="text-xs text-[var(--g-text-muted)] uppercase tracking-wide">
            Total gross sales
          </p>
          <p className="text-3xl font-bold mt-2">
            {currencyFormatter.format(totalGross)}
          </p>
        </div>
        <div className="g-card p-6">
          <p className="text-xs text-[var(--g-text-muted)] uppercase tracking-wide">
            Active tour products
          </p>
          <p className="text-3xl font-bold mt-2">
            {Array.from(productsByTour.values()).reduce(
              (sum, value) => sum + value,
              0
            )}
          </p>
        </div>
      </div>

      <ToursGrid tours={toursWithStats} />
    </div>
  );
}
