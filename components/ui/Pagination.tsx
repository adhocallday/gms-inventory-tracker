'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

// Server-side pagination (traditional page numbers)
interface ServerPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: boolean;
}

export function ServerPagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageNumbers = true,
}: ServerPaginationProps) {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first, last, current, and nearby pages with ellipsis
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="text-sm text-[var(--g-text-muted)]">
        Page {currentPage} of {totalPages}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {showPageNumbers && (
          <div className="hidden md:flex items-center gap-1">
            {getPageNumbers().map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="px-2 text-[var(--g-text-muted)]">
                    ...
                  </span>
                );
              }

              const pageNum = page as number;
              const isActive = pageNum === currentPage;

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={cn(
                    'min-w-[2rem] h-8 px-3 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--g-accent)] text-white'
                      : 'hover:bg-[var(--g-surface-2)] text-[var(--g-text-dim)]'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Client-side "Load More" pattern
interface LoadMorePaginationProps {
  visibleCount: number;
  totalCount: number;
  onLoadMore: () => void;
  itemLabel?: string;
  increment?: number;
}

export function LoadMorePagination({
  visibleCount,
  totalCount,
  onLoadMore,
  itemLabel = 'items',
  increment = 10,
}: LoadMorePaginationProps) {
  const remainingCount = totalCount - visibleCount;
  const canLoadMore = visibleCount < totalCount;

  if (!canLoadMore) {
    return (
      <div className="flex justify-center py-4">
        <div className="text-sm text-[var(--g-text-muted)]">
          Showing all {totalCount} {itemLabel}
        </div>
      </div>
    );
  }

  const nextIncrement = Math.min(increment, remainingCount);

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="text-sm text-[var(--g-text-muted)]">
        Showing {visibleCount} of {totalCount} {itemLabel}
      </div>
      <Button variant="outline" onClick={onLoadMore}>
        Load {nextIncrement} more {itemLabel}
        <span className="text-[var(--g-text-muted)] ml-1">
          ({remainingCount} remaining)
        </span>
      </Button>
    </div>
  );
}

// Hybrid: Page info with load more option
interface HybridPaginationProps {
  visibleCount: number;
  totalCount: number;
  onLoadMore: () => void;
  onLoadAll?: () => void;
  itemLabel?: string;
}

export function HybridPagination({
  visibleCount,
  totalCount,
  onLoadMore,
  onLoadAll,
  itemLabel = 'items',
}: HybridPaginationProps) {
  const remainingCount = totalCount - visibleCount;
  const canLoadMore = visibleCount < totalCount;

  if (!canLoadMore) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-[var(--g-border)]">
      <div className="text-sm text-[var(--g-text-muted)]">
        Showing <span className="font-semibold text-[var(--g-text)]">{visibleCount}</span> of{' '}
        <span className="font-semibold text-[var(--g-text)]">{totalCount}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onLoadMore}>
          Load more ({remainingCount} remaining)
        </Button>
        {onLoadAll && remainingCount > 20 && (
          <Button variant="ghost" size="sm" onClick={onLoadAll}>
            Load all
          </Button>
        )}
      </div>
    </div>
  );
}
