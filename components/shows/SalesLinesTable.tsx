'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { ShoppingCart } from 'lucide-react';
import { DataTable, NumericCell } from '@/components/ui/DataTable';

export interface SalesLineRow {
  sku: string;
  description: string;
  size: string;
  qty_sold: number;
  unit_price: number;
  gross_sales: number;
}

interface SalesLinesTableProps {
  data: SalesLineRow[];
  loading?: boolean;
}

export function SalesLinesTable({ data, loading }: SalesLinesTableProps) {
  const columns: ColumnDef<SalesLineRow>[] = useMemo(
    () => [
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-[var(--color-text-primary)]">{row.getValue('sku')}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">{row.original.description}</div>
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
        accessorKey: 'qty_sold',
        header: 'Qty sold',
        meta: { align: 'right' },
        cell: ({ row }) => <NumericCell value={row.getValue('qty_sold')} format="number" />,
        enableSorting: true,
      },
      {
        accessorKey: 'unit_price',
        header: 'Unit price',
        meta: { align: 'right' },
        cell: ({ row }) => <NumericCell value={row.getValue('unit_price')} format="currency" />,
        enableSorting: true,
      },
      {
        accessorKey: 'gross_sales',
        header: 'Gross',
        meta: { align: 'right' },
        cell: ({ row }) => <NumericCell value={row.getValue('gross_sales')} format="currency" />,
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
        icon: <ShoppingCart className="w-12 h-12 text-[var(--color-text-muted)]" />,
        title: 'No sales recorded',
        description: 'Sales data will appear here when sales reports are uploaded',
      }}
    />
  );
}
