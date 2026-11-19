import { Skeleton } from '@/components/ui/Skeleton';
import { STAT_GRID } from '@/components/dashboard/stat-grid';
import { cn } from '@/lib/utils';

/**
 * Route-level loading state (used by loading.tsx files). Each variant uses the
 * same paddings, gaps and tile sizes as the pages it stands in for, so the
 * page does not jump when the data arrives.
 *
 * - `kpis+table`: back link, title, a row of stat tiles, then a table
 *   (dashboard, tour, inventory, COGS, analytics, products)
 * - `table`: title, filter row, then a list or table (documents, shows, reports)
 * - `sheet`: title, toolbar, then a spreadsheet grid (projections)
 * - `article`: title and blocks of text (welcome, upload, review, POS)
 */
export type PageSkeletonVariant = 'kpis+table' | 'table' | 'sheet' | 'article';

function Header({ backLink = true }: { backLink?: boolean }) {
  return (
    <div>
      {backLink && <Skeleton className="h-4 w-40 mb-3 rounded" />}
      <Skeleton className="h-8 w-64 max-w-full rounded" />
      <Skeleton className="h-4 w-96 max-w-full mt-2 rounded" />
    </div>
  );
}

function StatTiles({ count }: { count: number }) {
  return (
    <div className={cn(STAT_GRID, 'mt-5')}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] px-3 py-2.5"
        >
          <Skeleton className="h-3.5 w-20 rounded" />
          <Skeleton className="h-6 w-24 mt-1.5 rounded" />
        </div>
      ))}
    </div>
  );
}

function TableBlock({ rows, columns = 6 }: { rows: number; columns?: number }) {
  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)]">
      <div className="flex gap-4 px-3 py-2.5 bg-[var(--color-bg-elevated)] border-b border-[var(--color-bg-border)]">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 flex-1 rounded" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-3 py-2.5 border-b last:border-b-0 border-[var(--color-bg-border)]">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className={cn('h-4 flex-1 rounded', c === 0 && 'flex-[2]')} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({
  variant = 'kpis+table',
  stats = 4,
  rows = 8,
}: {
  variant?: PageSkeletonVariant;
  /** Stat tiles in the `kpis+table` variant. */
  stats?: number;
  /** Table rows in the `kpis+table` and `table` variants. */
  rows?: number;
}) {
  return (
    <div className="g-container py-6" aria-busy="true" aria-label="Loading">
      {variant === 'kpis+table' && (
        <>
          <Header />
          <StatTiles count={stats} />
          <TableBlock rows={rows} />
        </>
      )}

      {variant === 'table' && (
        <>
          <Header backLink={false} />
          <div className="mt-5 flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-md" />
            ))}
          </div>
          <TableBlock rows={rows} columns={4} />
        </>
      )}

      {variant === 'sheet' && (
        <>
          <Header />
          <div className="mt-5 flex flex-wrap gap-2">
            <Skeleton className="h-9 w-48 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
          <div className="mt-4 grid grid-cols-6 gap-px overflow-hidden rounded border border-[var(--color-bg-border)] bg-[var(--color-bg-border)] sm:grid-cols-10">
            {Array.from({ length: 120 }).map((_, i) => (
              <div key={i} className="h-7 bg-[var(--color-bg-surface)]" />
            ))}
          </div>
        </>
      )}

      {variant === 'article' && (
        <>
          <Header backLink={false} />
          <div className="mt-6 space-y-3 max-w-3xl">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-11/12 rounded" />
            <Skeleton className="h-4 w-4/5 rounded" />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
