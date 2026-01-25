'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DollarSign } from 'lucide-react';
import { DataTable, NumericCell } from '@/components/ui/DataTable';

export interface CogsRow {
  product_id: string;
  sku: string;
  description: string;
  size: string | null;
  total_sold: number | null;
  total_gross: number | null;
  total_cogs: number | null;
  gross_margin: number | null;
}

interface CogsTableProps {
  data: CogsRow[];
  loading?: boolean;
}

export function CogsTable({ data, loading }: CogsTableProps) {
  const columns: ColumnDef<CogsRow>[] = useMemo(
    () => [
      {
        id: 'product',
        header: 'SKU',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-[var(--g-text)]">
              {row.original.sku || 'SKU'}
            </div>
            <div className="text-xs text-[var(--g-text-muted)] mt-0.5">
              {row.original.description || 'Description pending'}
            </div>
          </div>
        ),
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.sku || '';
          const b = rowB.original.sku || '';
          return a.localeCompare(b);
        },
      },
      {
        accessorKey: 'size',
        header: 'Size',
        cell: ({ row }) => row.getValue('size') || <span className="text-[var(--g-text-muted)]">—</span>,
        enableSorting: true,
      },
      {
        accessorKey: 'total_sold',
        header: 'Units Sold',
        cell: ({ row }) => (
          <div className="text-right">
            <NumericCell value={row.getValue('total_sold')} format="number" />
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'total_gross',
        header: 'Gross',
        cell: ({ row }) => (
          <div className="text-right">
            <NumericCell value={row.getValue('total_gross')} format="currency" />
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'total_cogs',
        header: 'COGS',
        cell: ({ row }) => (
          <div className="text-right">
            <NumericCell value={row.getValue('total_cogs')} format="currency" />
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'gross_margin',
        header: 'Margin',
        cell: ({ row }) => {
          const margin = row.getValue('gross_margin') as number | null;
          return (
            <div className="text-right">
              <NumericCell value={margin} format="currency" />
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
        icon: <DollarSign className="w-12 h-12 text-[var(--g-text-muted)]" />,
        title: 'No COGS data yet',
        description: 'Upload sales and cost data to see cost of goods sold',
      }}
    />
  );
}
