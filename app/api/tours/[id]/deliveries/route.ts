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
    const showId = searchParams.get('show_id');

    let query = supabase
      .from('show_deliveries')
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

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching deliveries:', error);
      return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 });
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

interface DeliveryItem {
  show_id: string;
  sku: string;
  size?: string | null;
  quantity: number;
  delivery_type?: 'delivery' | 'return' | 'adjustment';
  notes?: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = params.id;
    const body = await request.json();

    // Support both single delivery and bulk deliveries
    const deliveries: DeliveryItem[] = Array.isArray(body) ? body : [body];

    if (deliveries.length === 0) {
      return NextResponse.json({ error: 'At least one delivery is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify all shows belong to this tour
    const showIds = [...new Set(deliveries.map((d) => d.show_id))];
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
    const invalidDeliveries = deliveries.filter((d) => !validShowIds.has(d.show_id));

    if (invalidDeliveries.length > 0) {
      return NextResponse.json(
        { error: 'Some deliveries reference shows not in this tour' },
        { status: 400 }
      );
    }

    // Insert deliveries
    const insertData = deliveries.map((d) => ({
      tour_id: tourId,
      show_id: d.show_id,
      sku: d.sku,
      size: d.size ?? null,
      quantity: d.quantity,
      delivery_type: d.delivery_type || 'delivery',
      notes: d.notes ?? null,
    }));

    const { data, error } = await supabase
      .from('show_deliveries')
      .insert(insertData)
      .select();

    if (error) {
      console.error('Error inserting deliveries:', error);
      return NextResponse.json({ error: 'Failed to create deliveries' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      deliveries: data,
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
    const deliveryId = searchParams.get('id');

    if (!deliveryId) {
      return NextResponse.json({ error: 'Delivery id is required' }, { status: 400 });
    }

    // Verify delivery belongs to this tour
    const { data: delivery, error: fetchError } = await supabase
      .from('show_deliveries')
      .select('id')
      .eq('id', deliveryId)
      .eq('tour_id', tourId)
      .single();

    if (fetchError || !delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('show_deliveries')
      .delete()
      .eq('id', deliveryId);

    if (error) {
      console.error('Error deleting delivery:', error);
      return NextResponse.json({ error: 'Failed to delete delivery' }, { status: 500 });
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
