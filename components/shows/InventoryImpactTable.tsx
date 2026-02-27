'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowDownUp } from 'lucide-react';
import { DataTable, NumericCell } from '@/components/ui/DataTable';

export interface InventoryImpactRow {
  sku: string;
  description: string;
  size: string;
  startingBalance: number | null;
  soldThisShow: number;
  compsThisShow: number;
  endingBalance: number | null;
}

interface InventoryImpactTableProps {
  data: InventoryImpactRow[];
  loading?: boolean;
}

export function InventoryImpactTable({ data, loading }: InventoryImpactTableProps) {
  const columns: ColumnDef<InventoryImpactRow>[] = useMemo(
    () => [
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-[var(--color-text-primary)]">{row.getValue('sku')}</div>
            <div className="text-xs text-[var(--color-text-muted)]">{row.original.description}</div>
          </div>
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
        accessorKey: 'startingBalance',
        header: 'Starting',
        cell: ({ row }) => {
          const value = row.getValue('startingBalance') as number | null;
          return value === null ? (
            <span className="text-right text-[var(--color-text-muted)]">—</span>
          ) : (
            <NumericCell value={value} format="number" />
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'soldThisShow',
        header: 'Sold',
        cell: ({ row }) => {
          const value = row.getValue('soldThisShow') as number;
          return (
            <div className={`text-right ${value > 0 ? 'text-red-300' : ''}`}>
              {value > 0 ? `-${value}` : value}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'compsThisShow',
        header: 'Comps',
        cell: ({ row }) => {
          const value = row.getValue('compsThisShow') as number;
          return (
            <div className={`text-right ${value > 0 ? 'text-yellow-300' : ''}`}>
              {value > 0 ? `-${value}` : value}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'endingBalance',
        header: 'Ending',
        cell: ({ row }) => {
          const value = row.getValue('endingBalance') as number | null;
          if (value === null) {
            return <span className="text-right text-[var(--color-text-muted)]">—</span>;
          }
          return (
            <div className={`text-right font-semibold ${
              value <= 0 ? 'text-red-300' : value < 10 ? 'text-yellow-300' : 'text-green-300'
            }`}>
              {value}
            </div>
          );
        },
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
        icon: <ArrowDownUp className="w-12 h-12 text-[var(--color-text-muted)]" />,
        title: 'No inventory data',
        description: 'Inventory impact will be calculated once products are assigned',
      }}
    />
  );
}
