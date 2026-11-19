'use client';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  emptyState?: {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
  };
  stickyHeader?: boolean;
  striped?: boolean;
  compact?: boolean;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  emptyState,
  stickyHeader = true,
  striped = true,
  compact = false,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnVisibility,
    },
  });

  // Loading state
  if (loading) {
    return (
      <div className="g-card overflow-clip" aria-busy="true">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--color-bg-elevated)] border-b border-[var(--color-bg-border)]">
              <tr>
                {columns.map((_, index) => (
                  <th key={index} className="px-3 py-2 text-left">
                    <Skeleton className="h-4 w-24" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-[var(--color-bg-border)]">
                  {columns.map((_, colIndex) => (
                    <td key={colIndex} className="px-3 py-2.5">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="g-card p-8">
        <EmptyState
          icon={emptyState?.icon}
          title={emptyState?.title || 'No data'}
          description={emptyState?.description || 'No records found'}
        />
      </div>
    );
  }

  return (
    // overflow-clip (not hidden) and no horizontal scroller from lg up: a
    // scroll container would capture the sticky header, so it would never
    // stick to the window. Below lg the table scrolls sideways instead.
    <div className="g-card overflow-clip">
      <div className="overflow-x-auto lg:overflow-x-visible">
        <table className="w-full">
          <thead
            className={cn(
              'bg-[var(--color-bg-elevated)] border-b border-[var(--color-bg-border)]',
              stickyHeader && 'lg:sticky lg:top-0 z-10'
            )}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  // Numeric columns set meta: { align: 'right' } so the header
                  // lines up with right-aligned figures.
                  const alignRight =
                    (header.column.columnDef.meta as { align?: string } | undefined)?.align === 'right';

                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] bg-[var(--color-bg-elevated)] shadow-[inset_0_-1px_0_var(--color-bg-border)]',
                        compact ? 'py-1.5' : 'py-2',
                        alignRight && 'text-right',
                        canSort && 'cursor-pointer select-none hover:text-[var(--color-text-primary)]'
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      onKeyDown={
                        canSort
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                header.column.toggleSorting();
                              }
                            }
                          : undefined
                      }
                      tabIndex={canSort ? 0 : undefined}
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : canSort ? 'none' : undefined}
                    >
                      {header.isPlaceholder ? null : (
                        <div className={cn('flex items-center gap-2', alignRight && 'justify-end')}>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort && (
                            <span className="text-[var(--color-text-muted)]">
                              {sorted === 'asc' ? (
                                <ArrowUp className="w-3 h-3" />
                              ) : sorted === 'desc' ? (
                                <ArrowDown className="w-3 h-3" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-50" aria-hidden="true" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, index) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-[var(--color-bg-border)] transition-colors',
                  striped && index % 2 === 1 && 'bg-[var(--color-bg-elevated)]',
                  onRowClick && 'cursor-pointer hover:bg-[var(--color-bg-elevated)]'
                )}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      // 13.5px body text, py-2 rows; on phones a 44px row
                      // height keeps every row an easy touch target.
                      'px-3 text-[13.5px] leading-5 text-[var(--color-text-secondary)] h-11 md:h-auto',
                      compact ? 'py-1.5' : 'py-2',
                      (cell.column.columnDef.meta as { align?: string } | undefined)?.align === 'right' &&
                        'text-right tabular-nums'
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper component for numeric columns
export function NumericCell({ value, format = 'number' }: { value: number | null | undefined; format?: 'number' | 'currency' | 'percentage' }) {
  if (value === null || value === undefined) {
    return <span className="text-[var(--color-text-muted)]">—</span>;
  }

  let formatted = value.toString();

  if (format === 'currency') {
    formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } else if (format === 'percentage') {
    formatted = `${value.toFixed(1)}%`;
  } else if (format === 'number') {
    formatted = value.toLocaleString();
  }

  return <span className="tabular-nums">{formatted}</span>;
}

// Helper for date columns
export function DateCell({ value }: { value: string | Date | null | undefined }) {
  if (!value) {
    return <span className="text-[var(--color-text-muted)]">—</span>;
  }

  // A date-only string ("2025-07-09") parses as UTC midnight, so format it
  // in UTC or it shows the previous day west of Greenwich.
  const dateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = typeof value === 'string' ? new Date(value) : value;
  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(dateOnly ? { timeZone: 'UTC' } : {}),
  });

  return <span>{formatted}</span>;
}
