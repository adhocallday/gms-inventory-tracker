'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Truck } from 'lucide-react';
import { DataTable, DateCell, NumericCell } from '@/components/ui/DataTable';

export interface ReceivingRow {
  received_date: string | null;
  delivery_number: string | null;
  sku: string;
  size: string | null;
  quantity_received: number;
  vendor: string | null;
}

interface ReceivingContextTableProps {
  data: ReceivingRow[];
  loading?: boolean;
}

export function ReceivingContextTable({ data, loading }: ReceivingContextTableProps) {
  const columns: ColumnDef<ReceivingRow>[] = useMemo(
    () => [
      {
        accessorKey: 'received_date',
        header: 'Date',
        cell: ({ row }) => <DateCell value={row.getValue('received_date')} />,
        enableSorting: true,
      },
      {
        accessorKey: 'delivery_number',
        header: 'Delivery',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-secondary)]">{row.getValue('delivery_number') || '—'}</span>
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
        accessorKey: 'quantity_received',
        header: 'Received',
        cell: ({ row }) => {
          const value = row.getValue('quantity_received') as number;
          return (
            <div className="text-right text-green-300 font-medium">
              +{new Intl.NumberFormat('en-US').format(value)}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'vendor',
        header: 'Vendor',
        cell: ({ row }) => (
          <span className="text-[var(--color-text-secondary)]">{row.getValue('vendor') || '—'}</span>
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
        title: 'No receipts between shows',
        description: 'Receiving data will appear when stock is received',
      }}
    />
  );
}
