'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';

export interface ShowSummaryRow {
  show_id: string;
  show_date: string;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  total_gross: number | null;
  per_head: number | null;
  total_comps: number | null;
}

interface ShowsTableProps {
  tourId: string;
  shows: ShowSummaryRow[];
}

const INITIAL_COUNT = 10;

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const formatNumber = (value: number) => value.toLocaleString();

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

export default function ShowsTable({ tourId, shows }: ShowsTableProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const visibleShows = useMemo(() => shows.slice(0, visibleCount), [shows, visibleCount]);
  const canLoadMore = visibleCount < shows.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(shows.length, prev + INITIAL_COUNT));
  };

  return (
    <section className="g-card p-6 mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold g-title">Shows</h2>
        <Link
          href={`/upload?docType=sales-report&tourId=${tourId}`}
          className="text-sm font-medium g-link"
        >
          Upload document
        </Link>
      </div>
      <div className="overflow-x-auto mt-4">
        <table className="min-w-full text-sm g-table">
          <thead className="text-left border-b border-white/10">
            <tr>
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Venue</th>
              <th className="py-2 pr-4">City</th>
              <th className="py-2 pr-4 text-right">Gross</th>
              <th className="py-2 pr-4 text-right">Per-head</th>
              <th className="py-2 pr-4 text-right">Comps</th>
            </tr>
          </thead>
          <tbody>
            {visibleShows.length === 0 ? (
              <tr>
                <td className="py-3" colSpan={6}>
                  No shows logged yet.
                </td>
              </tr>
            ) : (
              visibleShows.map((show) => (
                <tr key={show.show_id} className="border-b border-white/10 hover:bg-white/5 transition">
                  <td className="py-3 pr-4">
                    <Link
                      className="g-link"
                      href={`/tours/${tourId}/shows/${show.show_id}`}
                    >
                      {formatDate(show.show_date)}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">{show.venue_name ?? 'TBD'}</td>
                  <td className="py-3 pr-4">
                    {show.city ?? '—'}
                    {show.state ? `, ${show.state}` : ''}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {currencyFormatter.format(Number(show.total_gross ?? 0))}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {currencyFormatter.format(Number(show.per_head ?? 0))}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatNumber(Number(show.total_comps ?? 0))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {canLoadMore && (
          <div className="flex justify-center mt-6 pb-2">
            <button
              onClick={handleLoadMore}
              className="px-6 py-2 rounded-full border border-[var(--g-border)] hover:border-[var(--g-accent)] text-sm transition"
            >
              Load more shows ({shows.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
