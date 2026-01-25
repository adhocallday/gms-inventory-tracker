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
      <div className="g-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--g-surface-2)] border-b border-[var(--g-border)]">
              <tr>
                {columns.map((_, index) => (
                  <th key={index} className="px-4 py-3 text-left">
                    <Skeleton className="h-4 w-24" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-[var(--g-border)]">
                  {columns.map((_, colIndex) => (
                    <td key={colIndex} className="px-4 py-4">
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
    <div className="g-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead
            className={cn(
              'bg-[var(--g-surface-2)] border-b border-[var(--g-border)]',
              stickyHeader && 'sticky top-0 z-10 shadow-sm'
            )}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--g-text-muted)]',
                        compact ? 'py-2' : 'py-3',
                        canSort && 'cursor-pointer select-none hover:text-[var(--g-text)]'
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort && (
                            <span className="text-[var(--g-text-muted)]">
                              {sorted === 'asc' ? (
                                <ArrowUp className="w-3 h-3" />
                              ) : sorted === 'desc' ? (
                                <ArrowDown className="w-3 h-3" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-40" />
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
                  'border-b border-[var(--g-border)] transition-colors',
                  striped && index % 2 === 1 && 'bg-[var(--g-bg-muted)]',
                  onRowClick && 'cursor-pointer hover:bg-[var(--g-surface-2)]'
                )}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      'px-4 text-[var(--g-text-dim)]',
                      compact ? 'py-3' : 'py-4'
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
    return <span className="text-[var(--g-text-muted)]">—</span>;
  }

  let formatted = value.toString();

  if (format === 'currency') {
    formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } else if (format === 'percentage') {
    formatted = `${value.toFixed(1)}%`;
  } else if (format === 'number') {
    formatted = value.toLocaleString();
  }

  return <span className="font-mono">{formatted}</span>;
}

// Helper for date columns
export function DateCell({ value }: { value: string | Date | null | undefined }) {
  if (!value) {
    return <span className="text-[var(--g-text-muted)]">—</span>;
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return <span>{formatted}</span>;
}
