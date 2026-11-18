'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Music } from 'lucide-react';
import { SearchBar } from '@/components/ui/SearchBar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Progress } from '@/components/ui/Progress';
import { useFuzzySearch } from '@/hooks/useFuzzySearch';
import { formatDate as formatDay } from '@/lib/format';
import { cn } from '@/lib/utils';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function formatDate(value?: string | null) {
  return formatDay(value, undefined, 'not set');
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return 'Dates not set';
  if (start && !end) return `Starts ${formatDate(start)}`;
  if (!start && end) return `Ends ${formatDate(end)}`;
  return `${formatDate(start)} — ${formatDate(end)}`;
}

export interface TourWithStats {
  id: string;
  name: string;
  artist: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  showCount: number;
  completedShowCount: number;
  productCount: number;
  gross: number;
}

interface ToursGridProps {
  tours: TourWithStats[];
}

export function ToursGrid({ tours }: ToursGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'upcoming'>('all');

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

  const statusCounts = useMemo(() => {
    return {
      all: tours.length,
      active: tours.filter((t) => t.status === 'active').length,
      completed: tours.filter((t) => t.status === 'completed').length,
      upcoming: tours.filter((t) => t.status === 'upcoming').length,
    };
  }, [tours]);

  if (tours.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          icon={<Music className="w-16 h-16 text-[var(--color-text-muted)]" />}
          title="No tours yet"
          description="Create a tour under Admin, then upload its documents."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-lg font-semibold">All tours</h2>

        {/* Search bar */}
        <div className="flex-1 max-w-md">
          <SearchBar
            placeholder="Search tours, artists..."
            onSearch={setSearchQuery}
            debounceMs={300}
          />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1" role="group" aria-label="Filter by status">
        {(['all', 'active', 'upcoming', 'completed'] as const).map((status) => {
          const count = statusCounts[status];
          const isActive = statusFilter === status;

          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              aria-pressed={isActive}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors whitespace-nowrap',
                isActive
                  ? 'border-[var(--color-text-primary)] bg-[var(--color-text-primary)] text-[var(--color-bg-surface)]'
                  : 'border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              )}
            >
              <span className="capitalize">{status}</span>
              <span className="tabular-nums text-xs opacity-80">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Results count */}
      {searchQuery && (
        <div className="mb-4 text-sm text-[var(--color-text-muted)]">
          Found {filteredTours.length} {filteredTours.length === 1 ? 'tour' : 'tours'}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}

      {/* Tours grid */}
      {filteredTours.length === 0 ? (
        <EmptyState
          icon={<Music className="w-12 h-12 text-[var(--color-text-muted)]" />}
          title="No tours found"
          description="No tour matches this search and status. Clear the search or pick All."

        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTours.map((tour) => (
            <Link
              key={tour.id}
              href={`/tours/${tour.id}`}
              className="block g-card p-5 transition-colors hover:border-[var(--color-text-muted)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold truncate">
                    {tour.name}
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                    {tour.artist}
                  </p>
                </div>
                <Badge variant={tour.status as any}>{tour.status}</Badge>
              </div>

              <p className="text-sm text-[var(--color-text-secondary)] mt-3 tabular-nums">
                {formatDateRange(tour.start_date, tour.end_date)}
              </p>

              {/* Progress Indicator */}
              {tour.showCount > 0 && (
                <div className="mt-3">
                  <Progress
                    value={(tour.completedShowCount / tour.showCount) * 100}
                    variant={
                      tour.status === 'completed' ? 'success' :
                      tour.status === 'active' ? 'default' :
                      'info'
                    }
                    size="sm"
                    aria-label="Shows completed"
                    showValue={false}
                  />
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 tabular-nums">
                    {tour.completedShowCount} of {tour.showCount} shows completed
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Shows
                  </p>
                  <p className="font-semibold text-[var(--color-text-primary)] mt-0.5 tabular-nums">
                    {tour.showCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Products
                  </p>
                  <p className="font-semibold text-[var(--color-text-primary)] mt-0.5 tabular-nums">
                    {tour.productCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Gross
                  </p>
                  <p className="font-semibold text-[var(--color-text-primary)] mt-0.5 tabular-nums">
                    {currencyFormatter.format(tour.gross)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
