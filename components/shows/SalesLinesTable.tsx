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
            <div className="font-semibold text-[var(--g-text)]">{row.getValue('sku')}</div>
            <div className="text-xs text-[var(--g-text-muted)]">{row.original.description}</div>
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'size',
        header: 'Size',
        cell: ({ row }) => (
          <span className="text-[var(--g-text-dim)]">{row.getValue('size') || '—'}</span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'qty_sold',
        header: 'Qty Sold',
        cell: ({ row }) => <NumericCell value={row.getValue('qty_sold')} format="number" />,
        enableSorting: true,
      },
      {
        accessorKey: 'unit_price',
        header: 'Unit Price',
        cell: ({ row }) => <NumericCell value={row.getValue('unit_price')} format="currency" />,
        enableSorting: true,
      },
      {
        accessorKey: 'gross_sales',
        header: 'Gross',
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
        icon: <ShoppingCart className="w-12 h-12 text-[var(--g-text-muted)]" />,
        title: 'No sales recorded',
        description: 'Sales data will appear here when sales reports are uploaded',
      }}
    />
  );
}
