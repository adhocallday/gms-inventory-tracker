import { Skeleton, SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';

/**
 * Route-level loading state (used by loading.tsx files) so navigation shows the
 * page structure immediately while server data loads.
 */
export function PageSkeleton({ stats = 4, table = true }: { stats?: number; table?: boolean }) {
  return (
    <div className="g-container py-12" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-9 w-72 mb-2" />
      <Skeleton className="h-4 w-48 mb-10" />
      {stats > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {Array.from({ length: stats }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}
      {table && <SkeletonTable rows={8} columns={5} />}
    </div>
  );
}
