import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

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

function formatDate(value?: string | null) {
  if (!value) return 'TBD';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return 'Dates TBD';
  if (start && !end) return `Starts ${formatDate(start)}`;
  if (!start && end) return `Ends ${formatDate(end)}`;
  return `${formatDate(start)} — ${formatDate(end)}`;
}

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Tour Dashboard
          </h1>
          <p className="text-gray-600 mt-2 max-w-2xl">
            Live view of active tours, inventory status, and quick access to
            document review workflows.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/upload/po"
            className="inline-flex items-center px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800"
          >
            Upload Purchase Order
          </Link>
          <Link
            href="/upload/packing-list"
            className="inline-flex items-center px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-md hover:border-gray-400"
          >
            Upload Packing List
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Tours tracked</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">
            {tourList.length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total gross sales</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">
            {currencyFormatter.format(totalGross)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Active tour products</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">
            {Array.from(productsByTour.values()).reduce(
              (sum, value) => sum + value,
              0
            )}
          </p>
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Available Tours
          </h2>
          <Link
            href="/upload/sales-report"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Upload Sales Report
          </Link>
        </div>

        {tourList.length === 0 ? (
          <div className="mt-6 bg-white border border-dashed border-gray-300 rounded-lg p-6 text-gray-600">
            No tours yet. Seed the database or add a tour to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {tourList.map((tour) => {
              const showCount = showsByTour.get(tour.id) ?? 0;
              const productCount = productsByTour.get(tour.id) ?? 0;
              const gross = grossByTour.get(tour.id) ?? 0;

              return (
                <Link
                  key={tour.id}
                  href={`/tours/${tour.id}`}
                  className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-400 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {tour.name}
                      </h3>
                      <p className="text-sm text-gray-500">{tour.artist}</p>
                    </div>
                    <span className="text-xs uppercase tracking-wide text-gray-500">
                      {tour.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    {formatDateRange(tour.start_date, tour.end_date)}
                  </p>
                  <div className="grid grid-cols-3 gap-4 mt-4 text-sm text-gray-600">
                    <div>
                      <p className="text-gray-400">Shows</p>
                      <p className="text-gray-900 font-semibold">{showCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Products</p>
                      <p className="text-gray-900 font-semibold">
                        {productCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Gross</p>
                      <p className="text-gray-900 font-semibold">
                        {currencyFormatter.format(gross)}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
