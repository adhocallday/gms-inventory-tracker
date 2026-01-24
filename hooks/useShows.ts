'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface ShowOption {
  id: string;
  show_date: string;
  venue_name: string;
}

export function useShows(tourId?: string) {
  const [shows, setShows] = useState<ShowOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tourId) {
      setShows([]);
      return;
    }

    let mounted = true;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('shows')
        .select('id, show_date, venue_name')
        .eq('tour_id', tourId)
        .order('show_date', { ascending: false });

      if (!mounted) return;

      if (error) {
        setError(error.message);
        setShows([]);
      } else {
        setError(null);
        setShows(data ?? []);
      }
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [tourId]);

  return { shows, loading, error };
}
