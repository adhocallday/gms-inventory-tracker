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
    const scenarioId = searchParams.get('scenario_id');

    if (!scenarioId) {
      return NextResponse.json({ error: 'scenario_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('initial_inventory')
      .select('*')
      .eq('tour_id', tourId)
      .eq('scenario_id', scenarioId)
      .order('sku', { ascending: true });

    if (error) {
      console.error('Error fetching initial inventory:', error);
      return NextResponse.json({ error: 'Failed to fetch initial inventory' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

interface InventoryItem {
  sku: string;
  size?: string | null;
  quantity: number;
  notes?: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = params.id;
    const body = await request.json();
    const { scenario_id, inventory } = body;

    if (!scenario_id) {
      return NextResponse.json({ error: 'scenario_id is required' }, { status: 400 });
    }

    // Support both single item and array
    const items: InventoryItem[] = Array.isArray(inventory) ? inventory : [inventory];

    if (items.length === 0) {
      return NextResponse.json({ error: 'At least one inventory item is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    let successCount = 0;
    let errorCount = 0;

    for (const item of items) {
      try {
        // Check for existing record
        let query = supabase
          .from('initial_inventory')
          .select('id')
          .eq('scenario_id', scenario_id)
          .eq('sku', item.sku);

        if (item.size === null || item.size === undefined) {
          query = query.is('size', null);
        } else {
          query = query.eq('size', item.size);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing?.id) {
          // Update existing
          const { error } = await supabase
            .from('initial_inventory')
            .update({
              quantity: item.quantity,
              notes: item.notes ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('initial_inventory')
            .insert({
              tour_id: tourId,
              scenario_id,
              sku: item.sku,
              size: item.size ?? null,
              quantity: item.quantity,
              notes: item.notes ?? null,
            });

          if (error) throw error;
        }

        successCount++;
      } catch (error: any) {
        errorCount++;
        console.error('Initial inventory save error:', error.message);
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
