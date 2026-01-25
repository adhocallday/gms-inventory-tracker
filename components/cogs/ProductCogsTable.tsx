'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DollarSign } from 'lucide-react';
import { DataTable, NumericCell } from '@/components/ui/DataTable';

export interface ProductCogsRow {
  sku: string;
  description: string;
  size: string;
  total_sold: number;
  total_gross: number;
  full_package_cost: number;
  total_cogs: number;
  gross_margin: number;
}

interface ProductCogsTableProps {
  data: ProductCogsRow[];
  loading?: boolean;
  totals?: {
    total_units_sold: number;
    total_revenue: number;
    total_cogs: number;
    total_margin: number;
    margin_percentage: number;
  };
}

export function ProductCogsTable({ data, loading, totals }: ProductCogsTableProps) {
  const columns: ColumnDef<ProductCogsRow>[] = useMemo(
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
          <span className="text-[var(--g-text-dim)]">{row.getValue('size')}</span>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'total_sold',
        header: 'Units Sold',
        cell: ({ row }) => <NumericCell value={row.getValue('total_sold') || 0} format="number" />,
        enableSorting: true,
      },
      {
        accessorKey: 'total_gross',
        header: 'Revenue',
        cell: ({ row }) => <NumericCell value={row.getValue('total_gross') || 0} format="currency" />,
        enableSorting: true,
      },
      {
        accessorKey: 'full_package_cost',
        header: 'Unit Cost',
        cell: ({ row }) => <NumericCell value={row.getValue('full_package_cost') || 0} format="currency" />,
        enableSorting: true,
      },
      {
        accessorKey: 'total_cogs',
        header: 'Total COGS',
        cell: ({ row }) => (
          <div className="text-right text-red-300">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(row.getValue('total_cogs') || 0)}
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'gross_margin',
        header: 'Margin',
        cell: ({ row }) => (
          <div className="text-right text-green-300">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(row.getValue('gross_margin') || 0)}
          </div>
        ),
        enableSorting: true,
      },
      {
        id: 'margin_pct',
        header: 'Margin %',
        accessorFn: (row) => {
          return row.total_gross > 0 ? (row.gross_margin / row.total_gross) * 100 : 0;
        },
        cell: ({ row }) => {
          const marginPct = row.original.total_gross > 0
            ? (row.original.gross_margin / row.original.total_gross) * 100
            : 0;
          return (
            <div className={`text-right font-semibold ${
              marginPct >= 50
                ? 'text-green-300'
                : marginPct >= 30
                ? 'text-yellow-300'
                : 'text-red-300'
            }`}>
              {marginPct.toFixed(1)}%
            </div>
          );
        },
        enableSorting: true,
      },
    ],
    []
  );

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
          icon: <DollarSign className="w-12 h-12 text-[var(--g-text-muted)]" />,
          title: 'No COGS data',
          description: 'Upload sales reports to see cost of goods sold analysis',
        }}
      />

      {totals && data.length > 0 && (
        <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-[var(--g-text-muted)] text-xs mb-1">Total Units</p>
              <p className="font-semibold">{totals.total_units_sold.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[var(--g-text-muted)] text-xs mb-1">Total Revenue</p>
              <p className="font-semibold">{formatCurrency(totals.total_revenue)}</p>
            </div>
            <div>
              <p className="text-[var(--g-text-muted)] text-xs mb-1">Total COGS</p>
              <p className="font-semibold text-red-300">{formatCurrency(totals.total_cogs)}</p>
            </div>
            <div>
              <p className="text-[var(--g-text-muted)] text-xs mb-1">Total Margin</p>
              <p className="font-semibold text-green-300">{formatCurrency(totals.total_margin)}</p>
            </div>
            <div>
              <p className="text-[var(--g-text-muted)] text-xs mb-1">Margin %</p>
              <p className="font-semibold text-green-300">{totals.margin_percentage.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
