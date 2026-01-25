import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { generateComprehensiveProjections } from '@/lib/ai/projection-agent';

export async function POST(request: NextRequest) {
  try {
    const { tourId, scenarioId, expectedAttendance, expectedPerHead, comparableTourId, buckets } = await request.json();

    const supabase = createServiceClient();

    // Fetch all context data
    const [tour, productSummary, showSummary, inventoryBalances, poOpenQuantities] = await Promise.all([
      supabase.from('tours').select('*').eq('id', tourId).single(),
      supabase.from('product_summary_view').select('*').eq('tour_id', tourId),
      supabase.from('show_summary_view').select('*').eq('tour_id', tourId),
      supabase.from('inventory_balances').select('*').eq('tour_id', tourId),
      supabase.from('po_open_qty_view').select('*').eq('tour_id', tourId)
    ]);

    // Check if tour has historical data
    const hasHistoricalData = (productSummary.data?.length || 0) > 0 && (showSummary.data?.length || 0) > 0;

    let historicalProductData = productSummary.data || [];
    let historicalShowData = showSummary.data || [];

    // If no historical data for this tour, use comparable tour if provided
    if (!hasHistoricalData && comparableTourId) {
      const [comparableProducts, comparableShows] = await Promise.all([
        supabase.from('product_summary_view').select('*').eq('tour_id', comparableTourId),
        supabase.from('show_summary_view').select('*').eq('tour_id', comparableTourId)
      ]);

      historicalProductData = comparableProducts.data || [];
      historicalShowData = comparableShows.data || [];

      console.log(`Using comparable tour ${comparableTourId} for historical data`);
    }

    // If still no data, return error asking user to provide comparable tour
    if (historicalProductData.length === 0) {
      return NextResponse.json({
        error: 'NO_HISTORICAL_DATA',
        message: 'This tour has no historical sales data. Please select a comparable tour to base projections on.',
        needsComparableTour: true
      }, { status: 400 });
    }

    // Generate comprehensive projections
    const projections = await generateComprehensiveProjections({
      tourId,
      tourName: tour.data?.name || 'Tour',
      productSummary: historicalProductData,
      showSummary: historicalShowData,
      inventoryBalances: inventoryBalances.data || [],
      poOpenQuantities: poOpenQuantities.data || [],
      expectedAttendance,
      expectedPerHead,
      buckets: buckets || ['TOUR', 'WEB'] // Pass dynamic buckets to AI
    });

    return NextResponse.json({ projections, usedComparableTour: !!comparableTourId });
  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
