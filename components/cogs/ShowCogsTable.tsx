'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Calendar } from 'lucide-react';
import { DataTable, DateCell, NumericCell } from '@/components/ui/DataTable';

export interface ShowCogsRow {
  show_id: string;
  show_date: string;
  venue_name: string;
  city: string;
  state: string;
  total_gross: number;
  attendance: number;
  per_head: number;
  cogs: number;
  margin: number;
  margin_percentage: number;
}

interface ShowCogsTableProps {
  data: ShowCogsRow[];
  loading?: boolean;
}

export function ShowCogsTable({ data, loading }: ShowCogsTableProps) {
  const columns: ColumnDef<ShowCogsRow>[] = useMemo(
    () => [
      {
        accessorKey: 'show_date',
        header: 'Date',
        cell: ({ row }) => <DateCell value={row.getValue('show_date')} />,
        enableSorting: true,
      },
      {
        accessorKey: 'venue_name',
        header: 'Venue',
        cell: ({ row }) => (
          <span className="text-[var(--g-text)]">{row.getValue('venue_name')}</span>
        ),
        enableSorting: true,
      },
      {
        id: 'location',
        header: 'City',
        cell: ({ row }) => (
          <span className="text-[var(--g-text-dim)]">
            {row.original.city}, {row.original.state}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'attendance',
        header: 'Attendance',
        cell: ({ row }) => <NumericCell value={row.getValue('attendance') || 0} format="number" />,
        enableSorting: true,
      },
      {
        accessorKey: 'total_gross',
        header: 'Revenue',
        cell: ({ row }) => <NumericCell value={row.getValue('total_gross') || 0} format="currency" />,
        enableSorting: true,
      },
      {
        accessorKey: 'cogs',
        header: 'COGS',
        cell: ({ row }) => (
          <div className="text-right text-red-300">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(row.getValue('cogs') || 0)}
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'margin',
        header: 'Margin',
        cell: ({ row }) => (
          <div className="text-right text-green-300">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(row.getValue('margin') || 0)}
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'margin_percentage',
        header: 'Margin %',
        cell: ({ row }) => {
          const marginPct = row.getValue('margin_percentage') as number;
          return (
            <div className={`text-right font-semibold ${
              marginPct >= 50
                ? 'text-green-300'
                : marginPct >= 30
                ? 'text-yellow-300'
                : 'text-red-300'
            }`}>
              {marginPct.toFixed(1)}%
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'per_head',
        header: 'Per Head',
        cell: ({ row }) => <NumericCell value={row.getValue('per_head') || 0} format="currency" />,
        enableSorting: true,
      },
    ],
    []
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      loading={loading}
      stickyHeader
      striped
      emptyState={{
        icon: <Calendar className="w-12 h-12 text-[var(--g-text-muted)]" />,
        title: 'No show data',
        description: 'Upload sales reports to see show-level COGS analysis',
      }}
    />
  );
}
