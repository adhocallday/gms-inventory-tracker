'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Package } from 'lucide-react';
import { DataTable, NumericCell } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';

export interface InventoryBalanceRow {
  product_id: string;
  sku: string;
  description: string;
  size: string;
  product_type: string;
  total_received: number;
  total_sold: number;
  total_comps: number;
  balance: number;
  full_package_cost: number;
  suggested_retail: number;
}

interface InventoryBalanceTableProps {
  data: InventoryBalanceRow[];
  loading?: boolean;
  showTotals?: boolean;
}

export function InventoryBalanceTable({ data, loading, showTotals = true }: InventoryBalanceTableProps) {
  const columns: ColumnDef<InventoryBalanceRow>[] = useMemo(
    () => [
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => {
          const balance = row.original.balance;
          const isLowStock = balance > 0 && balance < 10;
          const isOutOfStock = balance === 0;

          return (
            <div>
              <div className="font-semibold text-[var(--g-text)]">{row.getValue('sku')}</div>
              <div className="text-xs text-[var(--g-text-muted)]">{row.original.description}</div>
              {isOutOfStock && (
                <Badge variant="out-of-stock" className="mt-1 text-xs">Out of stock</Badge>
              )}
              {isLowStock && (
                <Badge variant="low-stock" className="mt-1 text-xs">Low stock</Badge>
              )}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'size',
        header: 'Size',
        cell: ({ row }) => (
          <span className="text-[var(--g-text-dim)]">{row.getValue('size')}</span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'product_type',
        header: 'Type',
        cell: ({ row }) => {
          const type = row.getValue('product_type') as string;
          return (
            <span className="text-[var(--g-text-dim)] capitalize">{type}</span>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'total_received',
        header: 'Received',
        cell: ({ row }) => <NumericCell value={row.getValue('total_received')} format="number" />,
        enableSorting: true,
      },
      {
        accessorKey: 'total_sold',
        header: 'Sold',
        cell: ({ row }) => <NumericCell value={row.getValue('total_sold')} format="number" />,
        enableSorting: true,
      },
      {
        accessorKey: 'total_comps',
        header: 'Comps',
        cell: ({ row }) => <NumericCell value={row.getValue('total_comps')} format="number" />,
        enableSorting: true,
      },
      {
        accessorKey: 'balance',
        header: 'Balance',
        cell: ({ row }) => {
          const balance = row.getValue('balance') as number;
          const isLowStock = balance > 0 && balance < 10;
          const isOutOfStock = balance === 0;

          return (
            <div className={`text-right font-semibold ${
              isOutOfStock
                ? 'text-red-300'
                : isLowStock
                ? 'text-yellow-300'
                : 'text-green-300'
            }`}>
              {new Intl.NumberFormat('en-US').format(balance)}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'full_package_cost',
        header: 'Unit Cost',
        cell: ({ row }) => <NumericCell value={row.getValue('full_package_cost')} format="currency" />,
        enableSorting: true,
      },
      {
        id: 'value',
        header: 'Value',
        accessorFn: (row) => row.balance * row.full_package_cost,
        cell: ({ row }) => {
          const value = row.original.balance * row.original.full_package_cost;
          return <NumericCell value={value} format="currency" />;
        },
        enableSorting: true,
      },
    ],
    []
  );

  // Calculate totals
  const totals = useMemo(() => {
    return {
      received: data.reduce((sum, i) => sum + i.total_received, 0),
      sold: data.reduce((sum, i) => sum + i.total_sold, 0),
      comps: data.reduce((sum, i) => sum + i.total_comps, 0),
      balance: data.reduce((sum, i) => sum + i.balance, 0),
      value: data.reduce((sum, i) => sum + i.balance * i.full_package_cost, 0),
    };
  }, [data]);

  const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <div>
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        stickyHeader
        striped
        emptyState={{
          icon: <Package className="w-12 h-12 text-[var(--g-text-muted)]" />,
          title: 'No inventory items',
          description: 'Upload a packing list or purchase order to see inventory balances',
        }}
      />

      {showTotals && data.length > 0 && (
        <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-[var(--g-text-muted)] text-xs mb-1">Total Received</p>
              <p className="font-semibold">{formatNumber(totals.received)}</p>
            </div>
            <div>
              <p className="text-[var(--g-text-muted)] text-xs mb-1">Total Sold</p>
              <p className="font-semibold">{formatNumber(totals.sold)}</p>
            </div>
            <div>
              <p className="text-[var(--g-text-muted)] text-xs mb-1">Total Comps</p>
              <p className="font-semibold">{formatNumber(totals.comps)}</p>
            </div>
            <div>
              <p className="text-[var(--g-text-muted)] text-xs mb-1">Total Balance</p>
              <p className="font-semibold text-green-300">{formatNumber(totals.balance)}</p>
            </div>
            <div>
              <p className="text-[var(--g-text-muted)] text-xs mb-1">Total Value</p>
              <p className="font-semibold">{formatCurrency(totals.value)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
