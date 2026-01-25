import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/client';
import { analyzeProjectionData } from '@/lib/ai/projection-agent';

export async function POST(request: NextRequest) {
  try {
    const { tourId, expectedAttendance, expectedPerHead } = await request.json();

    const supabase = createServiceClient();

    // Check for cached insights (within 1 hour)
    const { data: cached } = await supabase
      .from('ai_projection_insights')
      .select('*')
      .eq('tour_id', tourId)
      .gt('expires_at', new Date().toISOString());

    if (cached && cached.length > 0) {
      // Return cached analysis
      const analysis = {
        sizeCurveRecommendations: cached.find(c => c.insight_type === 'size_curve')?.insight_data || [],
        productPerformance: cached.find(c => c.insight_type === 'product_performance')?.insight_data || {},
        stockoutRisks: cached.find(c => c.insight_type === 'stockout_risk')?.insight_data || []
      };

      return NextResponse.json({ analysis, cached: true });
    }

    // Fetch fresh data
    const [tour, productSummary, showSummary, inventoryBalances, poOpenQuantities] = await Promise.all([
      supabase.from('tours').select('*').eq('id', tourId).single(),
      supabase.from('product_summary_view').select('*').eq('tour_id', tourId),
      supabase.from('show_summary_view').select('*').eq('tour_id', tourId),
      supabase.from('inventory_balances').select('*').eq('tour_id', tourId),
      supabase.from('po_open_qty_view').select('*').eq('tour_id', tourId)
    ]);

    // Call AI analysis
    const analysis = await analyzeProjectionData({
      tourId,
      tourName: tour.data?.name || 'Tour',
      productSummary: productSummary.data || [],
      showSummary: showSummary.data || [],
      inventoryBalances: inventoryBalances.data || [],
      poOpenQuantities: poOpenQuantities.data || [],
      expectedAttendance,
      expectedPerHead
    });

    // Cache insights
    await supabase.from('ai_projection_insights').insert([
      {
        tour_id: tourId,
        insight_type: 'size_curve',
        insight_data: analysis.sizeCurveRecommendations
      },
      {
        tour_id: tourId,
        insight_type: 'product_performance',
        insight_data: analysis.productPerformance
      },
      {
        tour_id: tourId,
        insight_type: 'stockout_risk',
        insight_data: analysis.stockoutRisks
      }
    ]);

    return NextResponse.json({ analysis, cached: false });
  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}
