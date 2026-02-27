import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import type { SuggestedOverride } from '@/lib/ai/streaming-projection-agent';

interface ApplyOverridesRequest {
  scenarioId: string;
  tourId: string;
  overrides: SuggestedOverride[];
}

/**
 * POST /api/projections/apply-overrides
 * Applies AI-suggested overrides to the forecast_overrides table
 */
export async function POST(request: NextRequest) {
  try {
    const body: ApplyOverridesRequest = await request.json();
    const { scenarioId, tourId, overrides } = body;

    if (!scenarioId || !tourId || !overrides?.length) {
      return NextResponse.json(
        { error: 'scenarioId, tourId, and overrides are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const results: Array<{
      sku: string;
      size: string | null;
      bucket: string;
      success: boolean;
      error?: string;
    }> = [];

    // Apply each override
    for (const override of overrides) {
      const { sku, size, bucket, suggestedValue } = override;

      try {
        // Check if override already exists
        let query = supabase
          .from('forecast_overrides')
          .select('id')
          .eq('scenario_id', scenarioId)
          .eq('tour_id', tourId)
          .eq('sku', sku)
          .eq('bucket', bucket);

        // Handle null size
        if (size === null || size === undefined) {
          query = query.is('size', null);
        } else {
          query = query.eq('size', size);
        }

        const { data: existing, error: queryError } = await query.maybeSingle();

        if (queryError) {
          results.push({
            sku,
            size: size || null,
            bucket,
            success: false,
            error: queryError.message
          });
          continue;
        }

        if (existing?.id) {
          // Update existing override
          const { error: updateError } = await supabase
            .from('forecast_overrides')
            .update({
              override_units: suggestedValue,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (updateError) {
            results.push({
              sku,
              size: size || null,
              bucket,
              success: false,
              error: updateError.message
            });
          } else {
            results.push({
              sku,
              size: size || null,
              bucket,
              success: true
            });
          }
        } else {
          // Insert new override
          const { error: insertError } = await supabase
            .from('forecast_overrides')
            .insert({
              scenario_id: scenarioId,
              tour_id: tourId,
              sku,
              size: size || null,
              bucket,
              override_units: suggestedValue
            });

          if (insertError) {
            results.push({
              sku,
              size: size || null,
              bucket,
              success: false,
              error: insertError.message
            });
          } else {
            results.push({
              sku,
              size: size || null,
              bucket,
              success: true
            });
          }
        }
      } catch (err: any) {
        results.push({
          sku,
          size: size || null,
          bucket,
          success: false,
          error: err.message || 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failureCount === 0,
      appliedCount: successCount,
      failedCount: failureCount,
      results
    });
  } catch (error: any) {
    console.error('[apply-overrides] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply overrides' },
      { status: 500 }
    );
  }
}
