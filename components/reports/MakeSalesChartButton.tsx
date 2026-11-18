import { ExternalLink } from 'lucide-react';
import { chartsNewReportUrl } from '@/lib/apps';

/** Opens the MerchFlow Charts wizard with this tour's data pre-filled. */
export function MakeSalesChartButton({ tourId }: { tourId: string }) {
  return (
    <a
      href={chartsNewReportUrl(tourId)}
      data-tour="charts-link"
      className="inline-flex items-center gap-2 h-10 px-4 rounded-md text-sm font-semibold border border-[var(--color-bg-border)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-text-muted)] transition-all"
    >
      Make a sales chart
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}
