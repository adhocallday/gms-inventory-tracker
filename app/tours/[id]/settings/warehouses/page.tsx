import { createServiceClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import { WarehouseLocationManager } from '@/components/warehouses/WarehouseLocationManager';

type PageProps = {
  params: { id: string };
};

export default async function WarehouseSettingsPage({ params }: PageProps) {
  const { id: tourId } = params;
  const supabase = createServiceClient();

  // Fetch tour details
  const { data: tour, error: tourError } = await supabase
    .from('tours')
    .select('*')
    .eq('id', tourId)
    .single();

  if (tourError || !tour) {
    redirect('/');
  }

  // Fetch warehouse locations
  const { data: locations, error: locationsError } = await supabase
    .from('warehouse_locations')
    .select('*')
    .eq('tour_id', tourId)
    .order('display_order', { ascending: true });

  if (locationsError) {
    console.error('Error fetching warehouse locations:', locationsError);
  }

  return (
    <div className="g-container py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <a
            href={`/tours/${tourId}`}
            className="text-sm text-[var(--g-text-muted)] hover:text-[var(--g-accent)] transition"
          >
            ← Back to Tour
          </a>
        </div>
        <h1 className="text-3xl font-bold g-title mb-2">Stock Locations</h1>
        <p className="text-sm text-[var(--g-text-dim)] max-w-3xl">
          Manage where inventory is stored for {tour.name}. Template locations (Road, Warehouse, Web)
          are provided as starting points—rename them to match your workflow or add custom locations
          like "Chicago Hub", "Tour Truck", or "Nashville Warehouse". These locations drive your
          projection planning and PO creation.
        </p>
      </header>

      <WarehouseLocationManager
        tourId={tourId}
        initialLocations={locations || []}
      />
    </div>
  );
}
