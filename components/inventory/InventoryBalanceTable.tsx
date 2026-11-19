'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Package } from 'lucide-react';
import { DataTable, NumericCell } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { StatCard, STAT_GRID } from '@/components/dashboard/StatCard';

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
          const noReceipts = balance < 0 && !row.original.total_received;

          return (
            <div>
              <div className="font-semibold text-[var(--color-text-primary)]">{row.getValue('sku')}</div>
              <div className="text-[12.5px] text-[var(--color-text-secondary)]">{row.original.description}</div>
              {noReceipts && (
                <Badge variant="default" size="sm" className="mt-1">No received stock recorded</Badge>
              )}
              {isOutOfStock && (
                <Badge variant="out-of-stock" size="sm" className="mt-1">Out of stock</Badge>
              )}
              {isLowStock && (
                <Badge variant="low-stock" size="sm" className="mt-1">Low stock</Badge>
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
          <span className="text-[var(--color-text-secondary)]">{row.getValue('size')}</span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'product_type',
        header: 'Type',
        cell: ({ row }) => {
          const type = row.getValue('product_type') as string;
          return (
            <span className="text-[var(--color-text-secondary)] capitalize">{type}</span>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'total_received',
        header: 'Received',
        meta: { align: 'right' },
        cell: ({ row }) => <NumericCell value={row.getValue('total_received')} format="number" />,
        enableSorting: true,
      },
      {
        accessorKey: 'total_sold',
        header: 'Sold',
        meta: { align: 'right' },
        cell: ({ row }) => <NumericCell value={row.getValue('total_sold')} format="number" />,
        enableSorting: true,
      },
      {
        accessorKey: 'total_comps',
        header: 'Comps',
        meta: { align: 'right' },
        cell: ({ row }) => <NumericCell value={row.getValue('total_comps')} format="number" />,
        enableSorting: true,
      },
      {
        accessorKey: 'balance',
        header: 'Balance',
        meta: { align: 'right' },
        cell: ({ row }) => {
          const balance = row.getValue('balance') as number;
          const isLowStock = balance > 0 && balance < 10;
          const isOutOfStock = balance === 0;

          // Negative balances come from sales with no receipts recorded: show
          // the figure, but not as a stock-out or as healthy stock.
          return (
            <div className={`text-right font-semibold tabular-nums ${
              balance < 0
                ? 'text-[var(--color-text-secondary)]'
                : isOutOfStock
                ? 'text-danger'
                : isLowStock
                ? 'text-warn'
                : 'text-[var(--color-text-primary)]'
            }`}>
              {new Intl.NumberFormat('en-US').format(balance)}
            </div>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'full_package_cost',
        header: 'Unit cost',
        meta: { align: 'right' },
        cell: ({ row }) => <NumericCell value={row.getValue('full_package_cost')} format="currency" />,
        enableSorting: true,
      },
      {
        id: 'value',
        header: 'Value',
        meta: { align: 'right' },
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
          icon: <Package className="w-12 h-12 text-[var(--color-text-muted)]" />,
          title: 'No inventory items',
          description: 'Upload a packing list or purchase order to see inventory balances',
        }}
      />

      {showTotals && data.length > 0 && (
        <div className={`${STAT_GRID} mt-3`}>
          <StatCard label="Total received" value={formatNumber(totals.received)} />
          <StatCard label="Total sold" value={formatNumber(totals.sold)} />
          <StatCard label="Total comps" value={formatNumber(totals.comps)} />
          <StatCard label="Total balance" value={formatNumber(totals.balance)} />
          <StatCard label="Total value" value={formatCurrency(totals.value)} />
        </div>
      )}
    </div>
  );
}
