'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Gift } from 'lucide-react';
import { DataTable, NumericCell } from '@/components/ui/DataTable';

export interface CompRow {
  comp_type: string;
  sku: string;
  size: string;
  quantity: number;
}

interface CompsTableProps {
  data: CompRow[];
  loading?: boolean;
}

export function CompsTable({ data, loading }: CompsTableProps) {
  const columns: ColumnDef<CompRow>[] = useMemo(
    () => [
      {
        accessorKey: 'comp_type',
        header: 'Type',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-primary)]">{row.getValue('comp_type')}</span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => (
          <span className="font-semibold text-[var(--color-text-primary)]">{row.getValue('sku')}</span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'size',
        header: 'Size',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-secondary)]">{row.getValue('size') || '—'}</span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'quantity',
        header: 'Qty',
        cell: ({ row }) => <NumericCell value={row.getValue('quantity')} format="number" />,
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
        icon: <Gift className="w-12 h-12 text-[var(--color-text-muted)]" />,
        title: 'No comps recorded',
        description: 'Comp items will appear here when sales reports are processed',
      }}
    />
  );
}
