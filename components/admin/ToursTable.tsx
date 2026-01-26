'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Calendar, Music, Search, X } from 'lucide-react';
import { DataTable, DateCell } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useFuzzySearch } from '@/hooks/useFuzzySearch';

interface Tour {
  id: string;
  name: string;
  artist: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  shows?: Array<{ count: number }>;
}

interface ToursTableProps {
  tours: Tour[];
}

type StatusFilter = 'all' | 'active' | 'completed' | 'upcoming' | 'draft';

export function ToursTable({ tours }: ToursTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Fuzzy search across name, artist, and status
  const searchedTours = useFuzzySearch(tours, searchQuery, {
    keys: ['name', 'artist', 'status'],
    threshold: 0.3,
  });

  // Apply status filter
  const filteredTours = useMemo(() => {
    if (statusFilter === 'all') return searchedTours;
    return searchedTours.filter((tour) => tour.status === statusFilter);
  }, [searchedTours, statusFilter]);

  // Calculate status counts
  const statusCounts = useMemo(() => {
    return {
      all: tours.length,
      active: tours.filter((t) => t.status === 'active').length,
      completed: tours.filter((t) => t.status === 'completed').length,
      upcoming: tours.filter((t) => t.status === 'upcoming').length,
      draft: tours.filter((t) => t.status === 'draft').length,
    };
  }, [tours]);

  const columns: ColumnDef<Tour>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Tour Name',
        cell: ({ row }) => (
          <div className="font-medium text-[var(--g-text)]">
            {row.getValue('name')}
          </div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'artist',
        header: 'Artist',
        cell: ({ row }) => (
          <div className="text-[var(--g-text-dim)]">
            {row.getValue('artist') || <span className="text-[var(--g-text-muted)]">—</span>}
          </div>
        ),
        enableSorting: true,
      },
      {
        id: 'dates',
        header: 'Dates',
        cell: ({ row }) => {
          const startDate = row.original.start_date;
          const endDate = row.original.end_date;

          if (!startDate || !endDate) {
            return <span className="text-[var(--g-text-muted)]">No dates set</span>;
          }

          return (
            <div className="text-[var(--g-text-dim)] text-sm">
              <DateCell value={startDate} /> - <DateCell value={endDate} />
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: 'shows',
        header: 'Shows',
        cell: ({ row }) => {
          const count = row.original.shows?.[0]?.count || 0;
          return (
            <div className="text-[var(--g-text-dim)]">
              <span className="font-mono">{count}</span> {count === 1 ? 'show' : 'shows'}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as string;
          return <Badge variant={status as any}>{status}</Badge>;
        },
        enableSorting: true,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="text-right">
            <Link
              href={`/admin/tours/${row.original.id}/edit`}
              className="text-sm text-[var(--g-accent)] hover:text-[var(--g-accent-2)] font-medium transition"
            >
              Edit →
            </Link>
          </div>
        ),
        enableSorting: false,
      },
    ],
    []
  );

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all';

  return (
    <div>
      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--g-text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tours, artists..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[var(--g-text)] placeholder-[var(--g-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--g-accent)] focus:border-transparent transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--g-text-muted)] hover:text-[var(--g-text)] transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
          {(['all', 'active', 'upcoming', 'completed', 'draft'] as const).map((status) => {
            const count = statusCounts[status];
            const isActive = statusFilter === status;

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap border
                  ${
                    isActive
                      ? 'bg-[var(--g-accent)] text-white border-[var(--g-accent)]'
                      : 'bg-slate-100 text-[var(--g-text-dim)] border-slate-200 hover:bg-slate-200 hover:text-[var(--g-text)]'
                  }
                `}
              >
                <span className="capitalize">{status}</span>
                <span
                  className={`
                    px-1.5 py-0.5 rounded text-xs
                    ${isActive ? 'bg-white/20' : 'bg-slate-200'}
                  `}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results count and clear filters */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-[var(--g-text-muted)]">
          Found {filteredTours.length} {filteredTours.length === 1 ? 'tour' : 'tours'}
          {searchQuery && ` matching "${searchQuery}"`}
          {statusFilter !== 'all' && ` with status "${statusFilter}"`}
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-[var(--g-accent)] hover:text-[var(--g-accent-2)] font-medium transition"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Tours Table */}
      {filteredTours.length === 0 ? (
        <EmptyState
          icon={<Music className="w-12 h-12 text-[var(--g-text-muted)]" />}
          title="No tours found"
          description={
            hasActiveFilters
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first tour to get started'
          }
          action={
            hasActiveFilters
              ? { label: 'Clear filters', onClick: clearFilters }
              : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredTours}
          stickyHeader
          striped
        />
      )}
    </div>
  );
}
