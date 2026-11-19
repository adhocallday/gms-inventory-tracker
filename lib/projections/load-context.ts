import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProjectionContext } from '@/lib/ai/projection-agent';
import { computeCurrentValues, type CurrentSkuValues } from './current-values';

export interface ChatContextData {
  context: ProjectionContext;
  scenarioId: string | null;
  currentValues: CurrentSkuValues[];
}

const num = (v: unknown) => (v ? Number(v) : 0);

/**
 * Load everything the projection chat needs: tour data for the prompt and the
 * current projection values (scenario overrides applied) the sheet shows.
 * Attendance and per-head default to the tour's actuals, as on the sheet.
 */
export async function loadChatContext(
  supabase: SupabaseClient,
  tourId: string,
  opts: { scenarioId?: string | null; expectedAttendance?: number; expectedPerHead?: number } = {}
): Promise<ChatContextData | null> {
  const [tourRes, productSummaryRes, showSummaryRes, inventoryRes, poRes, tourProductsRes, scenariosRes] =
    await Promise.all([
      supabase.from('tours').select('id, name, artist').eq('id', tourId).maybeSingle(),
      supabase
        .from('product_summary_view')
        .select('product_id, sku, description, size, total_sold, total_gross, full_package_cost')
        .eq('tour_id', tourId),
      supabase
        .from('show_summary_view')
        .select('show_id, show_date, city, total_gross, attendance, per_head')
        .eq('tour_id', tourId)
        .order('show_date', { ascending: true }),
      supabase.from('inventory_balances').select('product_id, size, balance').eq('tour_id', tourId),
      supabase.from('po_open_qty_view').select('sku, size, open_quantity').eq('tour_id', tourId),
      supabase
        .from('tour_products')
        .select('product_id, size, full_package_cost, suggested_retail')
        .eq('tour_id', tourId),
      supabase.from('forecast_scenarios').select('id, is_baseline').eq('tour_id', tourId),
    ]);

  if (tourRes.error || !tourRes.data) return null;

  const productSummary = productSummaryRes.data ?? [];
  const showSummary = showSummaryRes.data ?? [];
  const inventory = inventoryRes.data ?? [];

  // Scenario: the requested one if it belongs to this tour, else the baseline.
  const scenarios = scenariosRes.data ?? [];
  const scenarioId =
    scenarios.find(s => s.id === opts.scenarioId)?.id ??
    scenarios.find(s => s.is_baseline)?.id ??
    scenarios[0]?.id ??
    null;

  // Same product set as the tour page: products seen in inventory or sales.
  const productIds = Array.from(
    new Set([...inventory, ...productSummary].map(r => r.product_id).filter(Boolean))
  ) as string[];

  const [productsRes, overridesRes] = await Promise.all([
    productIds.length
      ? supabase.from('products').select('id, sku, description').in('id', productIds)
      : Promise.resolve({ data: [] as { id: string; sku: string; description: string | null }[] }),
    scenarioId
      ? supabase
          .from('forecast_overrides')
          .select('sku, size, bucket, override_units')
          .eq('scenario_id', scenarioId)
          .eq('tour_id', tourId)
      : Promise.resolve({ data: [] as { sku: string; size: string | null; bucket: string | null; override_units: number | null }[] }),
  ]);

  const totalAttendance = showSummary.reduce((s, r) => s + num(r.attendance), 0);
  const totalGross = showSummary.reduce((s, r) => s + num(r.total_gross), 0);
  const expectedAttendance =
    opts.expectedAttendance && opts.expectedAttendance > 0 ? opts.expectedAttendance : totalAttendance;
  const expectedPerHead =
    opts.expectedPerHead && opts.expectedPerHead > 0
      ? opts.expectedPerHead
      : totalAttendance
        ? totalGross / totalAttendance
        : 0;

  const currentValues = computeCurrentValues({
    products: productsRes.data ?? [],
    tourProducts: tourProductsRes.data ?? [],
    productSummary,
    overrides: overridesRes.data ?? [],
    expectedAttendance,
    expectedPerHead,
  });

  return {
    scenarioId,
    currentValues,
    context: {
      tourId,
      tourName: tourRes.data.name,
      productSummary,
      showSummary,
      inventoryBalances: inventory,
      poOpenQuantities: poRes.data ?? [],
      expectedAttendance,
      expectedPerHead,
    },
  };
}
