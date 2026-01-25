import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

interface BulkOverride {
  sku: string;
  size?: string | null;
  bucket?: string | null;
  override_units: number;
}

export async function POST(request: NextRequest) {
  try {
    const { scenario_id, tour_id, overrides } = await request.json();

    if (!scenario_id || !tour_id || !Array.isArray(overrides)) {
      return NextResponse.json(
        { error: 'scenario_id, tour_id, and overrides array are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    console.log(`📦 Processing bulk upsert: ${overrides.length} overrides`);

    // Process in batches to avoid overwhelming the database
    const BATCH_SIZE = 50;
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < overrides.length; i += BATCH_SIZE) {
      const batch = overrides.slice(i, i + BATCH_SIZE);

      // For each item in the batch, upsert individually (Supabase doesn't have great bulk upsert on composite keys)
      const batchPromises = batch.map(async (override: BulkOverride) => {
        try {
          // Build query to find existing record
          let query = supabase
            .from('forecast_overrides')
            .select('id')
            .eq('scenario_id', scenario_id)
            .eq('tour_id', tour_id)
            .eq('sku', override.sku);

          // Handle null values properly
          if (override.size === null || override.size === undefined) {
            query = query.is('size', null);
          } else {
            query = query.eq('size', override.size);
          }

          if (override.bucket === null || override.bucket === undefined) {
            query = query.is('bucket', null);
          } else {
            query = query.eq('bucket', override.bucket);
          }

          const { data: existing } = await query.maybeSingle();

          if (existing?.id) {
            // Update existing
            const { error } = await supabase
              .from('forecast_overrides')
              .update({ override_units: override.override_units })
              .eq('id', existing.id);

            if (error) throw error;
          } else {
            // Insert new
            const { error } = await supabase
              .from('forecast_overrides')
              .insert({
                scenario_id,
                tour_id,
                sku: override.sku,
                size: override.size ?? null,
                bucket: override.bucket ?? null,
                override_units: override.override_units
              });

            if (error) throw error;
          }

          successCount++;
          return { success: true };
        } catch (error: any) {
          errorCount++;
          console.error('Override save error:', {
            sku: override.sku,
            size: override.size,
            bucket: override.bucket,
            error: error.message
          });
          return { success: false, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    console.log(`✅ Bulk upsert complete: ${successCount} succeeded, ${errorCount} failed`);

    return NextResponse.json({
      success: true,
      successCount,
      errorCount,
      total: overrides.length
    });
  } catch (error: any) {
    console.error('Bulk upsert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
