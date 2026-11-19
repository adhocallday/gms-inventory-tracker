'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowDownUp } from 'lucide-react';
import { DataTable, NumericCell } from '@/components/ui/DataTable';
import { cn } from '@/lib/utils';

export interface InventoryImpactRow {
  sku: string;
  description: string;
  size: string;
  startingBalance: number | null;
  soldThisShow: number;
  compsThisShow: number;
  endingBalance: number | null;
  /** No receipts recorded for this SKU and size up to the show: balances are sales only. */
  noReceipts?: boolean;
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
            <div className="text-[12.5px] text-[var(--color-text-secondary)]">{row.original.description}</div>
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
        meta: { align: 'right' },
        cell: ({ row }) => {
          const value = row.getValue('startingBalance') as number | null;
          return (
            <div className={cn('text-right', row.original.noReceipts && 'text-[var(--color-text-secondary)]')}>
              {value === null ? '—' : <NumericCell value={value} format="number" />}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'soldThisShow',
        header: 'Sold',
        meta: { align: 'right' },
        cell: ({ row }) => {
          const value = row.getValue('soldThisShow') as number;
          return <div className="text-right tabular-nums">{value > 0 ? `−${value.toLocaleString()}` : value}</div>;
        },
        enableSorting: true,
      },
      {
        accessorKey: 'compsThisShow',
        header: 'Comps',
        meta: { align: 'right' },
        cell: ({ row }) => {
          const value = row.getValue('compsThisShow') as number;
          return <div className="text-right tabular-nums">{value > 0 ? `−${value.toLocaleString()}` : value}</div>;
        },
        enableSorting: true,
      },
      {
        accessorKey: 'endingBalance',
        header: 'Ending',
        meta: { align: 'right' },
        cell: ({ row }) => {
          const value = row.getValue('endingBalance') as number | null;
          if (value === null) {
            return <div className="text-right text-[var(--color-text-secondary)]">—</div>;
          }
          // Without receipts the balance is just units sold, negated: keep the
          // figure, but don't colour it as a stock-out.
          if (row.original.noReceipts) {
            return (
              <div className="text-right">
                <div className="tabular-nums text-[var(--color-text-secondary)]">{value.toLocaleString()}</div>
                <div className="text-[12.5px] text-[var(--color-text-secondary)]">No received stock recorded</div>
              </div>
            );
          }
          return (
            <div
              className={cn(
                'text-right font-semibold tabular-nums',
                value <= 0 ? 'text-danger' : value < 10 ? 'text-warn' : 'text-[var(--color-text-primary)]'
              )}
            >
              {value.toLocaleString()}
              {value <= 0 && <span className="block text-[12.5px] font-normal">Out of stock</span>}
              {value > 0 && value < 10 && <span className="block text-[12.5px] font-normal">Low</span>}
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
        title: 'No products on this tour',
        description: 'Add products to the tour to see stock before and after the show.',
      }}
    />
  );
}
