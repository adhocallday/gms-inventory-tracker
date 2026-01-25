'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Calendar, Music } from 'lucide-react';
import { DataTable, DateCell } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';

interface Tour {
  id: string;
  name: string;
  artist: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  shows?: Array<{ count: number }>;
}

interface ToursTableProps {
  tours: Tour[];
}

export function ToursTable({ tours }: ToursTableProps) {
  const columns: ColumnDef<Tour>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Tour Name',
        cell: ({ row }) => (
          <div className="font-medium text-[var(--g-text)]">
            {row.getValue('name')}
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'artist',
        header: 'Artist',
        cell: ({ row }) => (
          <div className="text-[var(--g-text-dim)]">
            {row.getValue('artist') || <span className="text-[var(--g-text-muted)]">—</span>}
          </div>
        ),
        enableSorting: true,
      },
      {
        id: 'dates',
        header: 'Dates',
        cell: ({ row }) => {
          const startDate = row.original.start_date;
          const endDate = row.original.end_date;

          if (!startDate || !endDate) {
            return <span className="text-[var(--g-text-muted)]">No dates set</span>;
          }

          return (
            <div className="text-[var(--g-text-dim)] text-sm">
              <DateCell value={startDate} /> - <DateCell value={endDate} />
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: 'shows',
        header: 'Shows',
        cell: ({ row }) => {
          const count = row.original.shows?.[0]?.count || 0;
          return (
            <div className="text-[var(--g-text-dim)]">
              <span className="font-mono">{count}</span> {count === 1 ? 'show' : 'shows'}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as string;
          return <Badge variant={status as any}>{status}</Badge>;
        },
        enableSorting: true,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="text-right">
            <Link
              href={`/admin/tours/${row.original.id}/edit`}
              className="text-sm text-[var(--g-accent)] hover:text-[var(--g-accent-2)] font-medium transition"
            >
              Edit →
            </Link>
          </div>
        ),
        enableSorting: false,
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={tours}
      stickyHeader
      striped
      emptyState={{
        icon: <Music className="w-12 h-12 text-[var(--g-text-muted)]" />,
        title: 'No tours found',
        description: 'Create your first tour to get started',
      }}
    />
  );
}
