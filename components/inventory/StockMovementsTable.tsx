'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Truck } from 'lucide-react';
import { DataTable, DateCell, NumericCell } from '@/components/ui/DataTable';

export interface StockMovementRow {
  received_date: string;
  delivery_number: string;
  sku: string;
  size: string;
  quantity_received: number;
  vendor: string;
}

interface StockMovementsTableProps {
  data: StockMovementRow[];
  loading?: boolean;
}

export function StockMovementsTable({ data, loading }: StockMovementsTableProps) {
  const columns: ColumnDef<StockMovementRow>[] = useMemo(
    () => [
      {
        accessorKey: 'received_date',
        header: 'Date',
        cell: ({ row }) => <DateCell value={row.getValue('received_date')} />,
        enableSorting: true,
      },
      {
        accessorKey: 'delivery_number',
        header: 'Delivery #',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-secondary)]">{row.getValue('delivery_number')}</span>
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
          <span className="text-[var(--color-text-secondary)]">{row.getValue('size')}</span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'quantity_received',
        header: 'Qty Received',
        cell: ({ row }) => {
          const qty = row.getValue('quantity_received') as number;
          return (
            <div className="text-right text-green-300 font-medium">
              +{new Intl.NumberFormat('en-US').format(qty)}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'vendor',
        header: 'Vendor',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-secondary)]">{row.getValue('vendor')}</span>
        ),
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
        icon: <Truck className="w-12 h-12 text-[var(--color-text-muted)]" />,
        title: 'No stock movements',
        description: 'Stock movements will appear here when inventory is received',
      }}
    />
  );
}
