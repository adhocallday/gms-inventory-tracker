import { notFound } from 'next/navigation';
import { InventoryTracker, type InventoryData } from '@/components/inventory/InventoryTracker';
import { loadTour } from '@/lib/data/tours';
import { loadTourInventory } from '@/lib/data/inventory';

// Cached for 30s; posting a document refreshes it immediately (lib/cache/revalidate.ts)
export const revalidate = 30;

export default async function InventoryTrackerPage({ params }: { params: { id: string } }) {
  // The tour and its inventory load in parallel, on the server: the page
  // arrives with its figures instead of a skeleton and a second fetch.
  const result = await Promise.all([loadTour(params.id), loadTourInventory(params.id)]).catch(
    (err) => {
      console.error('[Inventory page] Load failed:', err);
      return null;
    }
  );

  if (!result) {
    return (
      <div className="g-container py-12">
        <div className="text-center text-[var(--color-text-secondary)]">
          Inventory for this tour could not be loaded. Reload the page, or go back to the tour.
        </div>
      </div>
    );
  }

  const [tour, data] = result;
  if (!tour) notFound();

  return <InventoryTracker tour={tour} data={data as unknown as InventoryData} />;
}
