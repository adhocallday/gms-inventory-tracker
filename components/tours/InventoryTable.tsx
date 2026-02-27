'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Package } from 'lucide-react';
import { DataTable, NumericCell } from '@/components/ui/DataTable';

export interface InventoryRow {
  product_id: string;
  size: string | null;
  total_received: number | null;
  total_sold: number | null;
  total_comps: number | null;
  balance: number | null;
}

export interface InventoryTableRow extends InventoryRow {
  sku: string;
  description: string;
  unit_cost: number;
  inventory_value: number;
}

interface InventoryTableProps {
  data: InventoryTableRow[];
  loading?: boolean;
}

export function InventoryTable({ data, loading }: InventoryTableProps) {
  const columns: ColumnDef<InventoryTableRow>[] = useMemo(
    () => [
      {
        id: 'product',
        header: 'SKU',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-[var(--color-text-primary)]">
              {row.original.sku || 'SKU'}
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
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
        cell: ({ row }) => row.getValue('size') || <span className="text-[var(--color-text-muted)]">—</span>,
        enableSorting: true,
      },
      {
        accessorKey: 'total_received',
        header: 'Received',
        cell: ({ row }) => (
          <div className="text-right">
            <NumericCell value={row.getValue('total_received')} format="number" />
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'total_sold',
        header: 'Sold',
        cell: ({ row }) => (
          <div className="text-right">
            <NumericCell value={row.getValue('total_sold')} format="number" />
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'total_comps',
        header: 'Comps',
        cell: ({ row }) => (
          <div className="text-right">
            <NumericCell value={row.getValue('total_comps')} format="number" />
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'balance',
        header: 'Balance',
        cell: ({ row }) => (
          <div className="text-right font-semibold">
            <NumericCell value={row.getValue('balance')} format="number" />
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'unit_cost',
        header: 'Unit Cost',
        cell: ({ row }) => {
          const cost = row.getValue('unit_cost') as number;
          return (
            <div className="text-right">
              {cost ? <NumericCell value={cost} format="currency" /> : <span className="text-[var(--color-text-muted)]">—</span>}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'inventory_value',
        header: 'Inventory Value',
        cell: ({ row }) => {
          const value = row.getValue('inventory_value') as number;
          return (
            <div className="text-right">
              {value ? <NumericCell value={value} format="currency" /> : <span className="text-[var(--color-text-muted)]">—</span>}
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
        icon: <Package className="w-12 h-12 text-[var(--color-text-muted)]" />,
        title: 'No inventory data yet',
        description: 'Upload packing lists and sales reports to track inventory',
      }}
    />
  );
}
