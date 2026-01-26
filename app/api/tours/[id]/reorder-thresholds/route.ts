import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const tourId = params.id;
    const { searchParams } = new URL(request.url);
    const includeAlerts = searchParams.get('include_alerts') === 'true';
    const scenarioId = searchParams.get('scenario_id');

    // Get thresholds
    const { data: thresholds, error } = await supabase
      .from('reorder_thresholds')
      .select('*')
      .eq('tour_id', tourId)
      .eq('is_active', true)
      .order('sku', { ascending: true });

    if (error) {
      console.error('Error fetching thresholds:', error);
      return NextResponse.json({ error: 'Failed to fetch thresholds' }, { status: 500 });
    }

    // If alerts requested and scenario provided, calculate current balances
    let alerts: any[] = [];
    if (includeAlerts && scenarioId && thresholds && thresholds.length > 0) {
      // Get initial inventory
      const { data: initialInventory } = await supabase
        .from('initial_inventory')
        .select('*')
        .eq('scenario_id', scenarioId);

      // Get running balance data from the view
      const { data: runningBalances } = await supabase
        .from('show_running_balances')
        .select('*')
        .eq('tour_id', tourId)
        .gte('show_date', new Date().toISOString().split('T')[0]);

      // Calculate alerts
      const inventoryMap = new Map(
        initialInventory?.map((i) => [`${i.sku}:${i.size ?? ''}`, i.quantity]) || []
      );

      thresholds.forEach((threshold) => {
        const key = `${threshold.sku}:${threshold.size ?? ''}`;
        const initialQty = inventoryMap.get(key) || 0;

        // Find minimum balance across future shows
        const productBalances = runningBalances?.filter(
          (rb) =>
            rb.sku === threshold.sku &&
            (threshold.size === null || rb.size === threshold.size)
        ) || [];

        if (productBalances.length > 0) {
          const minBalance = Math.min(
            ...productBalances.map((rb) => initialQty + (rb.cumulative_change || 0))
          );

          if (minBalance < threshold.minimum_balance) {
            const firstStockout = productBalances.find(
              (rb) => initialQty + (rb.cumulative_change || 0) < threshold.minimum_balance
            );

            alerts.push({
              ...threshold,
              current_projected_balance: minBalance,
              first_stockout_date: firstStockout?.show_date,
              first_stockout_show: firstStockout?.show_number,
            });
          }
        }
      });
    }

    return NextResponse.json({
      thresholds: thresholds || [],
      alerts,
    });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

interface ThresholdItem {
  sku: string;
  size?: string | null;
  minimum_balance: number;
  reorder_quantity?: number | null;
  lead_time_days?: number | null;
  is_active?: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = params.id;
    const body = await request.json();

    // Support both single threshold and bulk thresholds
    const thresholds: ThresholdItem[] = Array.isArray(body) ? body : [body];

    if (thresholds.length === 0) {
      return NextResponse.json({ error: 'At least one threshold is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    let successCount = 0;
    let errorCount = 0;

    for (const threshold of thresholds) {
      try {
        // Check for existing record
        let query = supabase
          .from('reorder_thresholds')
          .select('id')
          .eq('tour_id', tourId)
          .eq('sku', threshold.sku);

        if (threshold.size === null || threshold.size === undefined) {
          query = query.is('size', null);
        } else {
          query = query.eq('size', threshold.size);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing?.id) {
          // Update existing
          const { error } = await supabase
            .from('reorder_thresholds')
            .update({
              minimum_balance: threshold.minimum_balance,
              reorder_quantity: threshold.reorder_quantity ?? null,
              lead_time_days: threshold.lead_time_days ?? 14,
              is_active: threshold.is_active ?? true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('reorder_thresholds')
            .insert({
              tour_id: tourId,
              sku: threshold.sku,
              size: threshold.size ?? null,
              minimum_balance: threshold.minimum_balance,
              reorder_quantity: threshold.reorder_quantity ?? null,
              lead_time_days: threshold.lead_time_days ?? 14,
              is_active: threshold.is_active ?? true,
            });

          if (error) throw error;
        }

        successCount++;
      } catch (error: any) {
        errorCount++;
        console.error('Threshold save error:', error.message);
      }
    }

    return NextResponse.json({
      success: true,
      successCount,
      errorCount,
    });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const tourId = params.id;
    const { searchParams } = new URL(request.url);
    const thresholdId = searchParams.get('id');

    if (!thresholdId) {
      return NextResponse.json({ error: 'Threshold id is required' }, { status: 400 });
    }

    // Verify threshold belongs to this tour
    const { data: threshold, error: fetchError } = await supabase
      .from('reorder_thresholds')
      .select('id')
      .eq('id', thresholdId)
      .eq('tour_id', tourId)
      .single();

    if (fetchError || !threshold) {
      return NextResponse.json({ error: 'Threshold not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('reorder_thresholds')
      .delete()
      .eq('id', thresholdId);

    if (error) {
      console.error('Error deleting threshold:', error);
      return NextResponse.json({ error: 'Failed to delete threshold' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
