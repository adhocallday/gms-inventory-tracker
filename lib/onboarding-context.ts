import type { SupabaseClient } from '@supabase/supabase-js';
import { summarizeTour, type TourFacts } from '@/components/onboarding/tour-facts';
import { pickDocument, pickShow, type DocumentOption, type ShowOption } from '@/components/onboarding/tour-chapters';
import type { TourIds } from '@/components/onboarding/tour-types';

const PAGE = 1000;

/**
 * Every row of a query, with the pages fetched in parallel once the count is
 * known (fetchAll pages one after another). The query must be ordered.
 */
async function fetchAllParallel<T>(
  count: () => PromiseLike<{ count: number | null; error: unknown }>,
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const { count: total, error } = await count();
  if (error) throw error;
  const pages = Math.max(1, Math.ceil((total ?? 0) / PAGE));
  const results = await Promise.all(
    Array.from({ length: pages }, async (_, i) => {
      const { data, error: pageError } = await page(i * PAGE, i * PAGE + PAGE - 1);
      if (pageError) throw pageError;
      return data ?? [];
    }),
  );
  return results.flat();
}

/**
 * The overview's headline figures for one tour: gross, shows with sales,
 * units, attendance and per head, summed from the same posted records the
 * tour page and reports read (show_summary_view and sales). Null when the
 * tour does not exist.
 */
export async function loadOverviewFacts(supabase: SupabaseClient, tourId: string): Promise<TourFacts | null> {
  const [tourResult, shows, sales] = await Promise.all([
    supabase.from('tours').select('id, name, artist').eq('id', tourId).maybeSingle(),
    fetchAllParallel<{ show_id: string; total_gross: number | string | null; attendance: number | null }>(
      () => supabase.from('show_summary_view').select('show_id', { count: 'exact', head: true }).eq('tour_id', tourId),
      (from, to) =>
        supabase
          .from('show_summary_view')
          .select('show_id, total_gross, attendance')
          .eq('tour_id', tourId)
          .order('show_id')
          .range(from, to),
    ),
    fetchAllParallel<{ qty_sold: number | null }>(
      () =>
        supabase.from('sales').select('id, shows!inner(tour_id)', { count: 'exact', head: true }).eq('shows.tour_id', tourId),
      (from, to) =>
        supabase
          .from('sales')
          .select('id, qty_sold, shows!inner(tour_id)')
          .eq('shows.tour_id', tourId)
          .order('id')
          .range(from, to),
    ),
  ]);
  if (tourResult.error) throw tourResult.error;
  const tour = tourResult.data as { name: string; artist: string } | null;
  if (!tour) return null;
  return { tourName: tour.name, artist: tour.artist, ...summarizeTour(shows, sales) };
}

/**
 * Everything the guided tour needs from the database, in one round of
 * parallel queries plus the figures: the first tour (newest first, of the
 * latest five) that has shows, a show on it likely to have full data, a draft
 * document for the review page, and the overview's live figures.
 */
export async function loadTourContext(supabase: SupabaseClient): Promise<{ ids: TourIds; facts: TourFacts | null }> {
  const [toursResult, docsResult] = await Promise.all([
    supabase.from('tours').select('id').order('start_date', { ascending: false }).limit(5),
    supabase
      .from('parsed_documents')
      .select('id, status, tour_id')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);
  if (toursResult.error) throw toursResult.error;
  if (docsResult.error) throw docsResult.error;
  const tours = (toursResult.data ?? []) as { id: string }[];

  let showsByTour = new Map<string, ShowOption[]>();
  if (tours.length > 0) {
    const { data, error } = await supabase
      .from('shows')
      .select('id, tour_id, show_date, attendance, settlement_status')
      .in(
        'tour_id',
        tours.map((t) => t.id),
      )
      .order('show_date', { ascending: true });
    if (error) throw error;
    showsByTour = new Map();
    for (const show of (data ?? []) as (ShowOption & { tour_id: string })[]) {
      const list = showsByTour.get(show.tour_id) ?? [];
      list.push(show);
      showsByTour.set(show.tour_id, list);
    }
  }

  const withShows = tours.find((t) => (showsByTour.get(t.id)?.length ?? 0) > 0);
  const tourId = withShows?.id ?? tours[0]?.id ?? null;
  const ids: TourIds = {
    tourId,
    showId: withShows ? pickShow(showsByTour.get(withShows.id)!) : null,
    docId: pickDocument((docsResult.data ?? []) as DocumentOption[]),
  };
  const facts = tourId ? await loadOverviewFacts(supabase, tourId) : null;
  return { ids, facts };
}
