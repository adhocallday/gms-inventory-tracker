import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

/**
 * POST /api/projections/apply-overrides
 * Applies chat-suggested unit overrides (reviewed by the user) to
 * forecast_overrides. They are unit overrides the projection sheet reads:
 * bucket null, size null for the SKU total or a size for that size.
 */

interface OverrideInput {
  sku: string;
  size: string | null;
  suggestedValue: number;
}

const MAX_OVERRIDES = 200;

function parseOverrides(raw: unknown): OverrideInput[] | string {
  if (!Array.isArray(raw) || raw.length === 0) return 'overrides must be a non-empty array';
  if (raw.length > MAX_OVERRIDES) return `at most ${MAX_OVERRIDES} overrides per request`;
  const out: OverrideInput[] = [];
  for (const [i, o] of raw.entries()) {
    const sku = typeof o?.sku === 'string' ? o.sku.trim() : '';
    const size = o?.size === null || o?.size === undefined ? null : typeof o.size === 'string' ? o.size.trim() || null : undefined;
    const value = o?.suggestedValue;
    if (!sku || sku.length > 64) return `overrides[${i}].sku is invalid`;
    if (size === undefined || (size && size.length > 16)) return `overrides[${i}].size is invalid`;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 10_000_000) {
      return `overrides[${i}].suggestedValue must be a whole number of units`;
    }
    out.push({ sku, size, suggestedValue: value });
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const scenarioId = typeof body?.scenarioId === 'string' ? body.scenarioId : '';
    const tourId = typeof body?.tourId === 'string' ? body.tourId : '';
    if (!scenarioId || !tourId) {
      return NextResponse.json({ error: 'scenarioId, tourId, and overrides are required' }, { status: 400 });
    }
    const overrides = parseOverrides(body?.overrides);
    if (typeof overrides === 'string') {
      return NextResponse.json({ error: overrides }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: scenario } = await supabase
      .from('forecast_scenarios')
      .select('id')
      .eq('id', scenarioId)
      .eq('tour_id', tourId)
      .maybeSingle();
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found for this tour' }, { status: 404 });
    }

    const results: Array<{ sku: string; size: string | null; success: boolean; error?: string }> = [];

    for (const { sku, size, suggestedValue } of overrides) {
      try {
        let query = supabase
          .from('forecast_overrides')
          .select('id')
          .eq('scenario_id', scenarioId)
          .eq('tour_id', tourId)
          .eq('sku', sku)
          .is('bucket', null);
        query = size === null ? query.is('size', null) : query.eq('size', size);

        const { data: existing, error: queryError } = await query.maybeSingle();
        if (queryError) {
          results.push({ sku, size, success: false, error: queryError.message });
          continue;
        }

        const { error } = existing?.id
          ? await supabase.from('forecast_overrides').update({ override_units: suggestedValue }).eq('id', existing.id)
          : await supabase.from('forecast_overrides').insert({
              scenario_id: scenarioId,
              tour_id: tourId,
              sku,
              size,
              bucket: null,
              override_units: suggestedValue,
            });

        results.push(error ? { sku, size, success: false, error: error.message } : { sku, size, success: true });
      } catch (err: any) {
        results.push({ sku, size, success: false, error: err.message || 'Unknown error' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      success: failureCount === 0,
      appliedCount: successCount,
      failedCount: failureCount,
      results,
    });
  } catch (error: any) {
    console.error('[apply-overrides] Error:', error);
    return NextResponse.json({ error: 'Failed to apply overrides' }, { status: 500 });
  }
}
