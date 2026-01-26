import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';

type CompType = 'band' | 'gms' | 'show' | 'trailer' | 'other';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const tourId = params.id;
    const { searchParams } = new URL(request.url);
    const showId = searchParams.get('show_id');
    const compType = searchParams.get('comp_type') as CompType | null;

    let query = supabase
      .from('show_comps')
      .select(`
        *,
        shows (
          id,
          show_date,
          venue_name,
          city
        )
      `)
      .eq('tour_id', tourId)
      .order('created_at', { ascending: false });

    if (showId) {
      query = query.eq('show_id', showId);
    }

    if (compType) {
      query = query.eq('comp_type', compType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching comps:', error);
      return NextResponse.json({ error: 'Failed to fetch comps' }, { status: 500 });
    }

    // Also return summary by comp type
    const summary = {
      band: 0,
      gms: 0,
      show: 0,
      trailer: 0,
      other: 0,
      total: 0,
    };

    data?.forEach((comp) => {
      const type = comp.comp_type as CompType;
      if (type in summary) {
        summary[type] += comp.quantity;
      }
      summary.total += comp.quantity;
    });

    return NextResponse.json({
      comps: data || [],
      summary,
    });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

interface CompItem {
  show_id: string;
  sku: string;
  size?: string | null;
  comp_type: CompType;
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

    // Support both single comp and bulk comps
    const comps: CompItem[] = Array.isArray(body) ? body : [body];

    if (comps.length === 0) {
      return NextResponse.json({ error: 'At least one comp is required' }, { status: 400 });
    }

    // Validate comp types
    const validCompTypes = ['band', 'gms', 'show', 'trailer', 'other'];
    const invalidComps = comps.filter((c) => !validCompTypes.includes(c.comp_type));
    if (invalidComps.length > 0) {
      return NextResponse.json(
        { error: `Invalid comp_type. Must be one of: ${validCompTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify all shows belong to this tour
    const showIds = [...new Set(comps.map((c) => c.show_id))];
    const { data: validShows, error: showError } = await supabase
      .from('shows')
      .select('id')
      .eq('tour_id', tourId)
      .in('id', showIds);

    if (showError) {
      console.error('Error verifying shows:', showError);
      return NextResponse.json({ error: 'Failed to verify shows' }, { status: 500 });
    }

    const validShowIds = new Set(validShows?.map((s) => s.id) || []);
    const invalidShowComps = comps.filter((c) => !validShowIds.has(c.show_id));

    if (invalidShowComps.length > 0) {
      return NextResponse.json(
        { error: 'Some comps reference shows not in this tour' },
        { status: 400 }
      );
    }

    // Upsert comps (update if exists, insert if not)
    let successCount = 0;
    let errorCount = 0;

    for (const comp of comps) {
      try {
        // Check for existing record
        let query = supabase
          .from('show_comps')
          .select('id')
          .eq('show_id', comp.show_id)
          .eq('sku', comp.sku)
          .eq('comp_type', comp.comp_type);

        if (comp.size === null || comp.size === undefined) {
          query = query.is('size', null);
        } else {
          query = query.eq('size', comp.size);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing?.id) {
          // Update existing
          const { error } = await supabase
            .from('show_comps')
            .update({
              quantity: comp.quantity,
              notes: comp.notes ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('show_comps')
            .insert({
              tour_id: tourId,
              show_id: comp.show_id,
              sku: comp.sku,
              size: comp.size ?? null,
              comp_type: comp.comp_type,
              quantity: comp.quantity,
              notes: comp.notes ?? null,
            });

          if (error) throw error;
        }

        successCount++;
      } catch (error: any) {
        errorCount++;
        console.error('Comp save error:', error.message);
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
    const compId = searchParams.get('id');

    if (!compId) {
      return NextResponse.json({ error: 'Comp id is required' }, { status: 400 });
    }

    // Verify comp belongs to this tour
    const { data: comp, error: fetchError } = await supabase
      .from('show_comps')
      .select('id')
      .eq('id', compId)
      .eq('tour_id', tourId)
      .single();

    if (fetchError || !comp) {
      return NextResponse.json({ error: 'Comp not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('show_comps')
      .delete()
      .eq('id', compId);

    if (error) {
      console.error('Error deleting comp:', error);
      return NextResponse.json({ error: 'Failed to delete comp' }, { status: 500 });
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
