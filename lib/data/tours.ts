import { createServiceClient } from '@/lib/supabase/client';

export interface TourRecord {
  id: string;
  name: string;
  artist: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

const TOUR_COLUMNS = 'id, name, artist, start_date, end_date, status';

/** One tour, or null when the id does not exist. Throws on a query error. */
export async function loadTour(id: string): Promise<TourRecord | null> {
  const { data, error } = await createServiceClient()
    .from('tours')
    .select(TOUR_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as TourRecord | null) ?? null;
}

/** Every tour, newest start date first. Throws on a query error. */
export async function listTours(): Promise<TourRecord[]> {
  const { data, error } = await createServiceClient()
    .from('tours')
    .select(TOUR_COLUMNS)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as TourRecord[];
}
