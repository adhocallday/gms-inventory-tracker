'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { ShoppingBag } from 'lucide-react';
import { DataTable, DateCell, NumericCell } from '@/components/ui/DataTable';

export interface ProductSaleRow {
  show_date: string | null;
  venue_name: string | null;
  city: string | null;
  size: string;
  qty_sold: number;
  gross_sales: number;
}

interface ProductSalesTableProps {
  data: ProductSaleRow[];
  loading?: boolean;
}

export function ProductSalesTable({ data, loading }: ProductSalesTableProps) {
  const columns: ColumnDef<ProductSaleRow>[] = useMemo(
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
          <span className="font-medium text-[var(--g-text)]">
            {row.getValue('venue_name') || '—'}
          </span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'city',
        header: 'City',
        cell: ({ row }) => (
          <span className="text-[var(--g-text-dim)]">{row.getValue('city') || '—'}</span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'size',
        header: 'Size',
        cell: ({ row }) => (
          <span className="text-[var(--g-text-dim)]">{row.getValue('size') || 'OS'}</span>
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
        accessorKey: 'gross_sales',
        header: 'Gross Sales',
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
        icon: <ShoppingBag className="w-12 h-12 text-[var(--g-text-muted)]" />,
        title: 'No sales data yet',
        description: 'Sales will appear here as shows are completed',
      }}
    />
  );
}
