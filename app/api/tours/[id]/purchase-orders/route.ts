import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('purchase_orders')
      .select('id, po_number, vendor, order_date, expected_delivery, status, total_amount')
      .eq('tour_id', params.id)
      .order('order_date', { ascending: false });

    if (error) {
      console.error('Error fetching purchase orders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch purchase orders' },
        { status: 500 }
      );
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
