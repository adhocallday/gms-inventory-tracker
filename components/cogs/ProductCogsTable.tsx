'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DollarSign } from 'lucide-react';
import { DataTable, NumericCell } from '@/components/ui/DataTable';
import { StatCard, STAT_GRID } from '@/components/dashboard/StatCard';

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

/** A unit cost of 0 or null means none was entered; margins are then unknown. */
export function hasCost(row: Pick<ProductCogsRow, 'full_package_cost'>): boolean {
  return Number(row.full_package_cost) > 0;
}

export function marginPercent(row: ProductCogsRow): number | null {
  if (!hasCost(row) || !(row.total_gross > 0)) return null;
  return (row.gross_margin / row.total_gross) * 100;
}

const formatWhole = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

export function ProductCogsTable({ data, loading, totals }: ProductCogsTableProps) {
  const columns: ColumnDef<ProductCogsRow>[] = useMemo(
    () => [
      {
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-[var(--color-text-primary)]">{row.getValue('sku')}</div>
            <div className="text-[12.5px] text-[var(--color-text-secondary)]">{row.original.description}</div>
          </div>
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
        accessorKey: 'total_sold',
        header: 'Units sold',
        meta: { align: 'right' },
        cell: ({ row }) => <NumericCell value={row.getValue('total_sold') || 0} format="number" />,
        enableSorting: true,
      },
      {
        accessorKey: 'total_gross',
        header: 'Revenue',
        meta: { align: 'right' },
        cell: ({ row }) => <NumericCell value={row.getValue('total_gross') || 0} format="currency" />,
        enableSorting: true,
      },
      {
        accessorKey: 'full_package_cost',
        header: 'Unit cost',
        meta: { align: 'right' },
        cell: ({ row }) =>
          hasCost(row.original) ? (
            <NumericCell value={row.original.full_package_cost} format="currency" />
          ) : (
            <span className="text-[var(--color-text-secondary)]">Not set</span>
          ),
        enableSorting: true,
      },
      {
        accessorKey: 'total_cogs',
        header: 'COGS',
        meta: { align: 'right' },
        cell: ({ row }) =>
          hasCost(row.original) ? (
            <span className="tabular-nums">{formatWhole(row.original.total_cogs || 0)}</span>
          ) : (
            <span className="text-[var(--color-text-secondary)]">—</span>
          ),
        enableSorting: true,
      },
      {
        accessorKey: 'gross_margin',
        header: 'Gross margin',
        meta: { align: 'right' },
        cell: ({ row }) =>
          hasCost(row.original) ? (
            <span className="tabular-nums">{formatWhole(row.original.gross_margin || 0)}</span>
          ) : (
            <span className="text-[var(--color-text-secondary)]">—</span>
          ),
        enableSorting: true,
      },
      {
        id: 'margin_pct',
        header: 'Margin %',
        meta: { align: 'right' },
        accessorFn: (row) => marginPercent(row) ?? -Infinity,
        cell: ({ row }) => {
          const marginPct = marginPercent(row.original);
          if (marginPct === null) {
            return <span className="text-[var(--color-text-secondary)]">No unit cost</span>;
          }
          // Below 30% is flagged; healthy margins stay in plain text.
          return (
            <span
              className={`font-semibold tabular-nums ${
                marginPct < 30 ? 'text-danger' : marginPct < 50 ? 'text-warn' : 'text-[var(--color-text-primary)]'
              }`}
            >
              {marginPct.toFixed(1)}%
            </span>
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
          icon: <DollarSign className="w-12 h-12 text-[var(--color-text-muted)]" />,
          title: 'No sales posted yet',
          description: 'COGS appears once a sales report is posted and products have unit costs.',
        }}
      />

      {totals && data.length > 0 && (
        <div className={`${STAT_GRID} mt-3`}>
          {[
            ['Units sold', totals.total_units_sold.toLocaleString()],
            ['Revenue', formatCurrency(totals.total_revenue)],
            ['COGS', formatCurrency(totals.total_cogs)],
            ['Gross margin', formatCurrency(totals.total_margin)],
            ['Margin %', `${totals.margin_percentage.toFixed(1)}%`],
          ].map(([label, value]) => (
            <StatCard key={label} label={label} value={value} />
          ))}
        </div>
      )}
    </div>
  );
}
