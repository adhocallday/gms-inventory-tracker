import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export default async function AdminToursPage() {
  const supabase = createServiceClient();

  // Fetch all tours
  const { data: tours, error } = await supabase
    .from('tours')
    .select('*, shows(count)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch tours:', error);
  }

  return (
    <div className="g-container py-12">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--g-text-muted)]">
              Admin Panel
            </p>
            <h1 className="text-3xl font-semibold g-title mt-2">Manage Tours</h1>
            <p className="text-sm text-[var(--g-text-dim)] mt-2 max-w-3xl">
              Edit existing tours, add shows, manage products, and extend tour dates.
            </p>
          </div>
          <Link
            href="/admin/tours/new"
            className="px-6 py-2 bg-[var(--g-accent)] text-white rounded-lg hover:bg-[var(--g-accent-2)] transition font-semibold"
          >
            + Create New Tour
          </Link>
        </div>
      </header>

      {tours && tours.length > 0 ? (
        <div className="g-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--g-text-muted)] uppercase tracking-wider">
                    Tour Name
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--g-text-muted)] uppercase tracking-wider">
                    Artist
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--g-text-muted)] uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--g-text-muted)] uppercase tracking-wider">
                    Shows
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--g-text-muted)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {tours.map((tour: any) => (
                  <tr key={tour.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-[var(--g-text)]">
                        {tour.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-[var(--g-text-dim)]">
                        {tour.artist}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-[var(--g-text-dim)]">
                        {tour.start_date && tour.end_date ? (
                          <>
                            {new Date(tour.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {' - '}
                            {new Date(tour.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </>
                        ) : (
                          'No dates set'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-[var(--g-text-dim)]">
                        {tour.shows?.[0]?.count || 0} shows
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tour.status === 'active'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-gray-500/10 text-gray-400'
                      }`}>
                        {tour.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/tours/${tour.id}/edit`}
                        className="text-sm text-[var(--g-accent)] hover:underline font-medium"
                      >
                        Edit →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="g-card p-12 text-center">
          <p className="text-[var(--g-text-dim)] mb-4">
            No tours found. Create your first tour to get started.
          </p>
          <Link
            href="/admin/tours/new"
            className="inline-flex px-6 py-2 bg-[var(--g-accent)] text-white rounded-lg hover:bg-[var(--g-accent-2)] transition font-semibold"
          >
            + Create New Tour
          </Link>
        </div>
      )}
    </div>
  );
}
