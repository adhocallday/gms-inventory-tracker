import { createServiceClient } from '@/lib/supabase/client';
import { notFound } from 'next/navigation';
import TourEditClient from '@/components/admin/TourEditClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function TourEditPage({ params }: Props) {
  const supabase = createServiceClient();

  // Fetch tour with related data
  const { data: tour, error: tourError } = await supabase
    .from('tours')
    .select('*')
    .eq('id', params.id)
    .single();

  if (tourError || !tour) {
    notFound();
  }

  // Fetch shows
  const { data: shows } = await supabase
    .from('shows')
    .select('*')
    .eq('tour_id', params.id)
    .order('show_date', { ascending: true });

  // Fetch products (need to check schema for tour-product relationship)
  const { data: tourProducts } = await supabase
    .from('tour_products')
    .select('*, products(*)')
    .eq('tour_id', params.id);

  return (
    <TourEditClient
      tour={tour}
      initialShows={shows || []}
      initialProducts={tourProducts || []}
    />
  );
}
