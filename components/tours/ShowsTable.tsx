'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Calendar } from 'lucide-react';
import { DataTable, NumericCell, DateCell } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';

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

export default function ShowsTable({ tourId, shows }: ShowsTableProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const visibleShows = useMemo(() => shows.slice(0, visibleCount), [shows, visibleCount]);
  const canLoadMore = visibleCount < shows.length;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(shows.length, prev + INITIAL_COUNT));
  };

  const columns: ColumnDef<ShowSummaryRow>[] = useMemo(
    () => [
      {
        accessorKey: 'show_date',
        header: 'Date',
        cell: ({ row }) => (
          <Link
            className="g-link font-medium"
            href={`/tours/${tourId}/shows/${row.original.show_id}`}
          >
            <DateCell value={row.getValue('show_date')} />
          </Link>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'venue_name',
        header: 'Venue',
        cell: ({ row }) => row.getValue('venue_name') || <span className="text-[var(--g-text-muted)]">TBD</span>,
        enableSorting: true,
      },
      {
        id: 'location',
        header: 'City',
        cell: ({ row }) => {
          const city = row.original.city;
          const state = row.original.state;
          if (!city) return <span className="text-[var(--g-text-muted)]">—</span>;
          return (
            <span>
              {city}
              {state ? `, ${state}` : ''}
            </span>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: 'total_gross',
        header: 'Gross',
        cell: ({ row }) => (
          <div className="text-right">
            <NumericCell value={row.getValue('total_gross')} format="currency" />
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'per_head',
        header: 'Per-head',
        cell: ({ row }) => (
          <div className="text-right">
            <NumericCell value={row.getValue('per_head')} format="currency" />
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'total_comps',
        header: 'Comps',
        cell: ({ row }) => (
          <div className="text-right">
            <NumericCell value={row.getValue('total_comps')} format="number" />
          </div>
        ),
        enableSorting: true,
      },
    ],
    [tourId]
  );

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold g-title">Shows</h2>
        <Link href={`/upload?docType=sales-report&tourId=${tourId}`}>
          <Button variant="outline" size="sm">
            Upload document
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={visibleShows}
        stickyHeader
        striped
        emptyState={{
          icon: <Calendar className="w-12 h-12 text-[var(--g-text-muted)]" />,
          title: 'No shows yet',
          description: 'Upload a sales report to add shows to this tour',
        }}
      />

      {canLoadMore && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={handleLoadMore}>
            Load more shows ({shows.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </section>
  );
}
