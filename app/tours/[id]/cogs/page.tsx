import { notFound } from 'next/navigation';
import { CogsReport, type CogsData } from '@/components/cogs/CogsReport';
import { loadTour } from '@/lib/data/tours';
import { loadTourCogs } from '@/lib/data/cogs';

// Cached for 30s; posting a document refreshes it immediately (lib/cache/revalidate.ts)
export const revalidate = 30;

export default async function CogsReportPage({ params }: { params: { id: string } }) {
  // The tour and its COGS load in parallel, on the server.
  const result = await Promise.all([loadTour(params.id), loadTourCogs(params.id)]).catch((err) => {
    console.error('[COGS page] Load failed:', err);
    return null;
  });

  if (!result) {
    return (
      <div className="g-container py-12">
        <div className="text-center text-[var(--color-text-secondary)]">
          COGS for this tour could not be loaded. Reload the page, or go back to the tour.
        </div>
      </div>
    );
  }

  const [tour, cogsData] = result;
  if (!tour) notFound();

  return <CogsReport tour={tour} cogsData={cogsData as CogsData} />;
}
