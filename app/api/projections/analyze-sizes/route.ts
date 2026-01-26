import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { analyzeSizeDistribution } from '@/lib/ai/projection-agent';

export async function POST(request: NextRequest) {
  try {
    const { tourId, scenarioId } = await request.json();

    if (!tourId) {
      return NextResponse.json({ error: 'tourId is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch data needed for analysis
    const [tour, productSummary, showSummary, inventoryBalances, poOpenQuantities] = await Promise.all([
      supabase.from('tours').select('*').eq('id', tourId).single(),
      supabase.from('product_summary_view').select('*').eq('tour_id', tourId),
      supabase.from('show_summary_view').select('*').eq('tour_id', tourId),
      supabase.from('inventory_balances').select('*').eq('tour_id', tourId),
      supabase.from('po_open_qty_view').select('*').eq('tour_id', tourId)
    ]);

    if (!tour.data) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }

    // Calculate expected values from show summary
    const totalAttendance = (showSummary.data || []).reduce(
      (sum: number, row: any) => sum + (row.attendance || 0),
      0
    );
    const totalGross = (showSummary.data || []).reduce(
      (sum: number, row: any) => sum + (row.total_gross || 0),
      0
    );
    const expectedPerHead = totalAttendance ? totalGross / totalAttendance : 0;

    // Build product names mapping from product_summary_view
    const productNames: Record<string, string> = {};
    (productSummary.data || []).forEach((row: any) => {
      if (row.sku && row.description && !productNames[row.sku]) {
        productNames[row.sku] = row.description;
      }
    });

    // Call AI analysis
    const analysis = await analyzeSizeDistribution({
      tourId,
      tourName: tour.data?.name || 'Tour',
      productSummary: productSummary.data || [],
      showSummary: showSummary.data || [],
      inventoryBalances: inventoryBalances.data || [],
      poOpenQuantities: poOpenQuantities.data || [],
      expectedAttendance: totalAttendance,
      expectedPerHead
    });

    return NextResponse.json({
      success: true,
      productNames, // Include product names mapping
      ...analysis
    });
  } catch (error: any) {
    console.error('Size analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Size analysis failed' },
      { status: 500 }
    );
  }
}
