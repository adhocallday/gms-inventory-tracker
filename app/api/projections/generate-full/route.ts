import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { generateComprehensiveProjections } from '@/lib/ai/projection-agent';

export async function POST(request: NextRequest) {
  try {
    const { tourId, scenarioId, expectedAttendance, expectedPerHead } = await request.json();

    const supabase = createServiceClient();

    // Fetch all context data
    const [tour, productSummary, showSummary, inventoryBalances, poOpenQuantities] = await Promise.all([
      supabase.from('tours').select('*').eq('id', tourId).single(),
      supabase.from('product_summary_view').select('*').eq('tour_id', tourId),
      supabase.from('show_summary_view').select('*').eq('tour_id', tourId),
      supabase.from('inventory_balances').select('*').eq('tour_id', tourId),
      supabase.from('po_open_qty_view').select('*').eq('tour_id', tourId)
    ]);

    // Generate comprehensive projections
    const projections = await generateComprehensiveProjections({
      tourId,
      tourName: tour.data?.name || 'Tour',
      productSummary: productSummary.data || [],
      showSummary: showSummary.data || [],
      inventoryBalances: inventoryBalances.data || [],
      poOpenQuantities: poOpenQuantities.data || [],
      expectedAttendance,
      expectedPerHead
    });

    return NextResponse.json({ projections });
  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
