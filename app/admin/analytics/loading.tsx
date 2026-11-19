import { PageSkeleton } from '@/components/ui/PageSkeleton';

export default function Loading() {
  return <PageSkeleton stats={7} rows={6} />;
}
