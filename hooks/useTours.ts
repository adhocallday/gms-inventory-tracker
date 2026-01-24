'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface TourOption {
  id: string;
  name: string;
  artist: string;
}

export function useTours() {
  const [tours, setTours] = useState<TourOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tours')
        .select('id, name, artist')
        .order('start_date', { ascending: false });

      if (!mounted) return;

      if (error) {
        setError(error.message);
        setTours([]);
      } else {
        setError(null);
        setTours(data ?? []);
      }
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return { tours, loading, error };
}
