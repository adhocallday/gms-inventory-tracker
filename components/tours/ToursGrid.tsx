'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Music } from 'lucide-react';
import { SearchBar } from '@/components/ui/SearchBar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Progress } from '@/components/ui/Progress';
import { useFuzzySearch } from '@/hooks/useFuzzySearch';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function formatDate(value?: string | null) {
  if (!value) return 'TBD';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return 'Dates TBD';
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
          icon={<Music className="w-16 h-16 text-[var(--g-text-muted)]" />}
          title="No tours yet"
          description="Seed the database or add a tour to get started"
        />
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-xl font-semibold g-title">Available Tours</h2>

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
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'active', 'upcoming', 'completed'] as const).map((status) => {
          const count = statusCounts[status];
          const isActive = statusFilter === status;

          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                ${
                  isActive
                    ? 'bg-[var(--g-accent)] text-white'
                    : 'bg-[var(--g-surface-2)] text-[var(--g-text-dim)] hover:bg-[var(--g-surface)] hover:text-[var(--g-text)]'
                }
              `}
            >
              <span className="capitalize">{status}</span>
              <span
                className={`
                  px-2 py-0.5 rounded-full text-xs
                  ${isActive ? 'bg-white/30' : 'bg-[var(--g-bg-subtle)]'}
                `}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results count */}
      {searchQuery && (
        <div className="mb-4 text-sm text-[var(--g-text-muted)]">
          Found {filteredTours.length} {filteredTours.length === 1 ? 'tour' : 'tours'}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}

      {/* Tours grid */}
      {filteredTours.length === 0 ? (
        <EmptyState
          icon={<Music className="w-12 h-12 text-[var(--g-text-muted)]" />}
          title="No tours found"
          description={`Try adjusting your search or filter criteria`}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTours.map((tour) => (
            <Link
              key={tour.id}
              href={`/tours/${tour.id}`}
              className="block g-card p-6 transition-all hover:border-[var(--g-accent)] hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold g-title truncate">
                    {tour.name}
                  </h3>
                  <p className="text-sm text-[var(--g-text-muted)] mt-1">
                    {tour.artist}
                  </p>
                </div>
                <Badge variant={tour.status as any}>{tour.status}</Badge>
              </div>

              <p className="text-sm text-[var(--g-text-dim)] mt-3">
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
                    label="Tour Progress"
                    showValue={false}
                  />
                  <p className="text-xs text-[var(--g-text-muted)] mt-1">
                    {tour.completedShowCount} of {tour.showCount} shows completed
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-xs text-[var(--g-text-muted)] uppercase tracking-wide">
                    Shows
                  </p>
                  <p className="font-semibold text-[var(--g-text)] mt-1">
                    {tour.showCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--g-text-muted)] uppercase tracking-wide">
                    Products
                  </p>
                  <p className="font-semibold text-[var(--g-text)] mt-1">
                    {tour.productCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--g-text-muted)] uppercase tracking-wide">
                    Gross
                  </p>
                  <p className="font-semibold text-[var(--g-text)] mt-1">
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
